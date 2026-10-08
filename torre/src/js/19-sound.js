/* =====================================================================
   SONS (opcionais, desligados por padrão): gerados na hora com Web Audio,
   sem arquivos. ding = elevador, alert = agente travado, ping = pendência.
   ===================================================================== */
var audioCtx=null;
function playSound(kind){
  if(!CFG.sound)return;
  try{
    var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    audioCtx=audioCtx||new AC();if(audioCtx.state==='suspended')audioCtx.resume();
    var t0=audioCtx.currentTime;
    var notes={ding:[[880,0,.5],[660,.18,.7]],alert:[[520,0,.12],[390,.16,.12],[520,.32,.12]],ping:[[1040,0,.25]]}[kind]||[];
    notes.forEach(function(n){
      var o=audioCtx.createOscillator(),g2=audioCtx.createGain();
      o.type=kind==='alert'?'triangle':'sine';o.frequency.value=n[0];
      g2.gain.setValueAtTime(0,t0+n[1]);g2.gain.linearRampToValueAtTime(kind==='alert'?.12:.09,t0+n[1]+.02);g2.gain.exponentialRampToValueAtTime(.0001,t0+n[1]+n[2]);
      o.connect(g2);g2.connect(audioCtx.destination);o.start(t0+n[1]);o.stop(t0+n[1]+n[2]+.05);
    });
  }catch(e){}
}
