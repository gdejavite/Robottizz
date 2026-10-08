/* =====================================================================
   INÍCIO: monta os andares registrados (floors/*.js), carrega memória e
   configuração, desenha e liga os ciclos.
   ===================================================================== */
function start(){
  var off=document.createElement('canvas');off.width=off.height=4;
  FLOORDEFS.forEach(function(def){var Fl=createFloor(def);FLOORS[Fl.id]=Fl;FLOORIDS.push(Fl.id)});
  initAgentCfg();loadLocalCfg();
  var first=FLOORIDS.slice().sort(function(a,b){return FLOORS[b].FMETA.andar-FLOORS[a].FMETA.andar})[0];
  F=VIEW=FLOORS[first];inBg=false;
  /* cenário, memória local e sementes de cada andar */
  FLOORIDS.forEach(function(id){
    inFloor(FLOORS[id],function(){
      build(off.getContext('2d'));
      var had=false;try{had=loadMemData(JSON.parse(lsGet(F.FMETA.lsKey,'null')))}catch(e){}
      if(!had||!F.MEM.length)seedFloor();else ensureRules();
      log('Andar '+F.FMETA.andar+' ('+F.FMETA.nome+') aberto. A equipe começa a trabalhar.');
    });
  });
  g=gm0;glowSpr=glowSprite();
  resize();fitAll(false);firstFit=true;
  refreshAll();renderSettings();
  initCaps().catch(function(){CAP.ready=true;renderSettings()});
  setInterval(function(){FLOORIDS.forEach(function(id){inFloor(FLOORS[id],tick)});renderElev();if(onTop)renderTop()},1000);
  requestAnimationFrame(frame);
  if(window.ResizeObserver)new ResizeObserver(function(){resize()}).observe(wrap);
  showDigest(lastInteract);
  window.__torre={FLOORS:FLOORS,CFG:CFG,CAP:CAP,render:STATS_RENDER,get F(){return F},get VIEW(){return VIEW}};
}
if(document.fonts&&document.fonts.load){
  Promise.all([document.fonts.load('800 30px "Bricolage Grotesque"'),document.fonts.load('500 17px Figtree')]).then(start,start);
}else start();
