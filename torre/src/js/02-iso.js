/* =====================================================================
   PROJEÇÃO ISOMÉTRICA
   ===================================================================== */
var TW=76,TH=44,ZH=34,A=TW/2,B=TH/2;
var WW=22.8,DD=14;
var OX=DD*A+90,OY=170;
var SW=Math.ceil((WW+DD)*A+180),SH=Math.ceil((WW+DD)*B+OY+110);
var g=null;
function X(x,y){return (x-y)*A+OX}
function Y(x,y,z){return (x+y)*B-(z||0)*ZH+OY}
function hex2(c){return [parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]}
function mix(a,b,t){var p=hex2(a),q=hex2(b);return 'rgb('+p.map(function(v,i){return Math.round(v+(q[i]-v)*t)}).join(',')+')'}
function C(c){return {t:mix(c,'#ffffff',.2),l:c,r:mix(c,'#000000',.3),e:'rgba(255,255,255,.2)'}}
function poly(p,fill,stroke,lw){
  g.beginPath();
  for(var i=0;i<p.length;i++){var q=p[i],px=X(q[0],q[1]),py=Y(q[0],q[1],q[2]);if(i)g.lineTo(px,py);else g.moveTo(px,py)}
  g.closePath();
  if(fill){g.fillStyle=fill;g.fill()}
  if(stroke){g.strokeStyle=stroke;g.lineWidth=lw||1;g.stroke()}
}
function box(x,y,z,w,d,h,c){
  poly([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]],c.l);
  poly([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],c.r);
  poly([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]],c.t,c.e,1);
}
function line3(pts,color,lw){
  g.beginPath();pts.forEach(function(q,i){var px=X(q[0],q[1]),py=Y(q[0],q[1],q[2]||0);if(i)g.lineTo(px,py);else g.moveTo(px,py)});
  g.strokeStyle=color;g.lineWidth=lw;g.lineJoin='round';g.lineCap='round';g.stroke();
}
function rr(x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function rng(s){return function(){s=(s*16807)%2147483647;return (s-1)/2147483646}}

/* sprites pré-renderizados (grupos de mobília) */
function spriteGroup(W,D,H,fn){
  var ax=D*A+8,ay=H*ZH+8,wp=Math.ceil((W+D)*A+16),hp=Math.ceil((W+D)*B+ay+10);
  var c=document.createElement('canvas');c.width=wp*2;c.height=hp*2;
  var k=c.getContext('2d');k.scale(2,2);
  var sg=g,sx=OX,sy=OY;g=k;OX=ax;OY=ay;fn();g=sg;OX=sx;OY=sy;
  return {c:c,ax:ax,ay:ay,wp:wp,hp:hp};
}

