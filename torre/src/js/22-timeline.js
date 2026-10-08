/* =====================================================================
   LINHA DO TEMPO DO DIA: um controle deslizante percorre o diário de hoje;
   o "Reproduzir" avança sozinho e a câmera vai até o agente citado.
   ===================================================================== */
var TL={on:false,list:[],i:0,timer:null};
function tlEntries(){var d0=new Date();d0.setHours(0,0,0,0);return F.journal.filter(function(e){return e.ts>=d0.getTime()}).slice(-300)}
function tlAgentOf(txt){
  var best=null,pos=1e9;
  Object.keys(F.AG).forEach(function(k){var n=F.AG[k].name,i=txt.indexOf(n);if(i>=0&&i<pos&&k!=='gab'){pos=i;best=k}});
  return best;
}
function tlShow(i){
  if(!TL.list.length)return;
  TL.i=Math.max(0,Math.min(TL.list.length-1,i));
  var e=TL.list[TL.i];
  $('#tlRange').value=TL.i;
  $('#tlInfo').innerHTML='<time>'+hhmm(new Date(e.ts))+'</time> '+esc(e.x)+' <small class="hint">('+(TL.i+1)+'/'+TL.list.length+')</small>';
  var ag=tlAgentOf(e.x);
  if(ag&&$('#v-office').classList.contains('on')){select(ag);focusAgent(ag)}
}
function startTimeline(){
  TL.list=tlEntries();TL.on=true;
  var p=$('#tlPanel');p.hidden=false;
  if(!TL.list.length){$('#tlInfo').textContent='Ainda não há registros hoje neste andar.';$('#tlRange').max=0;return}
  $('#tlRange').max=TL.list.length-1;tlShow(0);
}
function stopTimeline(){
  clearInterval(TL.timer);TL.timer=null;TL.on=false;
  var p=$('#tlPanel');if(p)p.hidden=true;var b=$('#tlPlay');if(b)b.textContent='▶ Reproduzir';
}
function tlPlay(){
  if(TL.timer){clearInterval(TL.timer);TL.timer=null;$('#tlPlay').textContent='▶ Reproduzir';return}
  if(TL.i>=TL.list.length-1)tlShow(0);
  $('#tlPlay').textContent='❚❚ Pausar';
  TL.timer=setInterval(function(){if(TL.i>=TL.list.length-1){tlPlay();return}tlShow(TL.i+1)},1400);
}
$('#btnTimeline').addEventListener('click',function(){if(TL.on)stopTimeline();else startTimeline()});
$('#tlRange').addEventListener('input',function(){tlShow(+this.value)});
$('#tlPlay').addEventListener('click',tlPlay);
$('#tlClose').addEventListener('click',stopTimeline);
