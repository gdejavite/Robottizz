/* =====================================================================
   CONSUMO DE IA: medição de chamadas, tokens estimados e custo projetado
   ===================================================================== */
var USO={days:{},log:[],ready:false},USO_T=null;
var PRICE_DEF={inp:2,out:10,cin:.2,fx:5.5,cpt:3.5,safe:1.25,pd:1,na:13};
var NOSEND={not_granted:1,sampling_disabled:1,not_declared:1,capability_disabled:1,capability_removed:1,invalid_request:1,prompt_too_large:1,images_unavailable:1,tools_unavailable:1,transform_error:1,queue_overflow:1};
function usoPr(){var p=CFG.price||{},o={};Object.keys(PRICE_DEF).forEach(function(k){o[k]=+p[k]>0?+p[k]:PRICE_DEF[k]});return o}
function dayKey(d){d=d||new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function usoBRL(inC,outC,P){P=P||usoPr();return (inC/P.cpt*P.inp+outC/P.cpt*P.safe*P.out)/1e6*P.fx}
function usoSave(){
  clearTimeout(USO_T);
  USO_T=setTimeout(function(){
    if(!USO.ready)return;
    var ks=Object.keys(USO.days).sort();while(ks.length>60)delete USO.days[ks.shift()];
    if(CAP.uso){try{CAP.uso.set({days:JSON.parse(JSON.stringify(USO.days)),upd:Date.now()}).catch(function(){})}catch(e){}}
  },2500);
}
function usoRec(fid,cst,aid,kind,inC,outC,ms,ok,fixC,code){
  var dk=dayKey(),d=USO.days[dk]=USO.days[dk]||{},k=fid+':'+aid;
  var r=d[k]=d[k]||{c:0,i:0,o:0,f:0,ms:0,e:0};
  if(code&&NOSEND[code]){r.e++;usoSave();usoRefresh();return}
  r.c++;r.i+=inC;r.o+=outC;r.f+=Math.min(fixC||0,inC);r.ms+=ms;if(!ok)r.e++;
  var P=usoPr();if(cst&&cst[aid]!=null)cst[aid]+=usoBRL(inC,outC,P);
  USO.log.unshift({t:hhmm(),a:k,k:kind,i:Math.round(inC/P.cpt),o:Math.round(outC/P.cpt*P.safe),ms:ms,ok:ok});if(USO.log.length>25)USO.log.pop();
  usoSave();usoRefresh();
}
function aiJson(aid,kind,prompt,opts,fixC){
  var t0=Date.now(),ic=String(prompt).length,fid=(F.FMETA&&F.FMETA.id)||'f',cst=F.cost;
  return CAP.sample.json(prompt,opts).then(function(r){var oc=0;try{oc=JSON.stringify(r).length}catch(e){}usoRec(fid,cst,aid,kind,ic,oc,Date.now()-t0,true,fixC);return r},
    function(e){usoRec(fid,cst,aid,kind,ic,(e&&e.text||'').length,Date.now()-t0,false,fixC,e&&e.code);throw e});
}
function usoSum(dayF,keyF){
  var s={c:0,i:0,o:0,f:0,ms:0,e:0};
  Object.keys(USO.days).forEach(function(dx){if(dayF&&!dayF(dx))return;var d=USO.days[dx];Object.keys(d).forEach(function(k){if(keyF&&!keyF(k))return;var r=d[k];s.c+=r.c;s.i+=r.i;s.o+=r.o;s.f+=r.f||0;s.ms+=r.ms;s.e+=r.e})});
  return s;
}
function usoMerge(rem){
  var rd=rem&&rem.days;if(!rd)return;
  Object.keys(rd).forEach(function(dx){var d=USO.days[dx]=USO.days[dx]||{};Object.keys(rd[dx]).forEach(function(k){var a=rd[dx][k],r=d[k];if(!r){d[k]=a;return}r.c+=a.c||0;r.i+=a.i||0;r.o+=a.o||0;r.f=(r.f||0)+(a.f||0);r.ms+=a.ms||0;r.e+=a.e||0})});
}
function usoFloorBRL(fid){var dk=dayKey(),s=usoSum(function(x){return x===dk},function(k){return k.indexOf(fid+':')===0});return usoBRL(s.i,s.o)}
function usoLine(aid){
  var fid=(F.FMETA&&F.FMETA.id)||'f',r=(USO.days[dayKey()]||{})[fid+':'+aid];
  if(!r||!r.c)return 'nenhuma chamada';
  var P=usoPr();return r.c+' chamada(s) · ~'+Math.round((r.i/P.cpt)+(r.o/P.cpt*P.safe)).toLocaleString('pt-BR')+' tokens · '+brl(usoBRL(r.i,r.o,P));
}

function fnum(n){return Math.round(n).toLocaleString('pt-BR')}
function usd(n){return 'US$ '+n.toFixed(2).replace('.',',')}
function usoRefresh(force){
  var el=document.getElementById('usoBox');if(!el)return;
  var ac=document.activeElement;if(!force&&ac&&el.contains(ac)&&ac.tagName==='INPUT')return;
  el.outerHTML=usoBox();
}
function usoAgName(k){
  var p=k.split(':');if(p[1]==='time'){var M0=(F.FMETA&&F.FMETA.id===p[0])?F.FMETA:((FLOORS[p[0]]&&FLOORS[p[0]].FMETA)||{});return (M0.andar?M0.andar+'º ':'')+'Retrospectiva'}
  var fid=p[0],aid=p[1],cur=F.FMETA&&F.FMETA.id===fid,A=cur?F.AG:((FLOORS[fid]&&FLOORS[fid].AG)||{}),M=cur?F.FMETA:((FLOORS[fid]&&FLOORS[fid].FMETA)||{});
  return (M.andar?M.andar+'º ':'')+((A[aid]&&A[aid].name)||aid);
}
function usoBox(){
  var P=usoPr(),dk=dayKey(),lim=new Date();lim.setDate(lim.getDate()-6);var lk=dayKey(lim);
  var d7=function(x){return x>=lk};
  var T=usoSum(function(x){return x===dk}),W=usoSum(d7),A=usoSum();
  var row=function(l,s){return '<tr><td>'+l+'</td><td>'+s.c+'</td><td>'+fnum(s.i/P.cpt)+'</td><td>'+fnum(s.o/P.cpt*P.safe)+'</td><td>'+brl(usoBRL(s.i,s.o,P))+'</td></tr>'};
  var h='<div class="box" id="usoBox"><h3>Consumo de IA (medido nos testes)</h3>'+
   '<p class="hint" style="margin:0 0 8px">A IA do navegador não informa tokens. Aqui ficam medidos de verdade: chamadas, caracteres enviados e recebidos e tempo. Os tokens são estimados a partir dos caracteres, e o custo usa a tabela de preços da API (editável abaixo). Hoje isso gasta o uso do seu Claude, não dinheiro da API.</p>'+
   '<table class="ut"><tr><th></th><th>Chamadas</th><th>Tokens entrada</th><th>Tokens saída</th><th>Custo na API</th></tr>'+row('Hoje',T)+row('7 dias',W)+row('Total',A)+'</table>';
  var by={};
  Object.keys(USO.days).forEach(function(dx){if(!d7(dx))return;var d=USO.days[dx];Object.keys(d).forEach(function(k){var r=d[k],s=by[k]=by[k]||{c:0,i:0,o:0,f:0,ms:0,e:0};s.c+=r.c;s.i+=r.i;s.o+=r.o;s.f+=r.f||0;s.ms+=r.ms;s.e+=r.e})});
  var ks=Object.keys(by).sort(function(a,b){return usoBRL(by[b].i,by[b].o,P)-usoBRL(by[a].i,by[a].o,P)});
  if(ks.length){
    h+='<h3 style="margin-top:14px">Por agente (7 dias)</h3><table class="ut"><tr><th>Agente</th><th>Chamadas</th><th>Entrada/chamada</th><th>Saída/chamada</th><th>Parte fixa</th><th>Tempo</th><th>Erros</th><th>Custo</th></tr>'+
    ks.map(function(k){var s=by[k],n=Math.max(1,s.c);return '<tr><td>'+esc(usoAgName(k))+'</td><td>'+s.c+'</td><td>'+fnum(s.i/n/P.cpt)+'</td><td>'+fnum(s.o/n/P.cpt*P.safe)+'</td><td>'+(s.i?Math.round(s.f/s.i*100):0)+'%</td><td>'+(s.ms/n/1000).toFixed(1)+' s</td><td>'+s.e+'</td><td>'+brl(usoBRL(s.i,s.o,P))+'</td></tr>'}).join('')+'</table>';
  }else h+='<p class="hint" style="margin:10px 0 0">Ainda sem chamadas. Com "Agentes com IA real" ligado, cada tarefa que um agente executa passa a ser medida aqui.</p>';
  if(A.c){
    var ti=A.i/A.c/P.cpt,to=A.o/A.c/P.cpt*P.safe,fs=A.i?A.f/A.i:0,n=P.pd*P.na*30;
    var std=n*(ti*P.inp+to*P.out)/1e6,cch=n*(ti*(fs*P.cin+(1-fs)*P.inp)+to*P.out)/1e6;
    var sc=[['Padrão, sem otimização',std],['Com cache do prompt (parte fixa a '+Math.round(P.cin/P.inp*100)+'% do preço)',cch],['Com Batch API (50% menos, resposta em até 24 h)',std/2],['Cache + Batch',cch/2]];
    h+='<h3 style="margin-top:14px">Projeção por mês quando rodar na API</h3>'+
     '<p class="hint" style="margin:0 0 6px">Base: média medida de '+fnum(ti)+' tokens de entrada e '+fnum(to)+' de saída por chamada, '+Math.round(fs*100)+'% do prompt é parte fixa. Premissa: '+P.pd+' execução(ões) por agente por dia, '+P.na+' agentes, 30 dias = '+fnum(n)+' chamadas.</p>'+
     '<table class="ut">'+sc.map(function(x){return '<tr><td>'+x[0]+'</td><td>'+usd(x[1])+'</td><td>'+brl(x[1]*P.fx)+'</td></tr>'}).join('')+'</table>'+
     '<p class="hint" style="margin:6px 0 0">O cache só ajuda se as chamadas com o mesmo início do prompt ficarem a poucos minutos uma da outra (o cache dura 5 minutos) e se a parte fixa passar do tamanho mínimo de cache do modelo (em geral cerca de 1.000 tokens). Agentes que rodam uma vez por dia sem outros por perto não aproveitam.</p>';
  }
  if(USO.log.length)h+='<h3 style="margin-top:14px">Últimas chamadas</h3><table class="ut"><tr><th>Hora</th><th>Agente</th><th>Tipo</th><th>Entrada</th><th>Saída</th><th>Tempo</th></tr>'+USO.log.slice(0,8).map(function(l){return '<tr><td>'+l.t+'</td><td>'+esc(usoAgName(l.a))+'</td><td>'+l.k+(l.ok?'':' (erro)')+'</td><td>'+fnum(l.i)+'</td><td>'+fnum(l.o)+'</td><td>'+(l.ms/1000).toFixed(1)+' s</td></tr>'}).join('')+'</table>';
  var fld=[['inp','Entrada (US$ por 1 milhão de tokens)',P.inp],['out','Saída (US$ por 1 milhão de tokens)',P.out],['cin','Leitura de cache (US$ por 1 milhão de tokens)',P.cin],['fx','Dólar (R$)',P.fx],['cpt','Caracteres por token (português)',P.cpt],['safe','Fator da saída (cobre o raciocínio oculto)',P.safe],['pd','Projeção: execuções por agente por dia',P.pd],['na','Projeção: agentes ativos',P.na]];
  h+='<h3 style="margin-top:14px">Preços e premissas</h3><p class="hint" style="margin:0 0 6px">Padrão: preços públicos do Claude Sonnet 5.5 consultados em 07/10/2026. Confira na tabela da Anthropic antes de decidir. O dólar e os demais valores são premissas minhas e você pode ajustar.</p>'+
   fld.map(function(f){return '<label for="prc_'+f[0]+'">'+f[1]+'</label><input type="text" id="prc_'+f[0]+'" inputmode="decimal" value="'+String(f[2]).replace('.',',')+'">'}).join('')+
   '<div class="acts" style="margin-top:10px"><button class="btn ghost sm" id="usoReset">Zerar contagem</button></div></div>';
  return h;
}
