/* =====================================================================
   CAPACIDADES DA PLATAFORMA (IA, banco da conta, conectores) E CONEXÕES
   ===================================================================== */
async function initCaps(){
  var c=window.claude;
  if(!c||!c.use){CAP.ready=true;renderSettings();restoreApprovalsLocal();return}
  var get=function(n){return Promise.resolve().then(function(){return c.use(n)}).catch(function(){return null})};
  var r=await Promise.all([get('sample'),get('db'),get('user'),get('mcp'),get('permissions')]);
  CAP.sample=r[0];CAP.db=r[1];CAP.mcp=r[3];CAP.perms=r[4];
  var uid=null;
  try{if(r[2]&&r[2].id)uid=await r[2].id()}catch(e){}
  CAP.uid=uid;
  if(CAP.db&&uid){
    var base='data/users/'+uid+'/';
    try{
      CAP.doc=CAP.db.doc(base+'torre-config');
      var snap=await CAP.doc.get();
      if(snap.exists){mergeCfg(snap.data());renderCards()}
    }catch(e){CAP.doc=null}
    try{CAP.uso=CAP.db.doc(base+'torre-uso');var us=await CAP.uso.get();if(us.exists)usoMerge(us.data())}catch(e){CAP.uso=null}
    for(var fi=0;fi<FLOORIDS.length;fi++){
      var Fl=FLOORS[FLOORIDS[fi]],fm=Fl.FMETA;
      try{
        var dref=CAP.db.doc(base+fm.docName);CAP.docMs[fm.id]=dref;
        var ms=await dref.get(),remote=ms.exists?ms.data():null;
        inFloor(Fl,function(){
          var loc=0;try{loc=(JSON.parse(lsGet(F.FMETA.lsKey,'{}'))).upd||0}catch(e){}
          if(remote&&remote.upd>loc){loadMemData(remote);ensureRules();renderMemUI();renderMetas()}else saveMem();
        });
      }catch(e){CAP.docMs[fm.id]=null}
    }
    /* aprovações pendentes compartilhadas entre aparelhos */
    try{CAP.state=CAP.db.doc(base+'torre-estado')}catch(e){CAP.state=null}
  }
  await restoreApprovals();
  if(CAP.mcp){try{var lt=await CAP.mcp.listTools();(lt.servers||[]).forEach(function(sv){CAP.mcpInfo[sv.server]=sv.authStatus})}catch(e){}}
  if(!CAP.sample)CFG.real=false;
  USO.ready=true;usoSave();
  CAP.ready=true;renderSettings();
  autoSyncAll();
  startRemotePolling();
}
function renderConns(){
  if(inBg)return;
  put('#conns',F.CONNS.map(function(c){
    var bad=F.connState[c.id]==='expirado';
    return '<div class="conn"><div><b>'+esc(c.n)+'</b><small>'+esc(fillData(c.d))+' · '+(bad?'token expirado':(c.pend?'integração pendente':esc(c.exp||'conectado')))+'</small></div>'+
      '<button class="btn sm '+(bad?'':'ghost')+'" data-c="'+c.id+'">'+(bad?'Reconectar':(c.pend?'Ver status':'Testar'))+'</button></div>'}).join(''));
}
$('#conns').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;var id=b.getAttribute('data-c');
  if(F.connState[id]==='expirado')reconnect();
  else{var cc=F.CONNS.filter(function(c){return c.id===id})[0];log(cc.pend?cc.n+': integração ainda não criada (pendente).':'Teste de conexão: '+cc.n+' respondeu normalmente.')}
});
function reconnect(){
  F.connState[F.STK.conn]='ok';$('#hudAlert').hidden=true;$('#tabConn').classList.remove('warn');_put['#conns']=null;renderConns();
  var al=F.AG[F.STK.id];al.attn=false;
  if(al.state==='travado')al.state=al.task?'trabalhando':'idle';
  F.stuckAt=F.now+Math.round(rnd(70,110));
  log(F.STK.fixLog,'k-ok');
  renderLive();
}
$('#alertBtn').addEventListener('click',reconnect);
