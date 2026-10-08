/* =====================================================================
   NAVEGAÇÃO: Cobertura (painel dos sócios), elevador, iluminação,
   troca de andar, chat da Recepção, reunião chamada por você e abas.
   ===================================================================== */
var onTop=false;
function fmtM(m,v){
  if(v==null||isNaN(v))return '—';
  var f=m.f||'int';
  if(f==='brl')return 'R$ '+v.toFixed(2).replace('.',',');
  if(f==='pct1')return v.toFixed(1).replace('.',',')+'%';
  if(f==='pct0')return Math.round(v)+'%';
  if(f==='brl0')return 'R$ '+Math.round(v).toLocaleString('pt-BR');
  if(f==='meses')return v.toFixed(1).replace('.',',')+' m';
  if(f==='min')return Math.round(v)+' min';
  return String(Math.round(v));
}
/* gargalo nº 1 do andar: a meta (com dado) mais longe do alvo */
function bottleneck(Fl){
  var best=null;Object.keys(Fl.MET).forEach(function(k){var m=Fl.MET[k];if(m.v==null)return;var p=metPct(m);if(!best||p<best.p)best={k:k,m:m,p:p}});
  return best;
}
/* receita somada: metas marcadas com rev:true em cada andar */
function revenueSum(){
  var tot=0,parts=[];
  FLOORIDS.forEach(function(id){var Fl=FLOORS[id];Object.keys(Fl.MET).forEach(function(k){var m=Fl.MET[k];if(m.rev&&m.v!=null){tot+=m.v;parts.push({Fl:Fl,m:m})}})});
  return {tot:tot,parts:parts};
}
function renderTop(){
  var pend=[];FLOORIDS.forEach(function(id){var Fl=FLOORS[id];Fl.approvals.forEach(function(o){pend.push({Fl:Fl,o:o})})});
  var rv=revenueSum(),aom=agentOfMonth();
  var h='<h2>Cobertura · Sala dos Sócios</h2><p class="hint">Visão única dos seus andares. Toque num andar para entrar ou numa pendência para decidir.</p>';
  h+='<div class="kpis topkpis" style="margin-top:12px">'+
    '<div class="kpi"><strong>'+(rv.parts.length?fmtM({f:'brl0'},rv.tot):'—')+'</strong><span>Receita mensal somada'+(rv.parts.length?' ('+rv.parts.map(function(p){return esc(p.Fl.FMETA.nome)}).join(' + ')+')':' · sem dado de receita ainda')+'</span></div>'+
    '<div class="kpi"><strong>'+pend.length+'</strong><span>Pendências em todos os andares</span></div>'+
    '<div class="kpi"><strong>'+(aom?esc(aom.a.name):'—')+'</strong><span>'+(aom?'Agente do mês · '+aom.xp+' XP · '+esc(aom.Fl.FMETA.nome):'Agente do mês (ainda sem XP)')+'</span></div>'+
    '<div class="kpi"><button class="btn" id="btnReport">Relatório semanal</button><span style="display:block;margin-top:6px">Gera a página para imprimir ou salvar em PDF</span></div></div>';
  h+='<div class="box"><h2>Precisam de você ('+pend.length+')</h2>'+(pend.length?pend.map(function(x){
    var a=x.Fl.AG[x.o.agent];
    return '<div class="pendrow"><div><b>'+esc(x.o.title)+'</b><small>'+x.Fl.FMETA.andar+'º '+esc(x.Fl.FMETA.nome)+' · '+esc(a.name)+' · '+apKindLabel(x.o.kind)+'</small></div><button class="btn sm" data-open="'+x.Fl.id+':'+x.o.id+'">Revisar</button></div>'}).join(''):'<p class="empty">Nada pendente em nenhum andar.</p>')+'</div>';
  h+='<div class="floors">'+FLOORIDS.map(function(id){
    var Fl=FLOORS[id],stk=peekStuck(Fl),ks=Object.keys(Fl.MET).slice(0,4),bn=bottleneck(Fl);
    var up=Object.keys(Fl.cost).reduce(function(a,k){return a+Fl.cost[k]},0);
    var hist=Fl.STATS.rejHist,dev=hist.length?Math.round(hist.slice(-10).reduce(function(a,x){return a+x},0)/Math.min(10,hist.length)*100)+'%':'—';
    return '<div class="fcard"><div class="fh"><h3>'+Fl.FMETA.andar+'º · '+esc(Fl.FMETA.nome)+'</h3><span class="chip" style="--c:'+(stk?'#ff6a5c':'#6fd3a0')+'">'+(stk?esc(Fl.STK.title):'Operando')+'</span></div>'+
      (bn?'<p class="gargalo"><b>Gargalo nº 1:</b> '+esc(bn.m.n)+' em '+bn.p+'% da meta ('+fmtM(bn.m,bn.m.v)+' de '+fmtM(bn.m,bn.m.m)+')</p>':'')+
      '<div class="mini"><div><b>'+Fl.approvals.length+'</b><small>pendências</small></div><div><b>'+Fl.kpi.done+'</b><small>concluídas</small></div><div><b>'+Fl.kpi.approved+'</b><small>aprovadas</small></div><div><b>'+dev+'</b><small>devolução</small></div></div>'+
      ks.map(function(k){var m=Fl.MET[k],pct=metPct(m);return '<div class="mt"><div style="display:flex;justify-content:space-between;gap:8px"><span>'+esc(m.n)+'</span><b>'+fmtM(m,m.v)+' <small style="color:var(--muted);font-weight:500">/ '+fmtM(m,m.m)+'</small></b></div><div class="bar"><u style="width:'+pct+'%"></u></div></div>'}).join('')+
      '<ul>'+Fl.logs.slice(0,3).map(function(l){return '<li>'+esc(l.x)+'</li>'}).join('')+'</ul>'+
      '<div class="acts" style="margin-top:10px"><button class="btn sm" data-go="'+Fl.id+'">Entrar no andar</button><span class="hint" style="align-self:center">'+(CFG.real?'IA hoje (estimada): '+brl(usoFloorBRL(Fl.id)):'API simulada: '+brl(up))+'</span></div></div>';
  }).join('')+'</div>';
  put('#topBody',h);
}
$('#topBody').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  if(b.id==='btnReport'){openReport();return}
  if(b.dataset.go){goFloor(b.dataset.go);return}
  if(b.dataset.open){
    var p=b.dataset.open.split(':'),fid=p[0],aid=+p[1];
    go('office');
    if(FLOORS[fid]!==VIEW)switchFloor(fid);
    setTimeout(function(){openApproval(aid)},60);
  }
});
/* ---------- elevador ---------- */
function elevatorFx(label,sub,mid){
  var el=$('#elevFx'),reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  playSound('ding');
  if(reduce){mid();return}
  $('#efN').textContent=label;$('#efT').textContent=sub;
  el.classList.add('on');void el.offsetWidth;el.classList.add('closing');
  setTimeout(function(){mid();$('#efN').textContent=label;
    setTimeout(function(){el.classList.remove('closing');setTimeout(function(){el.classList.remove('on')},420)},380)},420);
}
function goFloor(id){
  if(id==='top'){if(onTop)return;elevatorFx('8º','Cobertura',function(){go('top')});return}
  var Fl=FLOORS[id];if(!Fl||(Fl===VIEW&&!onTop))return;
  elevatorFx(Fl.FMETA.andar+'º',Fl.FMETA.nome,function(){
    if(onTop||!$('#v-office').classList.contains('on'))go('office');
    if(Fl!==VIEW)switchFloor(id);
  });
}
/* atalho E: próximo andar (ciclo: andares → cobertura) */
function nextFloor(){
  var seq=FLOORIDS.slice().sort(function(a,b){return FLOORS[b].FMETA.andar-FLOORS[a].FMETA.andar}).concat(['top']);
  var cur=onTop?'top':VIEW.id,i=seq.indexOf(cur);goFloor(seq[(i+1)%seq.length]);
}
function renderElev(){
  var tp=0;FLOORIDS.forEach(function(id){tp+=FLOORS[id].approvals.length});
  var ids=FLOORIDS.slice().sort(function(a,b){return FLOORS[b].FMETA.andar-FLOORS[a].FMETA.andar});
  var html='<button data-f="top" aria-pressed="'+(onTop?'true':'false')+'" aria-label="Cobertura, '+tp+' pendência(s) no total">8º <small>Cobertura</small>'+(tp?'<span class="bd y">'+tp+'</span>':'')+'</button>'+
  ids.map(function(id){
    var Fl=FLOORS[id],m=Fl.FMETA,np=Fl.approvals.length,st=peekStuck(Fl);
    return '<button data-f="'+id+'" aria-pressed="'+(Fl===VIEW&&!onTop?'true':'false')+'" aria-label="Andar '+m.andar+', '+esc(m.nome)+(np?', '+np+' pendência(s)':'')+(st?', agente travado':'')+'">'+m.andar+'º <small>'+esc(m.nome)+'</small>'+
      (st?'<span class="bd">!</span>':'')+(np?'<span class="bd y">'+np+'</span>':'')+'</button>';
  }).join('');
  put('#elev',html);
}
$('#elev').addEventListener('click',function(e){var b=e.target.closest('button');if(b)goFloor(b.dataset.f)});
/* ---------- iluminação dia/noite ---------- */
function lightLabel(){return {noite:'☾ Noite',dia:'☀ Dia',auto:'◐ Auto'}[LIGHT]}
$('#btnLight').textContent=lightLabel();
$('#btnLight').addEventListener('click',function(){
  LIGHT={noite:'dia',dia:'auto',auto:'noite'}[LIGHT];
  lsSet('torre_light',LIGHT);
  this.textContent=lightLabel();dirty=true;
});
function refreshAll(){
  _put={};
  document.title='Torre Gabriel · '+F.FMETA.andar+'º andar '+F.FMETA.nome;
  $('#fsub').textContent=onTop?'8º andar · Cobertura · visão de todos os andares':F.FMETA.sub;$('#metaTitle').textContent=F.FMETA.empresa;$('#metaTag').textContent=F.FMETA.tag||'números simulados';selRoom=null;
  var bad=F.connState[F.STK.conn]==='expirado';
  if(bad){$('#hudAlert b').textContent=F.STK.title;$('#hudAlert span').textContent=F.STK.desc}
  $('#hudAlert').hidden=!bad;$('#tabConn').classList.toggle('warn',bad);
  initMemUI();memFilter={kind:'all',scope:'all',q:''};memEdit=null;
  $('#fKind').value='all';$('#fScope').value='all';$('#fQ').value='';
  $('#sugg').innerHTML=F.FMETA.sugg.map(function(x){return '<button class="btn ghost sm">'+esc(x)+'</button>'}).join('');
  $('#recName').textContent=F.AG[F.RECID].name;
  select(F.sel);
  renderCards();renderConns();renderApprovals();renderChat();renderLog();renderMetas();renderMemUI();renderLive();renderElev();stopTimeline();
  if($('#v-ops').classList.contains('on'))renderOps();
  closeApprovalDlg();
  if(firstFit){resize();fitAll(false)}
}
function switchFloor(id){
  var Fl=FLOORS[id];if(!Fl||Fl===VIEW||F!==VIEW)return;
  F=VIEW=Fl;inBg=false;
  refreshAll();
  log('Você subiu ao '+F.FMETA.andar+'º andar: '+F.FMETA.nome+'.','k-meet');
}

