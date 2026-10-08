/* =====================================================================
   SIMULAÇÃO: movimento, tarefas, revisão, aprovações, reuniões, ciclo
   ===================================================================== */
/* ---------- movimento ---------- */
var SPEED=2.7,HALLJ=[LANEL,HL];
function buildPath(a,room,pt){
  var p=[];
  if(a.loc===room&&room!=='hall'){p.push(pt);return p}
  if(a.loc==='hall'){p.push(HALLJ)}
  else{var r=F.R[a.loc];p.push(r.inner,r.out,r.junc)}
  if(room==='hall'){p.push(pt)}
  else{var q=F.R[room];p.push(q.junc,q.out,q.inner,pt)}
  return p;
}
function moveTo(a,room,pt,cb){
  if(a.fixed)return;
  if(a.walking){a.pending={room:room,pt:pt,cb:cb};return}
  a.path=buildPath(a,room,pt);a.dest=room;a.cb=cb||null;a.walking=true;
}
function arrive(a){
  a.walking=false;a.loc=a.dest;
  var cb=a.cb;a.cb=null;
  if(a.pending){var p=a.pending;a.pending=null;moveTo(a,p.room,p.pt,p.cb);return}
  if(cb)cb();
}
function stepAgents(dt){
  var moved=false;
  Object.keys(F.AG).forEach(function(k){
    var a=F.AG[k];if(!a.walking||!a.path.length)return;
    moved=true;
    var tg=a.path[0],dx=tg[0]-a.x,dy=tg[1]-a.y,d=Math.sqrt(dx*dx+dy*dy),st=SPEED*dt;
    if(st>=d){a.x=tg[0];a.y=tg[1];a.path.shift();if(!a.path.length)arrive(a)}
    else{a.x+=dx/d*st;a.y+=dy/d*st}
  });
  return moved;
}
function home(a,cb){moveTo(a,a.room,a.spot,cb)}
function isSeated(a){
  if(a.walking||a.fixed)return false;
  if(a.loc==='reu')return true;
  return a.loc===a.room&&a.room!=='hall';
}

/* ---------- estado e diário ---------- */
function setState(a,s){if(a.state==='reuniao')a.prevState=s;else a.state=s}
/* o diário do andar também vira o "jornal" persistido (resumo de ausência e linha do tempo) */
function log(txt,kind){
  var e={t:hhmm(),ts:Date.now(),x:txt,k:kind||''};
  F.logs.unshift(e);if(F.logs.length>60)F.logs.pop();
  F.journal.push(e);if(F.journal.length>400)F.journal.splice(0,F.journal.length-400);
  journalSave();renderLog();
}

/* ---------- dados da empresa nos textos ({{variavel}}) ---------- */
function fillData(s){
  if(typeof s!=='string'||s.indexOf('{{')<0)return s;
  var v=(companyData(F.id).vars)||{};
  return s.replace(/\{\{(\w+)\}\}/g,function(m,k){return v[k]!=null&&v[k]!==''?String(v[k]):'[sem dado: '+k+']'});
}

