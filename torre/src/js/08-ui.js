/* =====================================================================
   UI DO ANDAR: HUD, aprovações, setores, painel do agente, operação
   ===================================================================== */
function renderLive(){
  if(inBg)return;
  var pa=$('#btnPauseAll');if(pa){var wk=Object.keys(F.AG).filter(function(i){return i!=='gab'&&!F.AG[i].fixed});pa.textContent=wk.length&&wk.every(function(i){return F.AG[i].paused})?'Retomar tudo':'Pausar tudo'}
  var c={trabalhando:0,revisando:0,esperando:0,travado:0,reuniao:0};
  Object.keys(F.AG).forEach(function(k){var a=F.AG[k];if(a.id===F.RECID||a.id==='gab')return;if(c[a.state]!==undefined)c[a.state]++});
  put('#counters',[['trabalhando','TRABALHAM'],['revisando','REVISAM'],['esperando','ESPERAM'],['travado','TRAVADOS']].map(function(p){
    return '<div><b style="color:'+(c[p[0]]?ST[p[0]].c:'#fff')+'">'+c[p[0]]+'</b><small>'+p[1]+'</small></div>'}).join('')+(c.reuniao?'<div><b style="color:'+ST.reuniao.c+'">'+c.reuniao+'</b><small>EM REUNIÃO</small></div>':''));
  put('#roster',F.ORDER.filter(function(k){return k!==F.RECID}).map(function(k){var a=F.AG[k],lv=xpLevel(k);
    return '<li data-k="'+k+'" tabindex="0"><i style="background:'+ST[a.paused?'idle':a.state].c+'"></i>'+esc(a.name)+(lv>1?'<small class="lvl">Nv '+lv+'</small>':'')+'</li>'}).join(''));
  put('#hudFeed',F.logs.slice(0,4).map(function(l){return '<li class="'+l.k+'">'+esc(l.x)+'</li>'}).join(''));
  if(F.sel)renderAgentBox();else if(selRoom)renderRoomBox();
  if($('#v-ops').classList.contains('on'))renderOps();
  dirty=true;
}
function rosterPick(e){var li=e.target.closest('li');if(!li)return;select(li.dataset.k);focusAgent(li.dataset.k);$('#roster').classList.remove('show')}
$('#roster').addEventListener('click',rosterPick);
$('#roster').addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();rosterPick(e)}});
/* no celular o roster vira uma gaveta aberta pelo botão "Equipe" */
$('#btnTeam').addEventListener('click',function(){var r=$('#roster'),on=r.classList.toggle('show');this.setAttribute('aria-expanded',on?'true':'false')});
function renderLog(){
  if(inBg)return;
  put('#log',F.logs.slice(0,25).map(function(l){return '<li class="'+l.k+'"><time>'+l.t+'</time><span>'+esc(l.x)+'</span></li>'}).join(''));
}
function apKindLabel(k){return k==='vermelho'?'confirmação dupla':k==='reuniao'?'pede reunião':'aprovação'}
function renderApprovals(){
  if(inBg)return;
  var box=$('#approvals');
  var hp=$('#hudPend');if(hp){hp.hidden=!F.approvals.length;hp.textContent=F.approvals.length+' aguardando você · Revisar (R)'}
  $('#apCount').textContent=F.approvals.length?'('+F.approvals.length+')':'';
  if(!F.approvals.length){box.innerHTML='<p class="empty">Nada pendente. Os agentes estão tocando a rotina.</p>';return}
  box.innerHTML=F.approvals.map(function(o){
    var a=F.AG[o.agent];
    var h='<div class="appr '+o.kind+'" data-id="'+o.id+'"><div class="who">'+esc(a.name)+' · '+esc(a.role)+' · '+apKindLabel(o.kind)+(o.restored?' · <i>restaurada</i>':'')+'</div><h3>'+esc(o.title)+'</h3><p>'+esc(o.d)+'</p>';
    if(o.opts)h+='<div class="opts">'+o.opts.map(function(x){return '<div>'+esc(x)+'</div>'}).join('')+(o.reco?'<div><b>'+esc(o.reco)+'</b></div>':'')+'</div>';
    if(o.kind==='reuniao')h+='<div class="acts"><button class="btn sm" data-a="A">Opção A</button><button class="btn sm" data-a="B">Opção B</button><button class="btn ghost sm" data-a="agendar">Marcar 10h</button><button class="btn no sm" data-a="no">Recusar</button></div>';
    else h+=previewHtml(o.view)+'<div class="acts"><button class="btn" data-a="open">Revisar entrega e decidir</button></div>';
    return h+'</div>';
  }).join('');
  dirty=true;
}
$('#approvals').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  var card=b.closest('.appr'),id=card.getAttribute('data-id'),act=b.getAttribute('data-a'),o=F.approvals.filter(function(x){return x.id==id})[0];
  if(!o)return;
  if(act==='open'){openApproval(id);return}
  decide(id,act);
});
function openNextApproval(){
  var o=F.approvals.filter(function(x){return x.view})[0];
  if(o){openApproval(o.id);return true}
  if(F.approvals.length){go('office');$('#approvals').scrollIntoView({behavior:'smooth'});return true}
  return false;
}
$('#hudPend').addEventListener('click',openNextApproval);

