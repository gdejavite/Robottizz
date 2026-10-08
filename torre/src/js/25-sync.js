/* =====================================================================
   APROVAÇÕES PERSISTENTES E COMPARTILHADAS ENTRE APARELHOS
   As pendências ficam salvas (neste aparelho e na sua conta). Decidir num
   aparelho grava a decisão; os outros aparelhos abertos aplicam em até 20 s.
   Cada aparelho roda a própria simulação: o que é compartilhado são as
   pendências e as decisões, não o movimento dos agentes.
   ===================================================================== */
var STATE_KEY='torre_estado_v1',stateT=null,DECIDED={},POLL_MS=20000;
function serApproval(o,Fl){
  var t=o.task,v=o.view?clone(o.view):null;
  if(v)v.mem=(v.mem||[]).map(function(m){return {kind:m.kind,author:m.author,text:String(m.text).slice(0,200)}});
  return {key:o.key,fid:Fl.id,ts:o.ts,agent:o.agent,kind:o.kind,title:o.title,d:o.d,opts:o.opts,reco:o.reco,meet:o.meet,exec:o.exec,view:v,
    task:t?{title:t.title,tplT:t.tpl&&t.tpl.t,rv:t.tpl&&t.tpl.rv,result:t.result||null,output:t.output||'',tags:t.tags||[]}:null};
}
function statePayload(){
  var pend={};
  FLOORIDS.forEach(function(id){var Fl=FLOORS[id];Fl.approvals.forEach(function(o){if(o.key)pend[o.key]=serApproval(o,Fl)})});
  var dk=Object.keys(DECIDED).sort(function(a,b){return DECIDED[b].ts-DECIDED[a].ts}).slice(0,200),dec={};dk.forEach(function(k){dec[k]=DECIDED[k]});
  return {pend:pend,decided:dec,upd:Date.now()};
}
function saveApprovals(){
  clearTimeout(stateT);
  stateT=setTimeout(async function(){
    var local=statePayload();lsSet(STATE_KEY,JSON.stringify(local));
    if(!CAP.state)return;
    try{
      /* mescla com o que outro aparelho já gravou (mantém pendências dele que ainda não foram decididas) */
      var snap=await CAP.state.get(),rem=snap.exists?snap.data():{},pend=local.pend;
      Object.keys(rem.pend||{}).forEach(function(k){if(!pend[k]&&!DECIDED[k]&&!(rem.decided||{})[k]&&!isLocalKey(k))pend[k]=rem.pend[k]});
      var dec=mergeDecided(rem.decided||{});
      await CAP.state.set({pend:pend,decided:dec,upd:Date.now()});
    }catch(e){}
  },800);
}
function mergeDecided(rem){Object.keys(rem).forEach(function(k){if(!DECIDED[k])DECIDED[k]=rem[k]});var o={};Object.keys(DECIDED).sort(function(a,b){return DECIDED[b].ts-DECIDED[a].ts}).slice(0,200).forEach(function(k){o[k]=DECIDED[k]});return o}
function isLocalKey(k){return FLOORIDS.some(function(id){return FLOORS[id].approvals.some(function(o){return o.key===k})})}
function findApproval(key){
  for(var i=0;i<FLOORIDS.length;i++){var Fl=FLOORS[FLOORIDS[i]],o=Fl.approvals.filter(function(x){return x.key===key})[0];if(o)return {Fl:Fl,o:o}}
  return null;
}
/* toda decisão passa por aqui para virar "decidida" para os outros aparelhos */
function recordDecision(o,act,extra){if(o&&o.key){DECIDED[o.key]={act:act,extra:extra||'',ts:Date.now()};saveApprovals()}}
/* recria no andar uma pendência salva (o agente volta para a sua sala esperando) */
function reviveApproval(s){
  var Fl=FLOORS[s.fid];if(!Fl||!Fl.AG[s.agent]||findApproval(s.key))return;
  inFloor(Fl,function(){
    var a=F.AG[s.agent],t=null;
    if(s.task){
      var tpl=(F.TPL[s.agent]||[]).filter(function(x){return x.t===s.task.tplT})[0]||{t:s.task.tplT||s.task.title,rv:s.task.rv};
      t={id:F.nid++,agent:s.agent,title:s.task.title,tpl:tpl,state:'aprovação',result:s.task.result,output:s.task.output,tags:s.task.tags,mem:[]};
      F.tasks.push(t);
    }
    var slot=freeSlot();
    var o={id:F.aid++,key:s.key,ts:s.ts,agent:s.agent,task:t,kind:s.kind,title:s.title,d:s.d,slot:slot,opts:s.opts,reco:s.reco,meet:s.meet,exec:s.exec,view:s.view,restored:true};
    F.approvals.push(o);
    a.task=t;a.state='esperando';a.attn=true;a.carry=!!t;
    var p=slotPt(slot);a.x=p[0];a.y=p[1];a.loc='hall';a.walking=false;a.path=[];
    renderApprovals();
  });
}
function applyState(st){
  if(!st)return 0;
  Object.keys(st.decided||{}).forEach(function(k){if(!DECIDED[k])DECIDED[k]=st.decided[k]});
  var n=0;
  Object.keys(st.pend||{}).forEach(function(k){if(!DECIDED[k]){var before=findApproval(k);reviveApproval(st.pend[k]);if(!before&&findApproval(k))n++}});
  return n;
}
function restoreApprovalsLocal(){try{var n=applyState(JSON.parse(lsGet(STATE_KEY,'null')));if(n)inFloor(VIEW,function(){log(n+' pendência(s) da última visita restaurada(s).','k-meet')})}catch(e){}}
async function restoreApprovals(){
  var st=null;
  if(CAP.state){try{var s=await CAP.state.get();if(s.exists)st=s.data()}catch(e){}}
  if(!st){restoreApprovalsLocal();return}
  var n=applyState(st);
  if(n)inFloor(VIEW,function(){log(n+' pendência(s) restaurada(s) da sua conta.','k-meet')});
}
/* outro aparelho decidiu? aplica aqui também */
async function pollState(){
  if(!CAP.state)return;
  try{
    var s=await CAP.state.get();if(!s.exists)return;var st=s.data();
    Object.keys(st.decided||{}).forEach(function(k){
      var dct=st.decided[k],hit=findApproval(k);
      if(!DECIDED[k])DECIDED[k]=dct;
      if(hit)inFloor(hit.Fl,function(){decide(hit.o.id,dct.act,dct.extra,'em outro aparelho')});
    });
    Object.keys(st.pend||{}).forEach(function(k){if(!DECIDED[k]&&!findApproval(k))reviveApproval(st.pend[k])});
  }catch(e){}
}
function startRemotePolling(){
  setInterval(function(){if(!document.hidden){pollState();pollRemoteDecisions(false)}},POLL_MS);
}