/* ---------- tarefas ---------- */
function newTask(agent,tpl,custom){
  var t={id:F.nid++,agent:agent,title:custom||tpl.t,tpl:tpl,state:'fila'};
  F.tasks.push(t);if(F.tasks.length>60)F.tasks.shift();
  var a=F.AG[agent];if(custom)a.inbox.unshift(t);else a.inbox.push(t);
  return t;
}
function startTask(a,t){a.task=t;t.state='trabalhando';a.state='trabalhando';a.progress=0;a.dur=rnd(9,15);consult(a,t);a.lastMem=t.mem;if(CFG.real&&CAP.sample&&CFG.agents[a.id])realStart(a,t)}
function normRes(r){
  r=r&&typeof r==='object'?r:{};
  var nv=String(r.nivel||'verde').toLowerCase();if(nv!=='amarelo'&&nv!=='vermelho')nv='verde';
  return {entrega:String(r.entrega||'').slice(0,2500),tipo:String(r.tipo||'').slice(0,80),resumo:String(r.resumo||'').slice(0,240),impacto:String(r.impacto||'').slice(0,240),depois:String(r.depois||'').slice(0,240),checagem:Array.isArray(r.checagem)?r.checagem.map(function(x){return String(x).slice(0,140)}):[],precisa_de_voce:!!r.precisa_de_voce||nv==='vermelho',nivel:nv,pergunta:String(r.pergunta||'').slice(0,300),aprendizado:String(r.aprendizado||'').slice(0,300),pdca:normPdca(r.pdca)};
}
function errCopy(e){
  var c=e&&e.code;
  return {not_granted:'permissão negada',rate_limited:'muitas chamadas, aguarde um pouco',cancelled:'cancelado',invalid_json:'resposta fora do formato'}[c]||(c||'erro inesperado');
}
var RULES_FIXED='REGRAS FIXAS: nunca prometa ganho ou retorno financeiro; inclua aviso de risco quando falar de trading; nunca gaste verba, mexa em conta de trading, envie documento oficial ou pague sem aprovação do Gabriel (isso é sempre nível vermelho). Respeite a LGPD: use dados agregados e não cite nome, telefone ou e-mail de clientes.';
function realStart(a,t){
  var c=CFG.agents[a.id],lv=LV[c.level]||LV.equilibrado,facts=companyData(F.id).facts||'';
  t.thinking=true;
  var PP=['Você é '+a.name+', agente de IA ('+a.role+') da '+F.FMETA.empresaLong+', trabalhando para o sócio Gabriel.',
    'CONTEXTO DE TRABALHO E FUNÇÕES (definido pelo Gabriel):\n'+fillData(c.ctx),
    'MEMÓRIA DO TIME (lições reais anteriores, de você e dos colegas; reaproveite o que deu certo e NUNCA repita o que está em EVITAR ou foi recusado):\n'+memText(t.mem||[]),
    'METAS ATUAIS DA EMPRESA: '+metSnapshot()+'. Você trabalha em equipe por um resultado coletivo: prefira ações que aproximem essas metas.',
    'MÉTODO DE GESTÃO (obrigatório em toda entrega):\n'+methodText(),
    'NÍVEL DE AUTONOMIA: '+lv.l+' — '+lv.d+'.',
    RULES_FIXED,
    'TAREFA: '+t.title,
    'Execute a tarefa produzindo a entrega (rascunho, relatório ou resposta) em português do Brasil. A entrega deve ser o conteúdo final completo (o texto exato que seria publicado ou enviado), não um resumo. Se faltar informação essencial ou a ação for sensível, peça ao Gabriel.',
    'Responda SOMENTE com JSON: {"tipo":"o que é a entrega (ex.: Legenda de Instagram, Mensagem ao lead, Relatório)","entrega":"o conteúdo COMPLETO e final, exatamente o que seria publicado ou enviado, não um resumo (até 1800 caracteres)","resumo":"uma linha: o que é e por que está sendo entregue","impacto":"efeito esperado nas metas, em uma linha","depois":"o que acontece se o Gabriel aprovar, em uma linha","checagem":["3 itens que você verificou antes de entregar"],"precisa_de_voce":true ou false,"nivel":"verde, amarelo ou vermelho","pergunta":"o que precisa que o Gabriel decida ou informe (vazio se nada)","aprendizado":"uma lição curta e nova para a memória do time (vazio se não houver)","pdca":{"plan":{"objetivo":"objetivo ligado a uma meta","indicador":"indicador","meta":"valor da meta","hipotese":"hipótese","causa_raiz":"causa raiz (5 Porquês ou Ishikawa), se houver problema","w5h2":["O quê: ...","Por quê: ...","Quem: ...","Onde: ...","Quando: ...","Como: ...","Quanto: ..."]},"do":"o que será executado, em escala piloto","check":{"como":"como medir com dado real","quando":"quando medir","criterio":"critério de sucesso numérico"},"act":{"se_sucesso":"o que padronizar","se_falha":"o que ajustar"},"ferramentas":["PDCA","5W2H"]}}',
    facts?'DADOS REAIS DA EMPRESA (informados pelo Gabriel, use para embasar a entrega):\n'+facts:''];
  /* parte fixa primeiro (cacheável na API), parte que muda por último */
  var order=[0,1,4,5,6,8,9,10,2,3,7];
  var prompt=order.map(function(i){return PP[i]}).filter(Boolean).join('\n\n');
  var fixC=[0,1,4,5,6,8,9,10].map(function(i){return PP[i]?PP[i].length+2:0}).reduce(function(x,y){return x+y},0);
  aiJson(a.id,'tarefa',prompt,{cache:false},fixC).then(bindF(function(r){t.result=normRes(r);t.output=t.result.entrega;if(t.result.aprendizado)addMem({kind:'insight',scope:'time',author:a.id,text:t.result.aprendizado,tags:t.tags||tagsOf(a.id,t.title),w:3})}))
  .catch(bindF(function(e){t.result={entrega:'',precisa_de_voce:true,nivel:'amarelo',pergunta:'Não consegui executar "'+t.title+'" ('+errCopy(e)+'). Quer que eu tente de novo?'};t.output=''}))
  .then(bindF(function(){t.thinking=false;renderLive()}));
}
function finishWork(a){
  var t=a.task;
  if(t.tpl.rv){
    t.state='revisão';F.reviewQ.push(t);a.task=null;a.state='esperando';
    log(a.name+' entregou "'+t.title+'" para a revisão de '+F.AG[F.REVID].name+'.');
    var r=F.R.rev;
    a.carry=true;
    moveTo(a,'rev',[r.x+1.4+Math.random()*1.6,r.y+2.9+Math.random()*.6],function(){a.carry=false;later(function(){home(a)},1200)});
  }else complete(a,t,true);
}
function complete(a,t,byWorker){
  if(t.output)a.lastOut=t.output;
  t.state='concluída';F.kpi.done++;a.done++;maybeInsight(a);addXP(a.id,10);
  if(byWorker){a.task=null;setState(a,'idle')}
  F.barsData.push(Math.round(rnd(30,90)));F.barsData.shift();F.bars=F.barsData.slice();
  log(a.name+' concluiu "'+t.title+'".','k-ok');
}

