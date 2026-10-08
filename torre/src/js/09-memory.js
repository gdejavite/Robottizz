/* =====================================================================
   MEMÓRIA DO TIME, METAS (simuladas) E APRENDIZADO
   ===================================================================== */
var memSaveTs={},memFilter={kind:'all',scope:'all',q:''},memEdit=null;
function fmtMet(k,v){
  if(v==null||isNaN(v))return '—';
  var f=(F.MET[k]&&F.MET[k].f)||'int';
  if(f==='brl')return 'R$ '+v.toFixed(2).replace('.',',');
  if(f==='pct1')return v.toFixed(1).replace('.',',')+'%';
  if(f==='pct0')return Math.round(v)+'%';
  if(f==='brl0')return 'R$ '+Math.round(v).toLocaleString('pt-BR');
  if(f==='meses')return v.toFixed(1).replace('.',',')+' m';
  if(f==='min')return Math.round(v)+' min';
  return String(Math.round(v));
}
function nameOf(id){return id==='gab'?'Gabriel':id==='time'?'Time':(F.AG[id]?F.AG[id].name:id)}
function tagsOf(k,title){
  var t=(F.AGTAGS[k]||[]).slice();
  F.KW.forEach(function(x){if(x[0].test(title||''))t.push(x[1])});
  return t.filter(function(x,i,a){return a.indexOf(x)===i});
}
function ago(ts){
  var s=Math.max(1,Math.round((Date.now()-ts)/1000));
  if(s<60)return 'há '+s+' s';if(s<3600)return 'há '+Math.round(s/60)+' min';if(s<86400)return 'há '+Math.round(s/3600)+' h';return 'há '+Math.round(s/86400)+' d';
}
function normTxt(s){return String(s).toLowerCase().replace(/[^a-z0-9à-ú ]/g,'').replace(/\s+/g,' ').trim().slice(0,100)}
function memScore(m){return m.w+Math.min(3,m.n-1)+m.uses*.3+(m.pin?4:0)+(m.kind==='regra'?4:0)+((Date.now()-m.t)<600000?1:0)}
function pruneMem(){
  if(F.MEM.length<=150)return;
  var c=F.MEM.filter(function(m){return !m.pin&&m.kind!=='regra'}).sort(function(a,b){return memScore(a)-memScore(b)});
  var rm=c.slice(0,F.MEM.length-150);F.MEM=F.MEM.filter(function(m){return rm.indexOf(m)<0});
}
function addMem(o){
  var e={id:F.mid++,t:Date.now(),kind:KINDS[o.kind]?o.kind:'insight',scope:o.scope||'time',author:o.author||'time',text:String(o.text||'').trim().slice(0,400),
    tags:(o.tags||[]).filter(function(x,i,a){return a.indexOf(x)===i}).slice(0,10),w:o.w||2,n:1,uses:0,pin:!!o.pin,src:o.src||'auto'};
  if(o.rk)e.rk=o.rk;if(o.tk)e.tk=o.tk;if(o.metric)e.metric=o.metric;if(o.ik)e.ik=o.ik;
  if(!e.text)return null;
  if(e.ik){var d0=F.MEM.filter(function(m){return m.ik===e.ik&&m.kind===e.kind&&m.scope===e.scope})[0];if(d0){d0.n++;d0.w=Math.min(5,d0.w+1);d0.t=e.t;d0.text=e.text;saveMem();renderMemUI();return d0}}
  var key=e.kind+'|'+e.scope+'|'+normTxt(e.text);
  var dup=F.MEM.filter(function(m){return m.kind+'|'+m.scope+'|'+normTxt(m.text)===key})[0];
  if(dup){dup.n++;dup.w=Math.min(5,dup.w+1);dup.t=e.t;if(o.rk&&!dup.rk)dup.rk=o.rk;saveMem();renderMemUI();return dup}
  F.MEM.push(e);pruneMem();saveMem();renderMemUI();return e;
}
function recall(agentId,tags,limit){
  var set={};(tags||[]).forEach(function(x){set[x]=1});
  var cand=F.MEM.filter(function(m){return m.scope==='time'||m.scope===agentId}).map(function(m){
    var ov=m.tags.filter(function(x){return set[x]}).length;
    return {m:m,ov:ov,s:ov*3+memScore(m)};
  }).filter(function(x){return x.ov>0||x.m.kind==='regra'});
  cand.sort(function(a,b){return b.s-a.s});
  var out=[],regras=0;
  cand.forEach(function(x){
    if(out.length>=(limit||6))return;
    if(x.m.kind==='regra'){if(regras>=3)return;regras++}
    out.push(x.m);
  });
  out.forEach(function(m){m.uses++});
  return out;
}
function memText(list){
  return list.map(function(m){return '['+KINDS[m.kind].l.toUpperCase()+'] '+m.text+' (de '+nameOf(m.author)+', '+ago(m.t)+(m.n>1?', repetido '+m.n+'x':'')+')'}).join('\n')||'(memória ainda vazia)';
}
function metSnapshot(){return Object.keys(F.MET).map(function(k){return F.MET[k].n+': '+fmtMet(k,F.MET[k].v)+' (meta '+fmtMet(k,F.MET[k].m)+')'}).join('; ')}
function memPayload(){return {mem:F.MEM,met:F.MET,stats:F.STATS,xp:F.XP,checks:F.checks,journal:F.journal.slice(-400),upd:Date.now(),seeded:true}}
/* grava neste aparelho na hora; na conta, no máximo a cada 20 s (e na hora ao sair da aba) */
var MEM_CLOUD_EVERY=20000,memCloudAt={};
function saveMem(){
  lsSet(F.FMETA.lsKey,JSON.stringify(memPayload()));
  var Fl=F,fid=Fl.id,wait=Math.max(900,MEM_CLOUD_EVERY-(Date.now()-(memCloudAt[fid]||0)));
  clearTimeout(memSaveTs[fid]);
  memSaveTs[fid]=setTimeout(function(){memCloudWrite(Fl)},wait);
}
function memCloudWrite(Fl){
  var dm=CAP.docMs[Fl.id];memCloudAt[Fl.id]=Date.now();clearTimeout(memSaveTs[Fl.id]);
  if(dm){try{dm.set(clone(inFloor(Fl,memPayload))).catch(function(){})}catch(e){}}
}
function flushSaves(){FLOORIDS.forEach(function(id){if(memSaveTs[id]){memCloudWrite(FLOORS[id]);inFloor(FLOORS[id],function(){lsSet(F.FMETA.lsKey,JSON.stringify(memPayload()))})}})}
function loadMemData(d){
  if(!d||typeof d!=='object')return false;
  if(Array.isArray(d.mem)){
    F.MEM=d.mem.filter(function(m){return m&&typeof m.text==='string'&&KINDS[m.kind]}).map(function(m){
      m.tags=Array.isArray(m.tags)?m.tags:[];m.w=m.w||2;m.n=m.n||1;m.uses=m.uses||0;m.scope=m.scope||'time';m.author=m.author||'time';m.id=m.id||F.mid++;return m});
    F.mid=F.MEM.reduce(function(a,m){return Math.max(a,(m.id||0)+1)},1);
  }
  if(d.met)Object.keys(F.MET).forEach(function(k){var x=d.met[k];if(x&&typeof x.v==='number'&&Array.isArray(x.h)){F.MET[k].v=x.v;F.MET[k].h=x.h.slice(-24);if(typeof x.syncedAt==='number')F.MET[k].syncedAt=x.syncedAt}});
  if(d.stats&&typeof d.stats==='object'){
    ['applied','avoided','ok','fail','retro'].forEach(function(k){if(typeof d.stats[k]==='number')F.STATS[k]=d.stats[k]});
    if(Array.isArray(d.stats.rejHist))F.STATS.rejHist=d.stats.rejHist.slice(-60);
  }
  if(d.xp&&typeof d.xp==='object')Object.keys(d.xp).forEach(function(k){var x=d.xp[k];if(x&&typeof x.xp==='number')F.XP[k]={xp:x.xp,m:x.m&&typeof x.m==='object'?x.m:{}}});
  if(Array.isArray(d.checks))F.checks=d.checks.filter(function(c){return c&&c.metric&&typeof c.due==='number'}).slice(-40);
  if(Array.isArray(d.journal)){
    var seen={};F.journal.forEach(function(e){seen[e.ts+'|'+e.x]=1});
    d.journal.forEach(function(e){if(e&&typeof e.x==='string'&&typeof e.ts==='number'&&!seen[e.ts+'|'+e.x])F.journal.push(e)});
    F.journal.sort(function(a,b){return a.ts-b.ts});if(F.journal.length>400)F.journal.splice(0,F.journal.length-400);
  }
  return true;
}
/* o diário é salvo junto com a memória, mas sem gravar a cada linha */
var journalT={};
function journalSave(){var Fl=F;clearTimeout(journalT[Fl.id]);journalT[Fl.id]=setTimeout(function(){inFloor(Fl,saveMem)},3000)}
function seedFloor(){if(F.def.seed)F.def.seed();ensureRules()}
/* métricas simuladas */
function applyMet(k,delta){
  var m=F.MET[k];if(!m)return;
  var v=m.v+delta;
  v=m.dir>0?Math.min(v,m.m*1.1):Math.max(v,m.m*.9);if(m.max!=null)v=Math.min(v,m.max);v=Math.max(v,m.dir<0?m.m*.5:0);
  m.v=Math.round(v*100)/100;
  m.h.push(m.v);if(m.h.length>24)m.h.shift();
}
function metricEffect(agentId,ok){
  if(F.FMETA.realMet)return;
  (F.METFX[agentId]||[]).forEach(function(x){var d=ok?x[1]:x[2];if(Array.isArray(d))d=rnd(d[0],d[1]);if(d&&F.MET[x[0]])applyMet(x[0],d)});
}
function fill(s){
  return s.replace('{n}',Math.round(rnd(8,26))).replace('{c}',(rnd(7.2,9.8)).toFixed(2).replace('.',',')).replace('{e}',pick(['Orion','Vega','Alpha','Sirius'])).replace('{d}',(rnd(3.5,8.5)).toFixed(1).replace('.',',')).replace('{p}',Math.round(rnd(18,34)));
}
function scheduleOutcome(a,t){
  if(F.FMETA.realMet){scheduleRealCheck(a,t);return}
  var tpl=F.OUT[a.id];if(!tpl)return;
  var applied=t.applied||0,repeat=t.usedRepeat?1:0;
  later(function(){
    var pS=Math.min(.9,.45+.08*Math.min(4,applied)+(repeat?.07:0));
    var ok=Math.random()<pS;
    var raw=pick(ok?tpl.ok:tpl.fail),txt=fill(raw);
    F.STATS[ok?'ok':'fail']++;
    metricEffect(a.id,ok);
    addMem({kind:ok?'repetir':'evitar',scope:'time',author:a.id,text:txt,tags:F.OUTTAGS[a.id]||[],tk:t.tpl&&t.tpl.t,w:3,ik:raw});
    log('C · Verificação ('+(ok?'meta atingida':'abaixo da meta')+') de "'+t.title+'": '+txt+' (simulado)',ok?'k-ok':'k-red');
    log('A · Agir: '+(ok?'padrão registrado na memória do time.':'ajuste necessário e lição registrada.'),ok?'k-ok':'k-red');
    saveMem();renderMetas();
  },rnd(9000,14000));
}
/* ---------- verificação real (C do PDCA): compara a métrica 7 dias depois, com dado sincronizado ---------- */
var CHECK_DAYS=7;
function scheduleRealCheck(a,t){
  var fx=(F.METFX[a.id]||[])[0],mk=fx&&F.MET[fx[0]]?fx[0]:F.FMETA.hud[0],m=F.MET[mk];
  if(!m){log('C · Sem métrica ligada a '+a.name+': verificação manual.','k-meet');return}
  var c={id:Date.now().toString(36),title:t.title,agent:a.id,metric:mk,base:m.v,dir:m.dir,start:Date.now(),due:Date.now()+CHECK_DAYS*864e5,warned:false};
  F.checks.push(c);if(F.checks.length>40)F.checks.shift();
  log('C · Verificação agendada: medir "'+m.n+'" depois de "'+t.title+'" em '+CHECK_DAYS+' dias (hoje: '+fmtMet(mk,m.v)+').','k-meet');
  saveMem();
}
function runDueChecks(){
  var nowTs=Date.now(),changed=false;
  F.checks=F.checks.filter(function(c){
    if(nowTs<c.due)return true;
    var m=F.MET[c.metric];if(!m)return false;
    if(!m.syncedAt||m.syncedAt<c.due){
      if(!c.warned){c.warned=true;changed=true;log('C · A verificação de "'+c.title+'" venceu, mas falta sincronizar "'+m.n+'" (Agentes → Dados da empresa).','k-red')}
      return true;
    }
    var d=m.v-c.base,ok=c.dir>0?d>0:d<0,a=F.AG[c.agent];
    F.STATS[ok?'ok':'fail']++;changed=true;
    var txt='"'+c.title+'": '+m.n+' foi de '+fmtMet(c.metric,c.base)+' para '+fmtMet(c.metric,m.v)+' em '+CHECK_DAYS+' dias (dado real).';
    addMem({kind:ok?'repetir':'evitar',scope:'time',author:c.agent,w:4,text:(ok?'Funcionou: ':'Não moveu a meta: ')+txt,tags:tagsOf(c.agent,c.title)});
    log('C · Verificação real · '+txt,ok?'k-ok':'k-red');
    log('A · Agir: '+(ok?'padronizar o que deu certo.':'ajustar a abordagem; lição registrada.'),ok?'k-ok':'k-red');
    if(a)addXP(a.id,ok?20:0);
    return false;
  });
  if(changed){saveMem();renderMetas()}
}
function maybeInsight(a){
  if(F.FMETA.realMet)return;
  var pool=F.INS[a.id];if(!pool||Math.random()>.28)return;
  var x=pick(pool);
  addMem({kind:'insight',scope:'time',author:a.id,text:fill(x.x),tags:x.t,w:3,ik:x.x});
  log(a.name+' registrou um insight na memória do time.','k-meet');
}
function blocked(k,tpltk){
  var l=F.MEM.filter(function(m){return m.tk===tpltk&&m.author===k&&(m.kind==='evitar'||m.kind==='repetir')}).sort(function(x,y){return y.t-x.t})[0];
  return !!l&&l.kind==='evitar';
}
function spawnTask(k){
  var a=F.AG[k],tp=pick(F.TPL[k]),title=tp.t;
  if(blocked(k,tp.t)){
    var alt=F.TPL[k].filter(function(x){return !blocked(k,x.t)});
    F.STATS.avoided++;
    if(alt.length&&Math.random()<.7){log(a.name+' consultou a memória e evitou repetir "'+title+'", que não deu certo.','k-meet');tp=pick(alt);title=tp.t}
    else{title=tp.t+' · nova abordagem';log(a.name+' tenta "'+tp.t+'" com outra abordagem, porque a anterior não deu certo.','k-meet')}
  }
  newTask(k,tp,title===tp.t?null:title);
  var t=F.tasks[F.tasks.length-1];t.tags=tagsOf(k,title);
  log(F.AG[F.RECID].name+' recebeu um pedido e encaminhou para '+a.name+': '+title+'.');
}
function consult(a,t){
  t.tags=t.tags||tagsOf(a.id,t.title);
  t.mem=recall(a.id,t.tags,6);
  t.applied=t.mem.filter(function(m){return m.kind!=='regra'}).length;
  t.usedRepeat=t.mem.some(function(m){return m.kind==='repetir'});
  if(t.applied>0){
    F.STATS.applied+=1;
    var from={};t.mem.forEach(function(m){if(m.author!==a.id&&m.author!=='gab')from[nameOf(m.author)]=1});
    var fr=Object.keys(from);
    log(a.name+' consultou a memória do time: '+t.applied+' lição(ões)'+(fr.length?', incluindo de '+fr.join(' e '):'')+'.','k-meet');
    saveMem();
  }
}
/* retrospectiva */
function retro(){
  if(F.meetingOn){log('Espere a reunião atual terminar para a retrospectiva.');return}
  var ids=F.ORDER.filter(function(k){return k!==F.RECID});
  var before=taxaDev();
  runMeeting(ids,'Retrospectiva semanal','o time revisou o que funcionou e o que não funcionou e atualizou a memória.');
  later(function(){
    var priv=F.MEM.filter(function(m){return m.scope!=='time'&&m.kind==='repetir'&&m.uses>=1});
    priv.forEach(function(m){m.scope='time'});
    var top=F.MEM.filter(function(m){return m.kind==='evitar'}).sort(function(a,b){return b.n-a.n}).slice(0,2);
    var best=F.MEM.filter(function(m){return m.kind==='repetir'&&m.scope==='time'}).sort(function(a,b){return b.n+b.uses-a.n-a.uses}).slice(0,1);
    var resumo=[];
    top.forEach(function(m){resumo.push('Evitar: '+m.text)});best.forEach(function(m){resumo.push('Repetir: '+m.text)});
    if(resumo.length)addMem({kind:'decisao',scope:'time',author:'time',w:4,text:'Retrospectiva: '+resumo.join(' | ').slice(0,360),tags:['compliance','conteudo','campanha','leads','prova']});
    F.STATS.retro++;
    log('Retrospectiva concluída: '+priv.length+' nota(s) privada(s) viraram lição do time. Taxa de devolução: '+before+'.','k-meet');
    if(CFG.real&&CAP.sample){
      var p='Você facilita a retrospectiva semanal de um time de agentes de IA da '+F.FMETA.empresa+'. Metas (simuladas): '+metSnapshot()+'\n\nMEMÓRIA ATUAL:\n'+memText(F.MEM.slice().sort(function(a,b){return memScore(b)-memScore(a)}).slice(0,40))+
        '\n\nConsolide em até 4 lições novas, curtas e acionáveis, que ajudem o time a crescer e a não repetir erros. Não repita o que já está na memória. Responda SOMENTE com JSON: {"licoes":[{"kind":"evitar|repetir|insight|decisao","text":"...","tags":["conteudo","leads"]}]}';
      aiJson('time','retro',p,{cache:false},0).then(bindF(function(r){
        (r&&r.licoes||[]).slice(0,4).forEach(function(x){if(x&&x.text)addMem({kind:KINDS[x.kind]?x.kind:'insight',scope:'time',author:'time',text:String(x.text).slice(0,300),tags:Array.isArray(x.tags)?x.tags.slice(0,6):['conteudo'],w:3})});
        log('Retrospectiva com IA adicionou lições à memória.','k-meet');
      })).catch(bindF(function(e){log('A IA não conseguiu consolidar a retrospectiva ('+errCopy(e)+').','k-red')}));
    }
    renderMemUI();renderMetas();
  },10600);
}
function taxaDev(){
  var h=F.STATS.rejHist;if(h.length<4)return 'sem dados ainda';
  var avg=function(a){return Math.round(a.reduce(function(s,x){return s+x},0)/a.length*100)};
  var n=Math.min(10,Math.floor(h.length/2));
  return avg(h.slice(0,n))+'% no início, '+avg(h.slice(-n))+'% agora';
}
/* ---------- telas: metas e memória ---------- */
function spark(h,good){
  if(!h||h.length<2)return '';
  var w=120,hh=34,mn=Math.min.apply(null,h),mx=Math.max.apply(null,h),r=(mx-mn)||1;
  var pts=h.map(function(v,i){return (i*(w-4)/(h.length-1)+2).toFixed(1)+','+(hh-4-((v-mn)/r)*(hh-8)).toFixed(1)}).join(' ');
  return '<svg viewBox="0 0 '+w+' '+hh+'" width="'+w+'" height="'+hh+'" aria-hidden="true"><polyline fill="none" stroke="'+(good?'#6fd3a0':'#f4b860')+'" stroke-width="2" stroke-linejoin="round" points="'+pts+'"/></svg>';
}
function renderMetas(){
  if(inBg)return;
  var hg=$('#hudGoals');
  if(hg)hg.textContent=F.FMETA.hud.map(function(k){var m=F.MET[k];return m?m.s+' '+fmtMet(k,m.v)+(m.dir>0?'/'+fmtMet(k,m.m):''):''}).join(' · ');
  var box=$('#metas');if(!box||!$('#v-ops').classList.contains('on'))return;
  box.innerHTML=Object.keys(F.MET).map(function(k){
    var m=F.MET[k];
    if(m.v==null)return '<div class="kpi meta"><span>'+esc(m.n)+'</span><strong>—</strong><small>Sem dado ainda. Importe ou sincronize em Agentes → Dados da empresa.</small></div>';
    var pct=metPct(m),first=m.h.length?m.h[0]:m.v,better=m.dir>0?m.v>=first:m.v<=first;
    var d=m.v-first,ds=(d>=0?'+':'−')+fmtMet(k,Math.abs(d));
    return '<div class="kpi meta"><span>'+esc(m.n)+'</span><strong>'+fmtMet(k,m.v)+'</strong>'+
      '<div class="bar"><u style="width:'+pct+'%"></u></div><small>Meta '+fmtMet(k,m.m)+' · '+pct+'% · '+ds+' no período'+(m.syncedAt?' · sincronizado '+ago(m.syncedAt):'')+'</small>'+spark(m.h,better)+'</div>';
  }).join('');
  var n=F.MEM.filter(function(m){return m.scope==='time'}).length;
  $('#learn').innerHTML=[[n,'Lições na memória do time'],[F.STATS.applied,'Tarefas que usaram a memória'],[F.STATS.avoided,'Repetições de erro evitadas'],[F.STATS.ok+'/'+F.STATS.fail,'Resultados bons / fracos'],[taxaDev(),'Devolução pela revisão']].map(function(p){
    return '<div class="kpi"><strong style="font-size:'+(String(p[0]).length>12?'15px':'26px')+'">'+p[0]+'</strong><span>'+p[1]+'</span></div>'}).join('');
}
/* progresso de uma meta em % (direção: maior é melhor ou menor é melhor) */
function metPct(m){if(m.v==null||!m.m)return 0;return Math.max(0,Math.min(100,Math.round((m.dir>0?m.v/m.m:m.m/Math.max(m.v,1e-9))*100)))}
function scopeLabel(s){return s==='time'?'Time inteiro':'Privada de '+nameOf(s)}
function renderMemUI(){
  if(inBg)return;
  if(!$('#v-mem').classList.contains('on'))return;
  var f=memFilter,q=(f.q||'').toLowerCase();
  var list=F.MEM.filter(function(m){
    return (f.kind==='all'||m.kind===f.kind)&&(f.scope==='all'||m.scope===f.scope)&&(!q||(m.text+' '+m.tags.join(' ')+' '+nameOf(m.author)).toLowerCase().indexOf(q)>=0);
  }).sort(function(a,b){return (b.pin?1:0)-(a.pin?1:0)||b.t-a.t});
  var tm=F.MEM.filter(function(m){return m.scope==='time'}).length;
  $('#memStats').innerHTML=[[tm,'Lições do time'],[F.MEM.length-tm,'Notas privadas'],[F.STATS.applied,'Tarefas com memória'],[F.STATS.avoided,'Erros evitados'],[F.STATS.retro,'Retrospectivas']].map(function(p){
    return '<div class="kpi"><strong>'+p[0]+'</strong><span>'+p[1]+'</span></div>'}).join('');
  $('#memList').innerHTML=list.length?list.map(function(m){
    var k=KINDS[m.kind],ed=memEdit===m.id;
    return '<div class="mem" data-id="'+m.id+'" style="--c:'+k.c+'"><div class="mh"><span class="chip" style="--c:'+k.c+'">'+k.l+'</span>'+
      '<span class="chip sc">'+esc(scopeLabel(m.scope))+'</span>'+(m.pin?'<span class="chip pn">fixada</span>':'')+'</div>'+
      (ed?'<textarea rows="3" maxlength="400">'+esc(m.text)+'</textarea>':'<p>'+esc(m.text)+'</p>')+
      '<div class="mm">de '+esc(nameOf(m.author))+' · '+ago(m.t)+' · usada '+m.uses+'x'+(m.n>1?' · repetida '+m.n+'x':'')+(m.tags.length?' · '+esc(m.tags.slice(0,5).join(', ')):'')+'</div>'+
      '<div class="acts" style="margin-top:8px">'+(ed?'<button class="btn sm" data-a="saveedit">Salvar</button><button class="btn ghost sm" data-a="canceledit">Cancelar</button>':
      '<button class="btn ghost sm" data-a="pin">'+(m.pin?'Desafixar':'Fixar')+'</button>'+(m.scope!=='time'?'<button class="btn ghost sm" data-a="share">Compartilhar com o time</button>':'')+
      '<button class="btn ghost sm" data-a="edit">Editar</button><button class="btn no sm" data-a="del">Excluir</button>')+'</div></div>';
  }).join(''):'<p class="empty">Nada encontrado com esse filtro.</p>';
}
$('#memList').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  var card=b.closest('.mem'),id=+card.dataset.id,m=F.MEM.filter(function(x){return x.id===id})[0],act=b.dataset.a;if(!m)return;
  if(act==='pin'){m.pin=!m.pin}
  else if(act==='share'){m.scope='time';log('Você compartilhou uma nota de '+nameOf(m.author)+' com o time.','k-meet')}
  else if(act==='edit'){memEdit=id;renderMemUI();return}
  else if(act==='canceledit'){memEdit=null;renderMemUI();return}
  else if(act==='saveedit'){var v=card.querySelector('textarea').value.trim();if(v){m.text=v.slice(0,400);m.src='manual'}memEdit=null}
  else if(act==='del'){
    if(!b.dataset.armed){b.dataset.armed='1';b.textContent='Confirmar exclusão';setTimeout(function(){if(b.isConnected){delete b.dataset.armed;b.textContent='Excluir'}},3500);return}
    F.MEM=F.MEM.filter(function(x){return x.id!==id});
  }
  saveMem();renderMemUI();
});
$('#mAdd').addEventListener('click',function(){
  var txt=$('#mText').value.trim();if(!txt){$('#mText').focus();return}
  var tags=$('#mTags').value.split(',').map(function(x){return normTxt(x).replace(/ /g,'')}).filter(Boolean);
  var sc=$('#mScope').value;
  if(!tags.length)tags=sc==='time'?['conteudo','leads','campanha','ranking','prova','proposta']:tagsOf(sc,txt);
  addMem({kind:$('#mKind').value,scope:sc,author:'gab',text:txt,tags:tags,w:4,pin:$('#mPin').checked,src:'manual'});
  $('#mText').value='';$('#mTags').value='';$('#mPin').checked=false;
  log('Você ensinou algo ao '+(sc==='time'?'time':nameOf(sc))+': '+txt.slice(0,80)+'.','k-meet');
});
['fKind','fScope'].forEach(function(id){$('#'+id).addEventListener('change',function(){memFilter[id==='fKind'?'kind':'scope']=this.value;renderMemUI()})});
$('#fQ').addEventListener('input',function(){memFilter.q=this.value;renderMemUI()});
$('#btnRetro').addEventListener('click',retro);
$('#btnMemClear').addEventListener('click',function(){
  var b=this;
  if(!b.dataset.armed){b.dataset.armed='1';b.textContent='Confirmar: apagar tudo';setTimeout(function(){if(b.isConnected){delete b.dataset.armed;b.textContent='Limpar memória'}},3500);return}
  delete b.dataset.armed;b.textContent='Limpar memória';
  F.MEM=[];F.checks=[];F.STATS={applied:0,avoided:0,rejHist:[],ok:0,fail:0,retro:0};
  /* metas com dado real não voltam ao valor do código: só as simuladas são reiniciadas */
  if(!F.FMETA.realMet)Object.keys(F.MET).forEach(function(k){F.MET[k]=clone(F.MET0[k])});
  seedFloor();saveMem();log('Memória do time reiniciada (regras básicas recolocadas).','k-red');renderMemUI();renderMetas();
});
function initMemUI(){
  $('#mKind').innerHTML=['regra','preferencia','evitar','repetir','insight'].map(function(k){return '<option value="'+k+'">'+KINDS[k].l+'</option>'}).join('');
  var sc='<option value="time">Time inteiro</option>'+F.ORDER.map(function(k){return '<option value="'+k+'">Privada de '+F.AG[k].name+'</option>'}).join('');
  $('#mScope').innerHTML=sc;
  $('#fScope').innerHTML='<option value="all">Todas as memórias</option>'+sc;
  $('#fKind').innerHTML='<option value="all">Todos os tipos</option>'+Object.keys(KINDS).map(function(k){return '<option value="'+k+'">'+KINDS[k].l+'</option>'}).join('');
}


