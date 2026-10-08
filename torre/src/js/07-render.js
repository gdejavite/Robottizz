/* =====================================================================
   RENDER
   ===================================================================== */
var cv=$('#cv'),wrap=$('#mapwrap'),gm0=cv.getContext('2d');
var viewW=800,viewH=600,dpr=1,cam={x:SW/2,y:SH/2,z:.5},camT=null,dirty=true,glowSpr=null;

function glowSprite(){
  var c=document.createElement('canvas');c.width=c.height=256;var k=c.getContext('2d');
  var gr=k.createRadialGradient(128,128,0,128,128,128);
  gr.addColorStop(0,'rgba(255,196,110,.55)');gr.addColorStop(.5,'rgba(255,170,70,.18)');gr.addColorStop(1,'rgba(255,160,60,0)');
  k.fillStyle=gr;k.fillRect(0,0,256,256);return c;
}
function drawAgent(a,t){
  g.globalAlpha=a.paused?.5:1;
  var av=F.AVA[a.id]||{hs:'short',sk:'#f2caa6'},sk=av.sk;
  var seat=isSeated(a),x=a.x,y=a.y;
  var fx=X(x,y),fy=Y(x,y,0),by=Y(x,y,seat?.5:0);
  g.fillStyle='rgba(0,0,0,.33)';g.beginPath();g.ellipse(fx,fy,15,7.5,0,0,7);g.fill();
  if(a.state==='trabalhando'||a.state==='revisando'||F.sel===a.id){
    g.strokeStyle=F.sel===a.id?'#ffd37a':ST[a.state].c;g.globalAlpha=F.sel===a.id?.95:.5;g.lineWidth=2;g.beginPath();g.ellipse(fx,fy,19,9.5,0,0,7);g.stroke();g.globalAlpha=1;
  }
  g.save();g.translate(fx,fy);g.scale(1.3,1.3);g.translate(-fx,-fy);
  var work=seat&&(a.state==='trabalhando'||a.state==='revisando');
  var sw=a.walking?Math.sin(t*11+a.ph):0,bob=a.walking?Math.abs(sw)*1.6:0,br=a.walking?0:Math.sin(t*1.8+a.ph)*.4;
  var lg=seat?0:9,top=by-lg-17-bob+br;
  if(!seat){
    g.fillStyle='#243050';g.fillRect(fx-6,by-lg+sw*1.6,5,lg-2);g.fillRect(fx+1,by-lg-sw*1.6,5,lg-2);
    g.fillStyle='#10141f';g.fillRect(fx-6.6,by-2+sw*1.6,6.2,2.4);g.fillRect(fx+.6,by-2-sw*1.6,6.2,2.4);
  }
  var armY=top+5,darkc=mix(a.color,'#000000',.2);
  var arm=function(side,hx,hy){g.strokeStyle=darkc;g.lineWidth=3.6;g.lineCap='round';g.beginPath();g.moveTo(fx+side*8,armY);g.lineTo(hx,hy);g.stroke();g.fillStyle=sk;g.beginPath();g.arc(hx,hy,1.9,0,7);g.fill()};
  var lx,ly,rx,ry;
  if(work){var o1=Math.sin(t*14+a.ph)*1.8,o2=Math.cos(t*13+a.ph)*1.8;lx=fx-5;ly=top+15+o1;rx=fx+5;ry=top+15+o2}
  else if(a.walking){lx=fx-9;ly=top+13+sw*3;rx=fx+9;ry=top+13-sw*3}
  else if(seat){lx=fx-7;ly=top+15;rx=fx+7;ry=top+15}
  else{lx=fx-9;ly=top+14;rx=fx+9;ry=top+14}
  arm(-1,lx,ly);
  var hs=av.hs;
  if(hs==='long'){g.fillStyle=a.hair;rr(fx-7.4,top-10,14.8,17,5);g.fill()}
  else if(hs==='bob'){g.fillStyle=a.hair;rr(fx-7.4,top-10.5,14.8,11,5);g.fill()}
  var bg=g.createLinearGradient(0,top,0,top+17);bg.addColorStop(0,mix(a.color,'#ffffff',.25));bg.addColorStop(1,mix(a.color,'#000000',.18));
  g.fillStyle=bg;rr(fx-8.5,top,17,17.5,6);g.fill();
  g.fillStyle='rgba(255,255,255,.2)';g.fillRect(fx-8.5,top+11,17,1.3);
  g.fillStyle='rgba(255,255,255,.88)';g.beginPath();g.moveTo(fx-3.6,top);g.lineTo(fx,top+4.2);g.lineTo(fx+3.6,top);g.closePath();g.fill();
  if(a.me){g.fillStyle=av.tie||'#f4b860';g.beginPath();g.moveTo(fx-1,top+2.6);g.lineTo(fx+1,top+2.6);g.lineTo(fx+1.7,top+11);g.lineTo(fx,top+12.6);g.lineTo(fx-1.7,top+11);g.closePath();g.fill()}
  else{g.fillStyle='#fff';g.fillRect(fx+3,top+8,3.8,4.8);g.fillStyle=mix(a.color,'#000000',.3);g.fillRect(fx+3.6,top+9,2.6,1.1)}
  g.fillStyle=sk;g.fillRect(fx-1.8,top-1.6,3.6,2.4);
  g.beginPath();g.arc(fx,top-5.5,6.6,0,7);g.fill();
  g.fillStyle=a.hair;
  if(hs==='cap'){
    g.fillStyle=mix(a.color,'#000000',.3);g.beginPath();g.arc(fx,top-6.4,6.9,Math.PI,0);g.fill();g.beginPath();g.ellipse(fx+2.5,top-6.2,6.5,1.7,0,0,7);g.fill();
  }else if(hs==='hat'){
    g.fillStyle='#ffc61a';g.beginPath();g.arc(fx,top-6.6,7.2,Math.PI,0);g.fill();g.fillStyle='#e0a800';g.beginPath();g.ellipse(fx,top-6.4,8.6,1.9,0,0,7);g.fill();
    g.fillStyle='#fff3b0';g.fillRect(fx-.9,top-13.4,1.8,5);
  }else{
    g.beginPath();g.arc(fx,top-6.5,6.8,Math.PI*1.02,Math.PI*1.98);g.fill();g.fillRect(fx-6.7,top-7.6,13.4,2.3);
    if(hs==='long'||hs==='bob'){g.fillRect(fx-7,top-7,2.3,hs==='long'?9:5.5);g.fillRect(fx+4.7,top-7,2.3,hs==='long'?9:5.5)}
    if(hs==='bun'){g.beginPath();g.arc(fx,top-13.6,3.3,0,7);g.fill()}
  }
  g.fillStyle='#1b2236';g.fillRect(fx-3,top-5,1.6,1.8);g.fillRect(fx+1.6,top-5,1.6,1.8);
  if(av.gl){g.strokeStyle='#1b2236';g.lineWidth=.9;g.beginPath();g.arc(fx-2.2,top-4.2,2.3,0,7);g.moveTo(fx+4.5,top-4.2);g.arc(fx+2.2,top-4.2,2.3,0,7);g.moveTo(fx-.1,top-4.4);g.lineTo(fx+.1,top-4.4);g.stroke()}
  arm(1,rx,ry);
  if(a.carry){
    g.save();g.translate(rx+1.5,ry-2);g.rotate(-.25+Math.sin(t*6+a.ph)*.05);
    g.fillStyle='#fff';g.fillRect(-4,-6.5,8,11);g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=.6;g.strokeRect(-4,-6.5,8,11);
    g.fillStyle='#9aa3b5';g.fillRect(-2.6,-4.2,5.2,.9);g.fillRect(-2.6,-2,5.2,.9);g.fillRect(-2.6,.2,3.4,.9);g.restore();
  }
  g.restore();
  g.globalAlpha=1;
  a._fx=fx;a._fy=fy;a._top=fy+(top-fy)*1.3;
}
function drawOverlay(a,t){
  g.save();
  var fx=a._fx,fy=a._fy,top=a._top;
  if(a.state==='trabalhando'||a.state==='revisando'){
    g.fillStyle='rgba(0,0,0,.55)';g.fillRect(fx-14,top-30,28,4.5);
    g.fillStyle=ST[a.state].c;g.fillRect(fx-14,top-30,28*Math.min(1,a.progress/100),4.5);
  }
  var need=a.id==='gab'?F.approvals.length>0:a.attn;
  if(need){
    var bx=fx,byy=top-44+Math.sin(t*4+a.ph)*2.5,col=a.state==='travado'?'#ff6a5c':'#ffc93c';
    g.fillStyle=col;g.beginPath();g.arc(bx,byy,12,0,7);g.fill();
    g.beginPath();g.moveTo(bx-4,byy+10);g.lineTo(bx,byy+17);g.lineTo(bx+4,byy+10);g.closePath();g.fill();
    g.fillStyle=a.state==='travado'?'#fff':'#3a2605';g.font='800 17px Figtree,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('!',bx,byy+.5);
  }
  if(cam.z>=.62||F.sel===a.id){
    var zz=Math.max(cam.z,.62),fs=11/zz;
    g.font='600 '+fs+'px Figtree,sans-serif';g.textAlign='center';g.textBaseline='middle';
    var lvN=a.id!=='gab'&&a.id!==F.RECID?xpLevel(a.id):0,nm2=(a.paused?'⏸ ':'')+a.name+(lvN>1?' · Nv '+lvN:''),w=g.measureText(nm2).width+10/zz;
    g.fillStyle='rgba(8,13,26,.85)';rr(fx-w/2,fy+10,w,fs+5,4);g.fill();
    g.fillStyle='#fff';g.fillText(nm2,fx,fy+10+(fs+5)/2+.5);
  }
  g.restore();
}