/* ---------- chat da Recepção ---------- */
function say(who,txt){F.chat.push({w:who,t:txt});if(F.chat.length>80)F.chat.shift();renderChat()}
function renderChat(){
  if(inBg)return;
  var m=$('#msgs');m.innerHTML=F.chat.map(function(c){return '<div class="m '+c.w+'">'+esc(c.t)+'</div>'}).join('');m.scrollTop=m.scrollHeight}
function routeTo(txt,agentId,area,how){
  var a=F.AG[agentId],rv=F.AG[F.REVID];
  newTask(agentId,{t:txt,rv:1},txt.length>60?txt.slice(0,57)+'...':txt);
  say('rec','Recebi. Classifiquei como '+area+(how?' ('+how+')':'')+' e encaminhei para '+a.name+'. Entra na frente da fila e passa pela revisão de '+rv.name+' antes de chegar a você.');
  log('Você pediu à Recepção: '+txt+' (encaminhado para '+a.name+(how?', '+how:'')+').');
}
/* quando nenhuma palavra-chave bate, a Recepção pergunta à IA qual agente deve receber */
function aiRoute(txt){
  var rec=F.AG[F.RECID],opts=F.WORKERS.map(function(k){var a=F.AG[k];return '- '+k+': '+a.name+' ('+a.role+')'}).join('\n');
  var p='Você é '+rec.name+', a Recepção da '+F.FMETA.empresaLong+'. Classifique o pedido do Gabriel e escolha UM agente para recebê-lo.\n\nAGENTES:\n'+opts+
    '\n\nPEDIDO: "'+txt.slice(0,600)+'"\n\nSe o pedido estiver vago demais para qualquer agente, devolva agente vazio e uma pergunta curta. Responda SOMENTE com JSON: {"agente":"id da lista ou vazio","area":"nome curto da área","pergunta":"pergunta ao Gabriel se faltar detalhe, senão vazio"}';
  say('rec','Deixa eu entender o pedido…');
  aiJson(rec.id,'roteamento',p,{cache:false},0).then(bindF(function(r){
    r=r||{};var k=String(r.agente||'').trim().toLowerCase();
    if(k&&F.WORKERS.indexOf(k)>=0)routeTo(txt,k,String(r.area||F.AG[k].role).slice(0,40),'com IA');
    else say('rec',String(r.pergunta||'Não consegui identificar a área. Pode dar mais detalhes?').slice(0,300));
  })).catch(bindF(function(e){say('rec','Não identifiquei a área ('+errCopy(e)+'). Escreva com palavras do dia a dia da área (por exemplo: '+F.FMETA.sugg[0].toLowerCase()+') que eu encaminho.')}));
}
function sendRequest(txt){
  txt=txt.trim();if(!txt)return;say('eu',txt);
  var r=F.ROUTE.filter(function(x){return x[1].test(txt)})[0];
  later(function(){
    if(r){routeTo(txt,r[0],r[2]);return}
    if(CFG.real&&CAP.sample){aiRoute(txt);return}
    say('rec','Não identifiquei a área. Escreva com palavras do dia a dia da área (por exemplo: '+F.FMETA.sugg[0].toLowerCase()+') que eu encaminho. Com "Agentes com IA real" ligado eu entendo pedidos livres.');
  },500);
}
$('#chatSend').addEventListener('click',function(){var i=$('#chatIn');sendRequest(i.value);i.value=''});
$('#chatIn').addEventListener('keydown',function(e){if(e.key==='Enter'){sendRequest(this.value);this.value=''}});
$('#sugg').addEventListener('click',function(e){var b=e.target.closest('button');if(b)sendRequest(b.textContent)});