/* ---------- setores: painel da sala e pausa por agente/setor ---------- */
var selRoom=null;
var AGENT_EMPTY='<h2>Agente</h2><p class="empty">Toque num agente no mapa para ver o que ele está fazendo.</p>';
function stLabel(a){return a.paused?'Pausado':ST[a.id==='gab'?'idle':a.state].l}
function selectRoom(k){F.sel=null;selRoom=k;renderRoomBox();dirty=true}
function renderRoomBox(){
  if(inBg||!selRoom||!F.R[selRoom])return;
  var r=F.R[selRoom],mem=Object.keys(F.AG).filter(function(i){return F.AG[i].room===selRoom});
  var rows=mem.map(function(i){
    var a=F.AG[i],fx=(F.METFX[i]||[])[0],m=fx&&F.MET[fx[0]];
    return '<div class="srow"><div><b>'+esc(a.name)+'</b> · '+esc(a.role)+'<small>'+esc(stLabel(a))+(a.task?' · '+esc(a.task.title):'')+(m?' · foco: '+esc(m.n):'')+'</small></div>'+
      '<div class="acts"><button class="btn ghost sm" data-ag="'+i+'">Abrir</button>'+(i!=='gab'?'<button class="btn ghost sm" data-pa="'+i+'">'+(a.paused?'Retomar':'Pausar')+'</button>':'')+'</div></div>';
  }).join('');
  var work=mem.filter(function(i){return i!=='gab'}),allP=work.length&&work.every(function(i){return F.AG[i].paused});
  putSig($('#agentBox'),'<h2>Setor · '+esc(r.name)+'</h2><p class="hint" style="margin:0 0 8px">'+esc(r.sub)+'</p>'+rows+
    (work.length?'<div class="acts" style="margin-top:10px"><button class="btn sm" data-pr="'+selRoom+'">'+(allP?'Retomar o setor':'Pausar o setor')+'</button></div>':''));
}
function setPaused(id,v){var a=F.AG[id];if(!a||id==='gab')return;a.paused=!!v;log(a.name+(v?' foi pausado(a).':' voltou ao trabalho.'),v?'k-red':'k-ok');renderLive();dirty=true}
/* um único ouvinte para o painel (sala ou agente): os botões não são recriados à toa */
$('#agentBox').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  if(b.dataset.ag){select(b.dataset.ag);return}
  if(b.dataset.pa){setPaused(b.dataset.pa,!F.AG[b.dataset.pa].paused);return}
  if(b.dataset.pr){
    var w=Object.keys(F.AG).filter(function(i){return F.AG[i].room===b.dataset.pr&&i!=='gab'}),all=w.every(function(i){return F.AG[i].paused});
    w.forEach(function(i){F.AG[i].paused=!all});log('Setor '+F.R[b.dataset.pr].name+(all?' retomado.':' pausado.'),all?'k-ok':'k-red');renderLive();return;
  }
  var act=b.dataset.ab,a=F.AG[F.sel];if(!act||!a)return;
  if(act==='ctx'){go('agents');var c=document.querySelector('.acard[data-k="'+a.id+'"]');if(c){c.classList.add('hl');c.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(function(){c.classList.remove('hl')},2500)}}
  else if(act==='pause')setPaused(a.id,!a.paused);
  else if(act==='rot')runRoutine(a.id);
  else if(act==='meet'){
    if(a.state==='travado'||a.state==='reuniao'||F.meetingOn){log(a.name+' não pode entrar em reunião agora.');return}
    runMeeting([a.id],'1:1 com '+a.name,'alinhamento rápido; sem pendências novas.');
  }
});
$('#btnPauseAll').addEventListener('click',function(){
  var w=Object.keys(F.AG).filter(function(i){return i!=='gab'&&!F.AG[i].fixed}),all=w.every(function(i){return F.AG[i].paused});
  w.forEach(function(i){F.AG[i].paused=!all});log(all?'Todos os agentes voltaram ao trabalho.':'Todos os agentes do andar foram pausados.',all?'k-ok':'k-red');renderLive();dirty=true;
});