var LIGHT='noite';try{LIGHT=localStorage.getItem('torre_light')||'noite'}catch(e){}
function isDay(){if(LIGHT==='dia')return true;if(LIGHT==='auto'){var h=new Date().getHours();return h>=6&&h<18}return false}
var lastDraw=0;
function glowPoints(){
  var gl=[];
  Object.keys(F.R).forEach(function(k){var r=F.R[k];gl.push([r.cx,r.cy,1.1,230,130,.75])});
  gl.push([11.4,1.6,.8,330,150,.55],[11.4,5,.3,260,130,.28],[6.3,7,.2,150,110,.25],[16.9,7,.2,150,110,.25],[11.4,8.6,.2,380,100,.22]);
  F.S.forEach(function(o){if(o.gl)gl.push(o.gl)});
  return gl;
}
var GLOW_S=.5,GLOW_PAD=300;
function drawGlow(gk){
  var L=F.glowLayer,P=GLOW_PAD;
  if(!L){
    /* margem: o brilho das salas da borda passa do limite do mundo */
    var c=document.createElement('canvas');c.width=Math.ceil((SW+2*P)*GLOW_S);c.height=Math.ceil((SH+2*P)*GLOW_S);
    var k=c.getContext('2d');k.setTransform(GLOW_S,0,0,GLOW_S,P*GLOW_S,P*GLOW_S);k.globalCompositeOperation='lighter';
    glowPoints().forEach(function(p){var cx=X(p[0],p[1]),cy=Y(p[0],p[1],p[2]);k.globalAlpha=p[5]*.8;k.drawImage(glowSpr,cx-p[3],cy-p[4],p[3]*2,p[4]*2)});
    L=F.glowLayer={c:c};
  }
  g.globalCompositeOperation='lighter';g.globalAlpha=gk;
  g.drawImage(L.c,-P,-P,SW+2*P,SH+2*P);
  g.globalAlpha=1;g.globalCompositeOperation='source-over';
}
/* piso em cache: as dezenas de gradientes e linhas do chão viram uma imagem por andar,
   refeita só quando o zoom muda de faixa. Acima de 2,2x volta a desenhar em vetor (nítido). */