/* ---------- revisão: a Íris lê o texto de verdade quando há entrega da IA ---------- */
function needsAiReview(t){return !!(CFG.real&&CAP.sample&&t&&t.result&&t.result.entrega)}
function aiReview(t){
  var ir=F.AG[F.REVID],a=F.AG[t.agent];
  var regras=F.MEM.filter(function(m){return m.kind==='regra'||(m.kind==='evitar'&&m.scope==='time')}).sort(function(x,y){return memScore(y)-memScore(x)}).slice(0,10);
  var crit=F.REJ_ITEMS.filter(function(r){return r.ag.indexOf(a.id)>=0}).map(function(r){return '- '+r.t+' → '+r.lesson});
  var p=['Você é '+ir.name+', '+ir.role+' da '+F.FMETA.empresaLong+'. Você é o portão de qualidade antes de qualquer entrega chegar ao Gabriel.',
    'CONTEXTO DA SUA FUNÇÃO:\n'+fillData((CFG.agents[ir.id]||{}).ctx||DEFCTX[ir.id]||''),
    RULES_FIXED,
    'REGRAS E LIÇÕES DO TIME:\n'+memText(regras),
    crit.length?'MOTIVOS DE DEVOLUÇÃO CONHECIDOS PARA '+a.name.toUpperCase()+':\n'+crit.join('\n'):'',
    'ENTREGA DE '+a.name+' ('+a.role+') para a tarefa "'+t.title+'":\n"""\n'+t.result.entrega+'\n"""',
    'Leia a entrega inteira. Aprove só se ela respeitar todas as regras. Se reprovar, cite o trecho exato e o motivo. Responda SOMENTE com JSON: {"aprovado":true ou false,"motivo":"motivo curto da devolução (vazio se aprovado)","trecho":"trecho exato com problema (vazio se aprovado)","licao":"lição curta para a memória do time, para não repetir o erro (vazio se aprovado)"}'
  ].filter(Boolean).join('\n\n');
  t.aiReview='pending';
  aiJson(ir.id,'revisao',p,{cache:false},0).then(bindF(function(r){
    r=r&&typeof r==='object'?r:{};
    t.aiReview={aprovado:r.aprovado!==false,motivo:String(r.motivo||'').slice(0,200),trecho:String(r.trecho||'').slice(0,200),licao:String(r.licao||'').slice(0,300)};
  })).catch(bindF(function(e){
    t.aiReview={erro:errCopy(e)};
    log(ir.name+' não conseguiu revisar com IA ('+errCopy(e)+'): segue a revisão simulada.','k-red');
  }));
}
function reviewDone(){
  var ir=F.AG[F.REVID],t=ir.task;ir.task=null;setState(ir,'idle');
  var a=F.AG[t.agent],rv=t.aiReview&&t.aiReview!=='pending'&&!t.aiReview.erro?t.aiReview:null;
  var rejected,it=null;
  if(rv){
    rejected=!rv.aprovado;
    if(rejected)it={k:'ia',t:rv.motivo||'problema apontado na revisão',lesson:rv.licao||('Evitar: '+(rv.motivo||'o problema apontado pela revisão'))};
  }else{
    /* revisão simulada: só usa motivos de devolução do próprio andar e do próprio agente */
    var APPL=F.REJ_ITEMS.filter(function(r){return r.ag.indexOf(a.id)>=0});
    if(APPL.length){
      var learned=APPL.filter(function(r){return F.MEM.some(function(m){return m.kind==='evitar'&&m.rk===r.k})});
      var unl=APPL.filter(function(r){return learned.indexOf(r)<0});
      var pRej=Math.max(.06,.4*(1-.85*learned.length/APPL.length));
      rejected=Math.random()<pRej;
      if(rejected)it=pick(unl.length?unl:APPL);
    }else rejected=false;
  }
  t.aiReview=null;t.reviewedBy=rv?'ia':'sim';
  F.STATS.rejHist.push(rejected?1:0);if(F.STATS.rejHist.length>60)F.STATS.rejHist.shift();
  if(rejected){
    F.kpi.rejected++;t.state='trabalhando';t.rework=it.t;addXP(a.id,-5);
    addMem({kind:'evitar',scope:'time',author:F.REVID,rk:it.k==='ia'?undefined:it.k,w:3,text:it.lesson+' (devolvido em "'+t.title+'")',tags:(t.tags||tagsOf(a.id,t.title)).concat(['compliance'])});
    log(F.AG[F.REVID].name+' devolveu "'+t.title+'": '+it.t+(rv&&rv.trecho?' (trecho: "'+rv.trecho+'")':'')+'. Lição salva na memória do time.','k-red');
    a.task=t;setState(a,'trabalhando');a.progress=45;a.dur=8;
    /* com IA real, o agente refaz de verdade levando o motivo da devolução */
    if(rv&&CFG.real&&CAP.sample){t.result=null;t.output='';t.title=t.title.replace(/ \(refazer\)$/,'')+' (refazer)';t.mem=(t.mem||[]);realStart(a,t)}
    if(!a.walking)home(a);
    return;
  }
  log(F.AG[F.REVID].name+(rv?' leu a entrega e aprovou "':' aprovou "')+t.title+'".');
  var ap=t.tpl.ap,lv=(CFG.agents[a.id]||{}).level||'equilibrado',res=t.result;
  if(res&&res.precisa_de_voce)ap={k:res.nivel==='vermelho'?'vermelho':'amarelo',title:res.pergunta||('Aprovar: '+t.title),d:res.resumo||(res.entrega?res.entrega.slice(0,160)+'…':'Entrega pronta.'),exec:ap&&ap.exec};
  else if(res&&!ap&&lv==='supervisionado')ap={k:'amarelo',title:'Revisar entrega: '+t.title,d:res.resumo||(res.entrega?res.entrega.slice(0,160)+'…':'Entrega pronta.')};
  else if(!res&&!ap&&lv==='supervisionado'&&t.tpl.rv)ap={k:'amarelo',title:'Revisar entrega: '+t.title,d:'Entrega pronta para sua revisão.'};
  else if(res&&ap&&!res.precisa_de_voce)ap=null;
  if(ap&&ap.k==='amarelo'&&lv==='autonomo'&&!(res&&res.precisa_de_voce&&res.nivel==='vermelho')){
    log(a.name+' executou sozinho (autonomia alta): '+fillData(ap.title)+'.','k-ok');
    notifyRaw(tgp()+'FYI: executou sozinho',a.name+' ('+a.role+') executou: '+fillData(ap.title)+'\n\n'+fillData(ap.d||'')+'\n\nNada a fazer, é só para você saber.','fyi'+t.id,a.name,{aid:a.id,lvl:'fyi',short:fillData(ap.title)});
    complete(a,t,false);a.task=null;setState(a,'idle');scheduleOutcome(a,t);
  }
  else if(ap)makeApproval(a,t,ap);
  else{complete(a,t,false);a.task=null;setState(a,'idle')}
}

