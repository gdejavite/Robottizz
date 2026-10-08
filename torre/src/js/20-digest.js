/* =====================================================================
   "ENQUANTO VOCÊ ESTAVA FORA": ao voltar (nova visita ou aba escondida por
   mais de 3 min), resume o que aconteceu nos andares desde a sua última interação.
   ===================================================================== */
var LAST_KEY='torre_last_seen',lastInteract=+lsGet(LAST_KEY,0)||0,hiddenAt=0,awayFrom=lastInteract,lastPersist=0;
function markInteract(){
  lastInteract=Date.now();
  if(lastInteract-lastPersist>15000){lastPersist=lastInteract;lsSet(LAST_KEY,String(lastInteract))}
}
document.addEventListener('pointerdown',markInteract,{passive:true});
document.addEventListener('keydown',markInteract);
window.addEventListener('pagehide',function(){lsSet(LAST_KEY,String(lastInteract));flushSaves()});
document.addEventListener('visibilitychange',function(){
  if(document.hidden){hiddenAt=Date.now();awayFrom=lastInteract;lsSet(LAST_KEY,String(lastInteract));flushSaves()}
  else if(hiddenAt&&Date.now()-hiddenAt>180000)showDigest(awayFrom);
});
var DIG_RULES=[['done',/ concluiu "/],['ok',/^Você aprovou/],['no',/^Você recusou/],['dev',/ devolveu "/],['pend',/ foi até a sua sala:/],
  ['stuck',/ travou/],['dec',/^Decisão|^Ata ·/],['lvl',/ subiu para o nível /],['chk',/^C · Verificação real/],['slack',/decidido pelo Slack|decidido em outro aparelho/]];
var DIG_LABEL={done:['tarefa concluída','tarefas concluídas'],ok:['aprovação sua','aprovações suas'],no:['recusa sua','recusas suas'],dev:['devolução da revisão','devoluções da revisão'],
  pend:['pedido de aprovação','pedidos de aprovação'],stuck:['agente travado','agentes travados'],dec:['decisão ou ata','decisões e atas'],lvl:['subida de nível','subidas de nível'],
  chk:['verificação com dado real','verificações com dado real'],slack:['decisão vinda do Slack ou de outro aparelho','decisões vindas do Slack ou de outro aparelho']};
function digLabel(k,n){return DIG_LABEL[k][n===1?0:1]}
function digestData(since){
  var out=[];
  FLOORIDS.forEach(function(id){
    var Fl=FLOORS[id],ev=Fl.journal.filter(function(e){return e.ts>since}),c={};
    ev.forEach(function(e){DIG_RULES.forEach(function(r){if(r[1].test(e.x))c[r[0]]=(c[r[0]]||0)+1})});
    if(ev.length)out.push({Fl:Fl,ev:ev,c:c});
  });
  return out;
}
function showDigest(since){
  if(!since)return;
  var data=digestData(since),total=data.reduce(function(s,x){return s+x.ev.length},0);
  if(total<3)return;
  var h='<div class="dig-h"><h2>Enquanto você estava fora <small class="hint">desde '+hhmm(new Date(since))+(Date.now()-since>864e5?' de '+new Date(since).toLocaleDateString('pt-BR'):'')+'</small></h2><button class="btn ghost sm" data-dg="close" aria-label="Fechar resumo">Fechar</button></div>';
  h+='<div class="dig-grid">'+data.map(function(x){
    var keys=Object.keys(x.c).sort(function(a,b){return x.c[b]-x.c[a]});
    var pend=x.Fl.approvals.length;
    return '<div class="dig-f"><b>'+x.Fl.FMETA.andar+'º · '+esc(x.Fl.FMETA.nome)+'</b><ul>'+(keys.length?keys.map(function(k){return '<li><b>'+x.c[k]+'</b> '+digLabel(k,x.c[k])+'</li>'}).join(''):'<li>'+x.ev.length+(x.ev.length===1?' registro':' registros')+' no diário</li>')+'</ul>'+
      (pend?'<button class="btn sm" data-dg="go" data-f="'+x.Fl.id+'">'+pend+' aguardando você</button>':'')+'</div>';
  }).join('')+'</div>';
  h+='<div class="acts" style="margin-top:8px">'+(CFG.real&&CAP.sample?'<button class="btn ghost sm" data-dg="ai">Resumir com IA</button>':'')+'</div><p class="hint" id="digAi" style="margin:6px 0 0"></p>';
  var box=$('#digest');box.innerHTML=h;box.hidden=false;box.dataset.since=since;
}
function digestAI(since){
  var data=digestData(since),lines=[];
  data.forEach(function(x){x.ev.slice(-60).forEach(function(e){lines.push(x.Fl.FMETA.nome+' '+hhmm(new Date(e.ts))+' · '+e.x)})});
  var p='Você é o assistente do Gabriel na Torre Gabriel (um prédio onde cada andar é uma empresa dele, com agentes de IA). Resuma em português o que aconteceu enquanto ele estava fora.\n\nDIÁRIO:\n'+lines.slice(-150).join('\n')+
    '\n\nResponda SOMENTE com JSON: {"resumo":"3 a 5 frases curtas com o mais importante","prioridade":"a decisão ou ação nº 1 que ele deve tomar agora, em 1 frase"}';
  $('#digAi').textContent='Resumindo…';
  inFloor(VIEW,function(){
    aiJson('time','resumo',p,{cache:false},0).then(function(r){$('#digAi').textContent=String((r&&r.resumo)||'').slice(0,900)+((r&&r.prioridade)?' Prioridade agora: '+String(r.prioridade).slice(0,300):'')},
      function(e){$('#digAi').textContent='Não consegui resumir com IA ('+errCopy(e)+').'});
  });
}
$('#digest').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  if(b.dataset.dg==='close'){this.hidden=true;markInteract();lsSet(LAST_KEY,String(Date.now()))}
  else if(b.dataset.dg==='go'){this.hidden=true;goFloor(b.dataset.f);setTimeout(openNextApproval,900)}
  else if(b.dataset.dg==='ai')digestAI(+this.dataset.since);
});