function drawGround(){
  var s=cam.z*dpr;
  if(s>2.2){F.ground();return}
  var want=Math.max(.5,Math.min(2,Math.ceil(s*4)/4)),L=F.staticLayer;
  if(!L||(L.s!==want&&!camT&&!pinch0)){
    var c=L&&L.s===want?L.c:document.createElement('canvas');
    c.width=Math.ceil(SW*want);c.height=Math.ceil(SH*want);
    var k=c.getContext('2d'),sg=g;k.setTransform(want,0,0,want,0,0);g=k;F.ground();g=sg;
    L=F.staticLayer={c:c,s:want};
  }
  g.drawImage(L.c,0,0,L.c.width/L.s,L.c.height/L.s);
}
function render(t){
  g=gm0;
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,cv.width,cv.height);
  g.setTransform(dpr*cam.z,0,0,dpr*cam.z,dpr*(viewW/2-cam.x*cam.z),dpr*(viewH/2-cam.y*cam.z));
  drawGround();
  var order=F.S.slice();
  Object.keys(F.AG).forEach(function(k){
    var a=F.AG[k],d=a.x+a.y+(isSeated(a)?.12:.05);
    if(a.loc==='reu'&&!a.walking)d=a.x+a.y+.12;
    var lo=0,hi=order.length;while(lo<hi){var m=(lo+hi)>>1;if(order[m].d<d)lo=m+1;else hi=m}
    order.splice(lo,0,{d:d,a:a});
  });
  var T=t/1000;
  for(var i=0;i<order.length;i++){var o=order[i];if(o.a)drawAgent(o.a,T);else o.f()}
  Object.keys(F.AG).forEach(function(k){drawOverlay(F.AG[k],T)});
  /* brilho: estático e borrado, então vira uma camada única em baixa resolução (1 desenho por quadro) */
  var day=isDay();
  drawGlow(day?.3:1);
  if(wrap.classList.contains('day')!==day)wrap.classList.toggle('day',day);
  if(day){g.setTransform(1,0,0,1,0,0);g.fillStyle='rgba(205,225,255,.10)';g.fillRect(0,0,cv.width,cv.height)}
}