/* ---------- aprovações ---------- */
function freeSlot(){var i=0;while(F.slots[i])i++;F.slots[i]=1;return i}
function slotPt(i){return [7.3,1.1+i*.85]}
function makeApproval(a,t,ap){
  var s=freeSlot();
  var o={id:F.aid++,key:F.id+':'+Date.now().toString(36)+':'+Math.random().toString(36).slice(2,6),ts:Date.now(),agent:a.id,task:t,kind:ap.k,
    title:fillData(ap.title),d:fillData(ap.d),slot:s,opts:ap.opts?ap.opts.map(fillData):null,reco:ap.reco?fillData(ap.reco):null,meet:ap.meet||null,exec:ap.exec||null,
    view:ap.k==='reuniao'?null:buildView(a,t,ap)};
  F.approvals.push(o);if(t){t.state='aprovação';if(t.output)a.lastOut=t.output}
  a.task=t||null;setState(a,'esperando');a.attn=true;a.carry=!!t;
  moveTo(a,'hall',slotPt(s));
  log(a.name+' foi até a sua sala: '+o.title+'.','k-meet');
  renderApprovals();
  notifyApproval(o);
  saveApprovals();
  if(!inBg)playSound('ping');
}
function closeApproval(o){
  F.approvals=F.approvals.filter(function(x){return x!==o});F.slots[o.slot]=0;
  var a=F.AG[o.agent];a.attn=false;a.carry=false;a.task=null;setState(a,'idle');home(a);
  renderApprovals();saveApprovals();
}