function select(k){
  selRoom=null;F.sel=k||null;
  if(k)renderAgentBox();else putSig($('#agentBox'),AGENT_EMPTY);
  dirty=true;
}
function renderAgentBox(){
  if(inBg)return;
  var a=F.AG[F.sel];if(!a){select(null);return}
  var s=a.id==='gab'?'idle':(a.id===F.RECID?'trabalhando':a.state);
  var h='<h2>'+esc(a.name)+' · '+esc(a.role)+'</h2><span class="chip" style="--c:'+ST[s].c+'">'+ST[s].l+'</span>';
  if(a.id==='gab'){putSig($('#agentBox'),h+'<p class="empty" style="margin-top:10px">Esta é a sua mesa. Os agentes vêm até aqui quando precisam de uma decisão.</p>');return}
  if(a.id!==F.RECID){var x=xpOf(a.id),lv=xpLevel(a.id),nx=xpForLevel(lv+1),pc=Math.round((x.xp-xpForLevel(lv))/Math.max(1,nx-xpForLevel(lv))*100);
    h+=' <span class="chip lvchip">Nível '+lv+' · '+x.xp+' XP</span><div class="xpbar" title="Próximo nível em '+(nx-x.xp)+' XP"><u style="width:'+pc+'%"></u></div>'}
  h+='<div class="kv"><span>Agora</span><span>'+(a.task?esc(a.task.title):(a.id===F.RECID?'Recebendo pedidos':'Sem tarefa no momento'))+'</span>'+
     '<span>Na fila</span><span>'+a.inbox.length+'</span><span>Concluídas</span><span>'+a.done+'</span><span>'+(CFG.real?'Consumo de IA hoje':'Custo simulado hoje')+'</span><span>'+(CFG.real?usoLine(a.id):brl(F.cost[a.id]||0))+'</span></div>';
  h+=a.auto.map(function(r){return '<div class="rule"><i class="'+r[0]+'"></i><span>'+esc(r[1])+'</span></div>'}).join('');
  if(a.lastOut)h+='<div class="out"><b>Última entrega</b>\n'+esc(a.lastOut)+'</div>';
  var lm=(a.task&&a.task.mem)||a.lastMem;
  if(lm&&lm.length)h+='<div class="out"><b>Memória consultada ('+lm.length+')</b>\n'+lm.slice(0,3).map(function(m){return '• '+KINDS[m.kind].l+' ('+esc(nameOf(m.author))+'): '+esc(m.text.slice(0,110))}).join('\n')+'</div>';
  if(a.task&&a.task.thinking)h+='<p class="hint" style="margin:8px 0 0">Pensando na tarefa com o contexto que você definiu…</p>';
  if(a.id===F.REVID&&a.task&&a.task.aiReview==='pending')h+='<p class="hint" style="margin:8px 0 0">Lendo a entrega com IA…</p>';
  /* o progresso muda a cada segundo, mas fica fora da assinatura para não recriar os botões */
  h+='<div class="acts" style="margin-top:10px"><button class="btn ghost sm" data-ab="ctx">Editar contexto</button>'+(a.id!==F.RECID?'<button class="btn ghost sm" data-ab="pause">'+(a.paused?'Retomar':'Pausar')+'</button><button class="btn ghost sm" data-ab="meet">Chamar para reunião</button>'+(a.id!==F.REVID?'<button class="btn ghost sm" data-ab="rot">Rodar rotina</button>':''):'')+'</div>';
  putSig($('#agentBox'),h);
}
function renderOps(){
  if(inBg)return;
  renderMetas();
  var up=Object.keys(F.cost).reduce(function(s,k){return s+F.cost[k]},0);
  put('#kpis',[[F.kpi.done,'Tarefas concluídas'],[F.kpi.approved,'Aprovadas por você'],[F.kpi.rejected,'Devolvidas pela revisão'],[F.kpi.meet,'Reuniões feitas'],['R$ 0,00','Gasto sem autorização'],(CFG.real?[brl(usoFloorBRL(F.FMETA.id)),'Custo de IA hoje (estimado)']:[brl(up),'Custo de API simulado'])].map(function(p){
    return '<div class="kpi"><strong>'+p[0]+'</strong><span>'+p[1]+'</span></div>'}).join(''));
  var cols=[['fila','P · Planejar (fila)'],['trabalhando','D · Executar'],['revisão','C · Verificar (revisão)'],['aprovação','A · Agir (aguarda você)'],['concluída','Concluídas']];
  put('#board',cols.map(function(c){
    var list=F.tasks.filter(function(t){return t.state===c[0]});if(c[0]==='concluída')list=list.slice(-6);
    return '<div class="col"><h3>'+c[1]+' ('+list.length+')</h3>'+list.map(function(t){return '<div class="tk">'+esc(t.title)+'<small>'+esc(F.AG[t.agent].name)+'</small></div>'}).join('')+'</div>';
  }).join(''));
}
function renderCards(){
  $('#agentCards').innerHTML=F.ORDER.map(function(k){var a=F.AG[k],c=CFG.agents[k];
    return '<div class="card acard" data-k="'+k+'"><h3>'+esc(a.name)+(xpLevel(k)>1?' <span class="chip lvchip">Nv '+xpLevel(k)+'</span>':'')+'</h3><div class="role">'+esc(a.role)+'</div>'+
      '<label for="ctx_'+k+'">Contexto de trabalho e funções</label>'+
      '<textarea id="ctx_'+k+'" rows="11" maxlength="3000">'+esc(c.ctx)+'</textarea>'+
      '<label for="lv_'+k+'">Nível de autonomia</label>'+
      '<select id="lv_'+k+'">'+Object.keys(LV).map(function(l){return '<option value="'+l+'"'+(c.level===l?' selected':'')+'>'+LV[l].l+'</option>'}).join('')+'</select>'+
      '<p class="hint" style="margin:6px 0 8px">'+LV[c.level].h+'</p>'+
      a.auto.map(function(r){return '<div class="rule"><i class="'+r[0]+'"></i><span>'+esc(r[1])+'</span></div>'}).join('')+
      '<div class="acts" style="margin-top:12px"><button class="btn sm" data-a="save">Salvar</button><button class="btn ghost sm" data-a="reset">Restaurar padrão</button>'+(k!==F.RECID&&k!==F.REVID?'<button class="btn ghost sm" data-a="routine">Rodar rotina agora</button>':'')+'<span class="saved" aria-live="polite"></span></div></div>'}).join('');
}
$('#agentCards').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  var card=b.closest('.acard'),k=card.dataset.k,act=b.dataset.a;
  if(act==='save'){
    CFG.agents[k].ctx=card.querySelector('textarea').value.trim()||DEFCTX[k];CFG.agents[k].custom=CFG.agents[k].ctx!==DEFCTX[k];
    CFG.agents[k].level=card.querySelector('select').value;
    saveCfg();card.querySelector('.saved').textContent='Salvo. Vale a partir da próxima tarefa.';
    card.querySelector('.hint').textContent=LV[CFG.agents[k].level].h;
    log('Você atualizou o contexto de trabalho de '+F.AG[k].name+' (nível '+LV[CFG.agents[k].level].l.toLowerCase()+').','k-meet');
  }else if(act==='reset'){
    CFG.agents[k]={ctx:DEFCTX[k],level:defaultLevel(k)};saveCfg();renderCards();
    var c2=document.querySelector('.acard[data-k="'+k+'"] .saved');if(c2)c2.textContent='Padrão restaurado.';
  }else if(act==='routine')runRoutine(k);
});
$('#agentCards').addEventListener('change',function(e){
  var s=e.target.closest('select');if(!s)return;var card=s.closest('.acard');card.querySelector('.hint').textContent=LV[s.value].h;card.querySelector('.saved').textContent='Falta salvar.';
});
$('#agentCards').addEventListener('input',function(e){if(e.target.tagName==='TEXTAREA'){var sv=e.target.closest('.acard').querySelector('.saved');sv.textContent='Falta salvar.'}});

function runRoutine(k){
  var a=F.AG[k];
  if(k===F.RECID||k===F.REVID){log(a.name+' não tem rotina própria: '+(k===F.RECID?'encaminha os seus pedidos.':'revisa o que chega dos outros.'));return}
  if(CFG.real&&CAP.sample){var t='Rotina: executar suas funções conforme o contexto de trabalho';newTask(k,{t:t,rv:1},t)}
  else newTask(k,pick(F.TPL[k]));
  log('Você pediu a rotina de '+a.name+'.');
}