/* ---------- câmera ---------- */
function fitZ(){return Math.min((viewW-36)/(SW-170),(viewH-36)/(SH-170))}
function clampCam(){cam.x=Math.max(SW*.05,Math.min(SW*.95,cam.x));cam.y=Math.max(SH*.08,Math.min(SH*.92,cam.y))}
function fitAll(anim){goCam(SW/2,(82+SH-100)/2,viewW<700?Math.max(fitZ(),.5):fitZ(),anim)}
function goCam(x,y,z,anim){
  z=Math.max(Math.min(fitZ()*.85,.2),Math.min(2.4,z));
  if(!anim){cam.x=x;cam.y=y;cam.z=z;camT=null;dirty=true;return}
  camT={x0:cam.x,y0:cam.y,z0:cam.z,x:x,y:y,z:z,t0:performance.now(),d:650};
}
function focusRoom(k){
  var r=F.R[k];if(!r)return;
  var z=Math.min(viewW/((r.w+r.d)*A+120),viewH/((r.w+r.d)*B+ZH*2.8+70));
  goCam(X(r.cx,r.cy),Y(r.cx,r.cy,.7),Math.min(z,1.9),true);
}
function focusAgent(k){var a=F.AG[k];goCam(X(a.x,a.y),Y(a.x,a.y,.5),Math.max(cam.z,.95),true)}
function resize(){
  var r=wrap.getBoundingClientRect();if(!r.width)return;
  dpr=Math.min(window.devicePixelRatio||1,2);viewW=r.width;viewH=r.height;
  cv.width=Math.round(viewW*dpr);cv.height=Math.round(viewH*dpr);dirty=true;
}
var firstFit=false;
window.addEventListener('resize',function(){resize();if(!firstFit)return;dirty=true});