/* ---------- reuniões ---------- */
function runMeeting(ids,pauta,ata){
  var ps=ids.map(function(i){return F.AG[i]}).filter(function(a){return a&&a.state!=='travado'&&a.state!=='reuniao'});
  ps.push(F.AG.gab);
  F.meetingOn=true;F.kpi.meet++;
  log('Reunião iniciada: '+pauta+'. Participantes: '+ps.map(function(a){return a.name}).join(', ')+'.','k-meet');
  ps.forEach(function(a,i){
    a.prevState=a.state;if(a.id!=='gab')a.state='reuniao';
    var s=F.SEATS[i%F.SEATS.length];moveTo(a,'reu',[s[0],s[1]]);
  });
  if(!inBg)focusRoom('reu');
  later(function(){
    log('Ata · '+pauta+': '+ata,'k-meet');
    ps.forEach(function(a){home(a,function(){if(a.id!=='gab')a.state=a.prevState||'idle'})});
    F.meetingOn=false;
  },10000);
}

/* ---------- decisões ---------- */
function decide(id,act,extra,remote){
  var o=F.approvals.filter(function(x){return x.id==id})[0];if(!o)return;
  var a=F.AG[o.agent],t=o.task,via=remote?' (decidido '+remote+')':'';
  if(!remote)recordDecision(o,act,extra);
  if(o.kind==='reuniao'){
    var m=o.meet,mt=m.title.split(' · ')[1]||m.title;
    if(act==='A'||act==='B'){
      closeApproval(o);F.meetAt=F.now+rnd(80,120);
      addMem({kind:'decisao',scope:'time',author:'gab',w:4,text:'Decisão em reunião ('+mt+'): '+o.opts[act==='A'?0:1].replace(/^[AB] · /,'')+'. Contexto: '+o.d,tags:tagsOf(a.id,o.d)});
      runMeeting(m.part,mt+' · decisão '+act+via,'seguimos com a opção '+act+'. '+a.name+' executa e reporta no diário.');
    }else if(act==='agendar'){
      closeApproval(o);F.meetAt=F.now+rnd(80,120);
      log('Convite enviado ao Google Calendar para amanhã às 10h: '+mt+'. (simulado)'+via,'k-meet');
    }else{closeApproval(o);F.meetAt=F.now+rnd(80,120);log('Você recusou a reunião de '+a.name+via+'. Segue com a rotina.')}
    return;
  }
  var tg=(t&&t.tags)||tagsOf(a.id,o.title);
  if(act==='ok'){
    if(t){t.state='concluída';F.kpi.done++;a.done++;F.kpi.approved++}
    addXP(a.id,15);
    log('Você aprovou: '+o.title+via+'.','k-ok');
    addMem({kind:'repetir',scope:a.id,author:'gab',w:3,text:'Gabriel aprovou "'+o.title+'". Manter esse formato e tom.',tags:tg});
    if(t)scheduleOutcome(a,t);
    if(o.exec)runAction(o);
    closeApproval(o);
  }else if(act==='no'){
    if(t)t.state='descartada';
    var why=(extra||'').trim();
    log('Você recusou: '+o.title+(why?' ('+why+')':'')+via+'. O time vai lembrar.','k-red');
    addMem({kind:'evitar',scope:'time',author:'gab',w:4,tk:t&&t.tpl&&t.tpl.t,text:'Gabriel recusou "'+o.title+'"'+(why?'. Motivo: '+why:'.')+' Não propor de novo sem mudar a abordagem.',tags:tg});
    closeApproval(o);
  }else if(act==='adj'){
    log('Você pediu ajuste em "'+o.title+'": '+extra+via+'. '+a.name+' refaz.','k-meet');
    addMem({kind:'preferencia',scope:'time',author:'gab',w:4,text:'Preferência do Gabriel sobre "'+o.title+'": '+extra,tags:tg});
    var tk=t;closeApproval(o);
    if(tk){a.task=tk;tk.state='trabalhando';a.state='trabalhando';a.progress=30;a.dur=8;if(CFG.real&&CAP.sample&&tk.result){tk.result=null;tk.output='';tk.mem=recall(a.id,tk.tags||[],6);realStart(a,tk)}}
  }
}

