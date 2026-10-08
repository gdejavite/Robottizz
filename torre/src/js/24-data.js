/* =====================================================================
   DADOS DA EMPRESA: importar/exportar o arquivo de dados privados e
   sincronizar as metas com o Supabase (via conector MCP da página).
   Formato do arquivo: { "<andar>": { facts, vars:{}, met:{chave:{v,h}}, insights:[], supa:{project,q:{}}, auto } }
   ===================================================================== */
function applyDataObj(obj){
  var done=[];
  if(obj&&obj._notify&&typeof obj._notify==='object'){mergeCfg({notify:obj._notify});done.push('avisos (n8n)')}
  Object.keys(obj||{}).forEach(function(fid){
    var Fl=FLOORS[fid],x=obj[fid];if(!Fl||!x||typeof x!=='object')return;
    var part={};part[fid]=x;mergeCfg({data:part});
    inFloor(Fl,function(){
      var nm=0,ni=0;
      if(x.met&&typeof x.met==='object')Object.keys(x.met).forEach(function(k){
        var m=F.MET[k],y=x.met[k];if(!m||!y)return;
        var h=Array.isArray(y.h)?y.h.map(Number).filter(isFinite).slice(-24):[];
        var v=typeof y.v==='number'?y.v:(h.length?h[h.length-1]:null);if(v==null)return;
        m.v=v;m.h=h.length?h:[v];m.syncedAt=Date.now();nm++;
      });
      if(Array.isArray(x.insights))x.insights.slice(0,30).forEach(function(i){if(i&&typeof i.text==='string'){addMem({kind:KINDS[i.kind]?i.kind:'insight',scope:'time',author:F.AG[i.author]?i.author:'time',w:i.w||4,src:'real',ik:i.ik||undefined,text:i.text,tags:Array.isArray(i.tags)?i.tags:[]});ni++}});
      saveMem();
      log('Dados reais importados: '+nm+' meta(s) e '+ni+' insight(s).','k-ok');
    });
    done.push(Fl.FMETA.nome);
  });
  saveCfg();
  return done;
}
function importDataFile(file){
  var rd=new FileReader();
  rd.onload=function(){
    try{
      var obj=JSON.parse(rd.result);if(obj&&obj.floors)obj=obj.floors;
      var done=applyDataObj(obj);
      setMsg('dataMsg',done.length?'Importado: '+done.join(', ')+'.':'Nenhum andar reconhecido no arquivo.');
      FLOORIDS.forEach(refreshAfterData);if(obj&&obj._notify)renderSettings();
    }catch(e){setMsg('dataMsg','Arquivo inválido: '+String(e.message||e).slice(0,120))}
  };
  rd.readAsText(file);
}
function exportData(){
  var out={};
  FLOORIDS.forEach(function(id){
    var Fl=FLOORS[id],d=companyData(id),met={};
    Object.keys(Fl.MET).forEach(function(k){var m=Fl.MET[k];if(m.v!=null)met[k]={v:m.v,h:m.h}});
    out[id]={facts:d.facts,vars:d.vars,met:met,supa:d.supa,auto:d.auto};
  });
  var txt=JSON.stringify(out,null,2);
  try{
    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'application/json'}));a.download='torre-dados-privados.json';
    document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000);
  }catch(e){}
  $('#reportBody').innerHTML='<h2>Dados privados (copie e guarde em local seguro)</h2><textarea readonly rows="18" style="width:100%">'+esc(txt)+'</textarea>';
  openDlg($('#reportDlg'));
}
function refreshAfterData(fid){
  if(!fid)return;
  if(FLOORS[fid]===VIEW){_put={};renderMetas();renderConns();renderApprovals();if($('#v-ops').classList.contains('on'))renderOps()}
  if(onTop)renderTop();
  var db=$('#dataBox');if(db)db.outerHTML=dataBox();
}
/* extrai as linhas do retorno do execute_sql (o texto vem com o JSON dentro) */
function parseRows(res){
  var t='';
  if(typeof res==='string')t=res;
  else if(res&&Array.isArray(res.content))t=res.content.map(function(c){return c&&c.text||''}).join('\n');
  else if(res&&Array.isArray(res.rows))return res.rows;
  else{try{t=JSON.stringify(res)}catch(e){}}
  var i=t.indexOf('[{');if(i<0){if(/\[\s*\]/.test(t))return [];return null}
  var depth=0,j=i,inS=false,esc_=false;
  for(;j<t.length;j++){var ch=t[j];
    if(inS){if(esc_)esc_=false;else if(ch==='\\')esc_=true;else if(ch==='"')inS=false;continue}
    if(ch==='"')inS=true;else if(ch==='[')depth++;else if(ch===']'){depth--;if(!depth)break}}
  try{return JSON.parse(t.slice(i,j+1))}catch(e){return null}
}
var SUPA_EVERY=6*3600e3,supaTimer=null;
async function syncSupabase(Fl){
  var d=companyData(Fl.id),keys=Object.keys(d.supa.q||{}).filter(function(k){return Fl.MET[k]&&d.supa.q[k]});
  if(!CAP.mcp)return 'Conectores indisponíveis nesta página.';
  if(!d.supa.project)return 'Preencha o ID do projeto Supabase.';
  if(!keys.length)return 'Nenhuma consulta configurada.';
  await ensurePerm('Supabase');
  var ok=[],bad=[];
  for(var i=0;i<keys.length;i++){
    var k=keys[i];
    try{
      var res=await CAP.mcp.callTool('Supabase','execute_sql',{project_id:d.supa.project,query:d.supa.q[k]});
      var rows=parseRows(res);
      var vals=(rows||[]).map(function(r){return Number(r.valor!=null?r.valor:r.value)}).filter(isFinite);
      if(!vals.length){bad.push(k+' (sem coluna "valor")');continue}
      var m=Fl.MET[k];m.v=vals[vals.length-1];m.h=vals.slice(-24);m.syncedAt=Date.now();ok.push(k);
    }catch(e){bad.push(k+' ('+mcpErr(e)+')')}
  }
  inFloor(Fl,function(){
    if(ok.length){saveMem();runDueChecks();log('Metas sincronizadas com o Supabase: '+ok.length+' de '+keys.length+'.','k-ok')}
    if(bad.length)log('Falha ao sincronizar: '+bad.join('; ')+'.','k-red');
  });
  refreshAfterData(Fl.id);
  return (ok.length?'Sincronizadas: '+ok.join(', ')+'. ':'')+(bad.length?'Falharam: '+bad.join('; ')+'.':'');
}
function autoSyncAll(){
  var run=function(){FLOORIDS.forEach(function(id){var d=companyData(id);if(d.auto&&d.supa.project)syncSupabase(FLOORS[id])})};
  run();clearInterval(supaTimer);supaTimer=setInterval(run,SUPA_EVERY);
}