/* entrada: arrastar, pinça, roda, toque */
var ptrs={},tapInfo=null,pinch0=null;
function rel(e){var r=cv.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}}
cv.addEventListener('pointerdown',function(e){
  cv.setPointerCapture(e.pointerId);var p=rel(e);p.x0=p.x;p.y0=p.y;p.t=performance.now();ptrs[e.pointerId]=p;camT=null;
  var ids=Object.keys(ptrs);
  if(ids.length===2){var a=ptrs[ids[0]],b=ptrs[ids[1]];pinch0={d:Math.hypot(a.x-b.x,a.y-b.y),z:cam.z};tapInfo=null}
  else tapInfo={x:p.x,y:p.y,t:p.t,moved:0};
});
cv.addEventListener('pointermove',function(e){
  var p=ptrs[e.pointerId];if(!p)return;var n=rel(e),dx=n.x-p.x,dy=n.y-p.y;p.x=n.x;p.y=n.y;
  var ids=Object.keys(ptrs);
  if(ids.length===2&&pinch0){
    var a=ptrs[ids[0]],b=ptrs[ids[1]],d=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    zoomAt(mx,my,pinch0.z*d/pinch0.d);
  }else{
    cam.x-=dx/cam.z;cam.y-=dy/cam.z;clampCam();
    if(tapInfo)tapInfo.moved+=Math.abs(dx)+Math.abs(dy);
  }
  dirty=true;
});
function endPtr(e){
  var p=ptrs[e.pointerId];delete ptrs[e.pointerId];pinch0=null;
  if(p&&tapInfo&&Object.keys(ptrs).length===0&&tapInfo.moved<8&&performance.now()-tapInfo.t<500)tap(p.x,p.y);
  tapInfo=null;
}
cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',endPtr);
cv.addEventListener('wheel',function(e){e.preventDefault();var p=rel(e);zoomAt(p.x,p.y,cam.z*(e.deltaY<0?1.15:.87))},{passive:false});
function zoomAt(sx,sy,z){
  z=Math.max(Math.min(fitZ()*.85,.2),Math.min(2.4,z));
  var wx=cam.x+(sx-viewW/2)/cam.z,wy=cam.y+(sy-viewH/2)/cam.z;
  cam.z=z;cam.x=wx-(sx-viewW/2)/z;cam.y=wy-(sy-viewH/2)/z;clampCam();dirty=true;
}
function tap(sx,sy){
  var wx=cam.x+(sx-viewW/2)/cam.z,wy=cam.y+(sy-viewH/2)/cam.z;
  var best=null,bd=1e9,thr=Math.max(24,18/cam.z);
  Object.keys(F.AG).forEach(function(k){var a=F.AG[k],d=Math.hypot(X(a.x,a.y)-wx,Y(a.x,a.y,.5)-wy);if(d<thr&&d<bd){bd=d;best=k}});
  if(best){select(best);var pa=best==='gab'?F.approvals.filter(function(x){return x.view})[0]:F.approvals.filter(function(x){return x.agent===best&&x.view})[0];if(pa){openApproval(pa.id);return}if(cam.z<.8)focusAgent(best);return}
  var zs=[0,1.5,2.3];
  for(var i=0;i<zs.length;i++){
    var sy2=wy+zs[i]*ZH,u=(wx-OX)/A,v=(sy2-OY)/B,x=(u+v)/2,y=(v-u)/2;
    var hit=Object.keys(F.R).filter(function(k){var r=F.R[k];return x>=r.x&&x<=r.x1&&y>=r.y&&y<=r.y1})[0];
    if(hit){focusRoom(hit);selectRoom(hit);return}
  }
  select(null);
}
$('#zIn').addEventListener('click',function(){goCam(cam.x,cam.y,cam.z*1.35,true)});
$('#zOut').addEventListener('click',function(){goCam(cam.x,cam.y,cam.z/1.35,true)});
$('#zFit').addEventListener('click',function(){fitAll(true)});

var lastT=performance.now(),vOffice=$('#v-office');
/* desenha só quando precisa: câmera ou agentes andando = até 30 fps;
   animações pequenas (digitando, "!" pulando) = 10 fps; parado = 4 fps */
function animLevel(){
  var lvl=0;
  Object.keys(F.AG).forEach(function(k){var a=F.AG[k];if(a.walking)lvl=2;else if(lvl<1&&(a.attn||a.state==='trabalhando'||a.state==='revisando'))lvl=1});
  if(lvl<1&&F.approvals.length)lvl=1;
  return lvl;
}
function frame(t){
  var dt=Math.min((t-lastT)/1000,.1);lastT=t;
  if(camT){
    var p=Math.min(1,(t-camT.t0)/camT.d),e=1-Math.pow(1-p,3);
    cam.x=camT.x0+(camT.x-camT.x0)*e;cam.y=camT.y0+(camT.y-camT.y0)*e;cam.z=camT.z0+(camT.z-camT.z0)*e;
    if(p>=1)camT=null;dirty=true;
  }
  FLOORIDS.forEach(function(id){inFloor(FLOORS[id],function(){if(stepAgents(dt)&&!inBg)dirty=true})});
  if(viewW>0&&vOffice.classList.contains('on')){
    var gap=t-lastDraw,lv=dirty?2:animLevel(),need=lv===2?33:lv===1?100:250;
    if(gap>=need){render(t);lastDraw=t;dirty=false;STATS_RENDER.n++}
  }
  requestAnimationFrame(frame);
}
var STATS_RENDER={n:0};