/* ---------- reunião chamada por você (com IA: debate entre os participantes) ---------- */
var mSel={};
function openMeet(){
  mSel={};
  $('#mPick').innerHTML=F.ORDER.filter(function(k){return k!==F.RECID}).map(function(k){return '<button type="button" aria-pressed="false" data-k="'+k+'">'+esc(F.AG[k].name)+'</button>'}).join('');
  $('#mPauta').value='';
  $('#mAiHint').hidden=!(CFG.real&&CAP.sample);
  openDlg($('#meetDlg'));$('#mPauta').focus();
}
$('#btnMeet').addEventListener('click',openMeet);
$('#mCancel').addEventListener('click',function(){closeDlg($('#meetDlg'))});
$('#mPick').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var k=b.dataset.k;mSel[k]=!mSel[k];b.setAttribute('aria-pressed',mSel[k]?'true':'false')});
$('#mGo').addEventListener('click',function(){
  var ids=Object.keys(mSel).filter(function(k){return mSel[k]});
  /* sem ninguém escolhido: os donos das duas primeiras salas com time */
  if(!ids.length)ids=F.WORKERS.slice(0,2);
  closeDlg($('#meetDlg'));
  if(F.meetingOn){log('Já existe uma reunião em andamento.');return}
  var pauta=$('#mPauta').value.trim()||'alinhamento geral';
  if(CFG.real&&CAP.sample&&$('#mPauta').value.trim())aiDebate(ids,pauta);
  else runMeeting(ids,pauta,'pauta registrada e próximos passos distribuídos.');
});
/* cada participante dá a sua posição (uma chamada cada); o primeiro consolida em opções A/B com recomendação */
function aiDebate(ids,pauta){
  var ps=ids.map(function(k){return F.AG[k]}).filter(function(a){return a&&a.id!=='gab'}).slice(0,3);
  if(!ps.length){runMeeting(ids,pauta,'pauta registrada.');return}
  runMeeting(ps.map(function(a){return a.id}),pauta+' (debate com IA)','posições registradas; a decisão vai para você.');
  var base='EMPRESA: '+F.FMETA.empresaLong+'\nMETAS: '+metSnapshot()+'\nPAUTA DA REUNIÃO: "'+pauta.slice(0,400)+'"\n'+RULES_FIXED;
  var calls=ps.map(function(a){
    var p='Você é '+a.name+' ('+a.role+'). '+fillData((CFG.agents[a.id]||{}).ctx||'').slice(0,1500)+'\n\n'+base+'\n\nDê a sua posição sobre a pauta, do ponto de vista da sua função, em até 3 frases, com um número ou dado quando houver. Responda SOMENTE com JSON: {"posicao":"..."}';
    return aiJson(a.id,'reuniao',p,{cache:false},0).then(function(r){return {a:a,pos:String((r&&r.posicao)||'').slice(0,500)}},function(){return {a:a,pos:''}});
  });
  Promise.all(calls).then(bindF(function(res){
    var ok=res.filter(function(x){return x.pos});
    if(!ok.length){log('O debate com IA não trouxe posições. A reunião fica só registrada.','k-red');return}
    ok.forEach(function(x){log(x.a.name+' na reunião: '+x.pos,'k-meet')});
    var lead=ps[0];
    var p='Você é '+lead.name+' ('+lead.role+') e conduz a reunião.\n\n'+base+'\n\nPOSIÇÕES:\n'+ok.map(function(x){return '- '+x.a.name+': '+x.pos}).join('\n')+
      '\n\nConsolide em duas opções claras para o Gabriel decidir e recomende uma. Responda SOMENTE com JSON: {"resumo":"contexto em 1 frase","a":"opção A","b":"opção B","recomendacao":"qual e por quê, em 1 frase"}';
    return aiJson(lead.id,'reuniao',p,{cache:false},0).then(bindF(function(r){
      r=r||{};if(!r.a||!r.b){log('Não consegui consolidar as opções do debate.','k-red');return}
      later(function(){
        if(lead.state!=='idle'&&lead.state!=='reuniao')return;
        makeApproval(lead,null,{k:'reuniao',title:'Reunião · '+pauta.slice(0,60)+' · decisão',d:String(r.resumo||pauta).slice(0,300),
          opts:['A · '+String(r.a).slice(0,200),'B · '+String(r.b).slice(0,200)],reco:'Recomendação de '+lead.name+': '+String(r.recomendacao||'').slice(0,240),
          meet:{title:'Reunião · '+pauta.slice(0,60),part:ps.map(function(a){return a.id})}});
      },10500);
    }));
  })).catch(bindF(function(e){log('O debate com IA falhou ('+errCopy(e)+').','k-red')}));
}