/* ---------- ciclo (1 s) ---------- */
function showAlert(){
  $('#hudAlert b').textContent=F.STK.title;$('#hudAlert span').textContent=F.STK.desc;
  $('#hudAlert').hidden=false;$('#tabConn').classList.add('warn');renderConns();
}
function tick(){
  F.now++;
  if(F.now>=F.spawnAt&&!CFG.real){
    F.spawnAt=F.now+Math.round(rnd(6,10));
    var cand=F.WORKERS.filter(function(k){return !F.AG[k].paused&&F.AG[k].inbox.length<2&&!(k===F.STK.id&&F.AG[F.STK.id].state==='travado')});
    if(cand.length){spawnTask(pick(cand))}
  }
  F.WORKERS.forEach(function(k){
    var a=F.AG[k];
    if(a.paused)return;
    if(a.state==='idle'&&a.inbox.length&&!a.attn)startTask(a,a.inbox.shift());
    if(a.state==='trabalhando'&&a.task){
      if(a.task.thinking){a.progress=Math.min(92,a.progress+100/a.dur)}
      else{a.progress+=100/a.dur;if(!a.task.result&&!CFG.real)F.cost[k]+=rnd(.02,.05);if(a.progress>=100){a.progress=100;finishWork(a)}}
    }
  });
  var ir=F.AG[F.REVID];
  if(ir.state==='idle'&&F.reviewQ.length&&!ir.walking){var t=F.reviewQ.shift();ir.task=t;ir.state='revisando';ir.progress=0;ir.dur=5}
  if(ir.state==='revisando'&&ir.task){
    var rt=ir.task;
    if(rt.aiReview==='pending')ir.progress=Math.min(95,ir.progress+100/ir.dur);
    else{
      ir.progress+=100/ir.dur;if(!CFG.real)F.cost[F.REVID]+=rnd(.02,.04);
      if(ir.progress>=100){if(needsAiReview(rt)&&!rt.aiReview)aiReview(rt);else reviewDone()}
    }
  }
  if(F.now>=F.stuckAt&&F.AG[F.STK.id].state==='trabalhando'){
    var sa=F.AG[F.STK.id];sa.state='travado';sa.attn=true;F.stuckAt=1e9;F.connState[F.STK.conn]='expirado';
    if(!inBg){showAlert();playSound('alert')}
    log(F.STK.log,'k-red');
    addMem({kind:'evitar',scope:'time',author:F.STK.id,w:3,text:F.STK.mem,tags:F.STK.tags});
    notifyRaw(tgp()+F.STK.subject,F.STK.body,'stuck'+F.now,F.AG[F.STK.id].name,{aid:F.STK.id,lvl:'travado',short:F.STK.desc});
  }
  if(F.now>=F.meetAt&&!F.meetingOn&&F.MEET.length&&!F.approvals.some(function(o){return o.kind==='reuniao'})){
    var m=F.MEET[F.meetIdx%F.MEET.length],pa=F.AG[m.who];
    if(pa.state==='idle'&&!pa.walking){F.meetIdx++;makeApproval(pa,null,{k:'reuniao',title:m.title,d:m.d,opts:m.opts,reco:m.reco,meet:m})}
  }
  if(F.now%30===0)runDueChecks();
  renderLive();
}