/* ---------- abas (com navegação por setas, padrão ARIA) ---------- */
var TAB_ORDER=['office','ops','chat','agents','mem','conn','top'];
$('#tabs').addEventListener('click',function(e){var b=e.target.closest('button');if(b)go(b.dataset.tab)});
$('#tabs').addEventListener('keydown',function(e){
  var keys={ArrowRight:1,ArrowLeft:-1,Home:'first',End:'last'};if(!(e.key in keys))return;
  e.preventDefault();var bs=[].slice.call(document.querySelectorAll('#tabs [role=tab]')),i=bs.indexOf(document.activeElement);
  var k=keys[e.key],j=k==='first'?0:k==='last'?bs.length-1:(i+k+bs.length)%bs.length;
  bs[j].focus();go(bs[j].dataset.tab);
});
function go(t){
  onTop=(t==='top');
  document.querySelectorAll('#tabs [role=tab]').forEach(function(x){var on=x.dataset.tab===t;x.setAttribute('aria-selected',on?'true':'false');x.tabIndex=on?0:-1});
  document.querySelectorAll('.view').forEach(function(v){v.classList.remove('on')});
  $('#v-'+t).classList.add('on');
  if(t==='ops')renderOps();
  if(t==='mem')renderMemUI();
  if(t==='top'){_put['#topBody']=null;renderTop()}
  if(t==='office'){resize();dirty=true}
  var fs=$('#fsub');if(fs)fs.textContent=(t==='top')?'8º andar · Cobertura · visão de todos os andares':F.FMETA.sub;
  renderElev();
}
$('#btnGoChat').addEventListener('click',function(){go('chat')});
