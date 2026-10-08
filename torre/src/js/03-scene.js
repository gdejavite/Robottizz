/* =====================================================================
   CENÁRIO ESTÁTICO
   ===================================================================== */
function O(d,f,gl){F.S.push({d:d,f:f,gl:gl})}

function build(g0){
  g=g0;F.S=[];
  /* ---------- sprites ---------- */
  var fsh=function(x,y,w,d){poly([[x-.04,y+.1,0],[x+w+.12,y+.1,0],[x+w+.12,y+d+.14,0],[x-.04,y+d+.14,0]],'rgba(0,0,0,.2)')};
  var monitor=function(x,y,z,pat){
    z=z||.75;pat=pat||0;
    box(x+.27,y+.07,z,.08,.08,.12,C('#2a3042'));
    var zz=z+.1,w=.62,h=.4,th=.05,yy=y+th;
    poly([[x+w,y,zz],[x+w,yy,zz],[x+w,yy,zz+h],[x+w,y,zz+h]],'#0e1526');
    poly([[x,y,zz+h],[x+w,y,zz+h],[x+w,yy,zz+h],[x,yy,zz+h]],'#1c2438');
    var gr=g.createLinearGradient(0,Y(x,yy,zz+h),0,Y(x,yy,zz));
    gr.addColorStop(0,pat===3?'#16233f':'#63a0ff');gr.addColorStop(1,pat===3?'#0b1226':'#1f4cae');
    poly([[x,yy,zz],[x+w,yy,zz],[x+w,yy,zz+h],[x,yy,zz+h]],gr,'#0b1226',1.2);
    var Rr=function(u0,u1,z0,z1,c){poly([[x+u0,yy,zz+z0],[x+u1,yy,zz+z0],[x+u1,yy,zz+z1],[x+u0,yy,zz+z1]],c)};
    if(pat===0){
      [.1,.18,.14,.26,.2].forEach(function(hh,i){Rr(.08+i*.1,.14+i*.1,.06,.06+hh,'rgba(255,255,255,.78)')});
      line3([[x+.08,yy,zz+.3],[x+.2,yy,zz+.27],[x+.3,yy,zz+.31],[x+.4,yy,zz+.34],[x+.54,yy,zz+.36]],'#ffd37a',1.6);
    }else if(pat===1){
      [.34,.28,.22,.16,.1].forEach(function(z2,i){Rr(.07,.07+[.4,.46,.3,.42,.22][i],z2,z2+.035,i===0?'rgba(255,255,255,.7)':'rgba(255,255,255,.35)')});
    }else if(pat===2){
      var cc=['rgba(160,255,190,.7)','rgba(255,200,120,.7)','rgba(255,255,255,.55)'];
      [.34,.28,.22,.16,.1].forEach(function(z2,i){var ind=(i%3)*.06;Rr(.07+ind,.07+ind+[.3,.22,.34,.18,.26][i],z2,z2+.035,cc[i%3])});
    }else{
      [[.1,.14,.22,1],[.18,.2,.3,0],[.26,.18,.28,1],[.34,.24,.33,1],[.42,.2,.3,0],[.5,.26,.34,1]].forEach(function(c){var col=c[3]?'#6fe3a0':'#ff7a6e';line3([[x+c[0]+.02,yy,zz+c[1]-.03],[x+c[0]+.02,yy,zz+c[2]+.03]],col,1);Rr(c[0],c[0]+.04,c[1],c[2],col)});
    }
  };
  var mkWork=function(p){return spriteGroup(2.6,1.0,1.4,function(){
    fsh(0,0,2.5,.95);
    box(0,.03,0,.55,.88,.68,C('#454b5e'));
    box(2.34,.03,0,.1,.88,.68,C('#c9bb99'));
    box(0,0,.68,2.5,.95,.07,C('#efe4cd'));
    monitor(.85,.18,null,p);monitor(1.55,.18,null,(p+1)%4);
    box(1.05,.62,.75,.7,.22,.03,C('#2c3345'));
    box(1.9,.66,.75,.1,.14,.04,C('#2c3345'));
    box(2.0,.15,.75,.2,.2,.05,C('#f4f0e6'));
  })};
  var SP={};SP.workV=[0,1,2,3].map(mkWork);SP.work=SP.workV[0];
  SP.desk2=spriteGroup(2.4,1.0,1.2,function(){
    fsh(0,0,2.2,.85);
    box(0,.03,0,.5,.8,.66,C('#4c4538'));
    box(2.1,.03,0,.1,.8,.66,C('#b89a68'));
    box(0,0,.66,2.2,.85,.07,C('#d9b98a'));
    box(.9,.34,.73,.55,.34,.03,C('#2c3345'));
    box(.9,.3,.76,.55,.03,.32,C('#8b93a6'));
    box(1.7,.4,.73,.3,.22,.03,C('#e8e1d0'));
  });
  SP.shelf=spriteGroup(.7,1.7,1.7,function(){
    fsh(0,0,.45,1.6);
    box(0,0,0,.45,1.6,1.55,C('#6b4a2c'));
    var cols=['#d9534f','#f0ad4e','#5bc0de','#5cb85c','#e8e1d0','#8e6bbf','#3b5fa8'],rr=rng(11);
    for(var row=0;row<3;row++){
      var z0=.12+row*.46;
      poly([[.45,.05,z0+.40],[.45,1.55,z0+.40],[.45,1.55,z0+.44],[.45,.05,z0+.44]],'#3f2a15');
      var y=.1;while(y<1.45){var bw=.07+rr()*.07,bh=.22+rr()*.14;poly([[.45,y,z0],[.45,y+bw,z0],[.45,y+bw,z0+bh],[.45,y,z0+bh]],cols[Math.floor(rr()*cols.length)],'rgba(0,0,0,.25)',.6);y+=bw+.01}
    }
  });
  SP.cab=spriteGroup(.7,.8,.9,function(){
    fsh(0,0,.55,.7);
    box(0,0,0,.55,.7,.72,C('#d8dbe3'));
    poly([[.55,.05,.46],[.55,.65,.46],[.55,.65,.5],[.55,.05,.5]],'#9aa1b3');
    poly([[.55,.05,.2],[.55,.65,.2],[.55,.65,.24],[.55,.05,.24]],'#9aa1b3');
    box(.12,.18,.72,.3,.3,.08,C('#f4f0e6'));
  });
  var sofa=function(backEast){return spriteGroup(1.2,2.1,1.2,function(){
    fsh(0,0,1.0,2.0);
    box(0,0,0,1.0,2.0,.4,C('#566892'));
    box(0,0,.4,1.0,.24,.3,C('#4a5b83'));box(0,1.76,.4,1.0,.24,.3,C('#4a5b83'));
    if(backEast)box(.72,.24,.4,.28,1.52,.55,C('#5d70a0'));else box(0,.24,.4,.28,1.52,.55,C('#5d70a0'));
    box(backEast?.08:.3,.3,.4,.62,1.4,.09,C('#6f83b4'));
  })};
  SP.sofaL=sofa(false);SP.sofaR=sofa(true);
  SP.table=spriteGroup(1.3,1.1,.8,function(){
    fsh(0,0,1.1,.95);
    box(.06,.06,0,.06,.06,.32,C('#2b2f3b'));box(.98,.06,0,.06,.06,.32,C('#2b2f3b'));
    box(.06,.84,0,.06,.06,.32,C('#2b2f3b'));box(.98,.84,0,.06,.06,.32,C('#2b2f3b'));
    box(0,0,.32,1.1,.95,.07,C('#e08b2d'));
    box(.4,.32,.39,.3,.3,.07,C('#2b2f3b'));
    poly([[.45,.37,.46],[.65,.37,.46],[.65,.57,.46],[.45,.57,.46]],'#7fd18b');
  });
  SP.recdesk=spriteGroup(5.2,1.2,1.5,function(){
    fsh(0,0,5.0,.95);
    box(0,0,0,5.0,.95,.95,{t:'#efe4cd',l:'#2b3243',r:'#202737',e:'rgba(255,255,255,.3)'});
    poly([[0,.95,.1],[5.0,.95,.1],[5.0,.95,.2],[0,.95,.2]],'rgba(255,190,90,.35)');
    poly([[0,.95,.12],[5.0,.95,.12],[5.0,.95,.16],[0,.95,.16]],F.THEME.recLed);
    poly([[5.0,0,.1],[5.0,.95,.1],[5.0,.95,.2],[5.0,0,.2]],F.THEME.recLed);
    monitor(.7,.25,.95);monitor(2.2,.25,.95);monitor(3.7,.25,.95);
  });
  SP.rack=spriteGroup(1.0,1.0,1.8,function(){
    fsh(0,0,.7,.7);box(0,0,0,.7,.7,1.65,C('#222838'));
    for(var i=0;i<7;i++){var z0=.14+i*.2;
      poly([[.07,.7,z0],[.63,.7,z0],[.63,.7,z0+.14],[.07,.7,z0+.14]],'#313a52','rgba(0,0,0,.4)',.8);
      poly([[.1,.7,z0+.04],[.14,.7,z0+.04],[.14,.7,z0+.1],[.1,.7,z0+.1]],i%3===0?'#ff9a4a':'#5fe0a0');
      poly([[.18,.7,z0+.06],[.45,.7,z0+.06],[.45,.7,z0+.08],[.18,.7,z0+.08]],'rgba(255,255,255,.25)');
    }
  });
  SP.safe=spriteGroup(1.1,1.0,1.1,function(){
    fsh(0,0,.8,.7);box(0,0,0,.8,.7,.95,{t:'#aab2c2',l:'#7b8497',r:'#5d6679',e:'rgba(255,255,255,.35)'});
    poly([[.1,.7,.1],[.7,.7,.1],[.7,.7,.85],[.1,.7,.85]],'#6a7389','#3b4254',1.2);
    var ring=[];for(var a=0;a<12;a++)ring.push([.4+Math.cos(a/12*6.283)*.16,.7,.5+Math.sin(a/12*6.283)*.16]);
    poly(ring,'#2c3345','#d6c28a',1.5);line3([[.4,.7,.5],[.4,.7,.62]],'#d6c28a',2);line3([[.56,.7,.3],[.66,.7,.3]],'#d6c28a',2.5);
  });
  SP.bptable=spriteGroup(1.8,1.2,1.2,function(){
    fsh(0,0,1.5,.95);
    [[.08,.08],[1.34,.08],[.08,.8],[1.34,.8]].forEach(function(p){box(p[0],p[1],0,.07,.07,.7,C('#3b3f4d'))});
    box(0,0,.7,1.5,.95,.07,C('#d9c9a6'));
    poly([[.12,.1,.78],[1.38,.1,.78],[1.38,.85,.78],[.12,.85,.78]],'#2f5fa8','#9bc0f0',1);
    for(var i=1;i<6;i++)line3([[.12+i*.21,.1,.79],[.12+i*.21,.85,.79]],'rgba(255,255,255,.35)',.8);
    for(var j=1;j<4;j++)line3([[.12,.1+j*.19,.79],[1.38,.1+j*.19,.79]],'rgba(255,255,255,.35)',.8);
    line3([[.25,.25,.8],[.9,.25,.8],[.9,.65,.8],[.25,.65,.8],[.25,.25,.8]],'#fff',1.2);
    var hx=X(1.2,.28),hy=Y(1.2,.28,.82);
    g.fillStyle='#e0a800';g.beginPath();g.ellipse(hx,hy,10.5,3.2,0,0,7);g.fill();
    g.fillStyle='#ffc61a';g.beginPath();g.arc(hx,hy,8,Math.PI,0);g.fill();
    g.fillStyle='#ffd84a';g.beginPath();g.arc(hx,hy-1,6,Math.PI,0);g.fill();
  });
  SP.lamp=spriteGroup(.8,.8,1.8,function(){
    box(.2,.2,0,.3,.3,.05,C('#2c3345'));line3([[.35,.35,.05],[.35,.35,1.45]],'#c9a15a',2.4);
    var sx=X(.35,.35),sy=Y(.35,.35,1.5),gr=g.createLinearGradient(0,sy-14,0,sy+4);gr.addColorStop(0,'#fff2c8');gr.addColorStop(1,'#f6d189');
    g.fillStyle=gr;g.beginPath();g.moveTo(sx-6,sy-14);g.lineTo(sx+6,sy-14);g.lineTo(sx+11,sy+2);g.lineTo(sx-11,sy+2);g.closePath();g.fill();
    g.strokeStyle='rgba(120,80,20,.5)';g.lineWidth=.8;g.stroke();
  });
  SP.chairBase=spriteGroup(.7,.7,.7,function(){
    box(.08,.08,0,.54,.54,.04,C('#171c2b'));box(.31,.31,.04,.08,.08,.38,C('#171c2b'));box(.1,.1,.42,.5,.5,.09,C('#2e3650'));
  });
  var back=function(dir){return spriteGroup(.8,.8,1.2,function(){
    var c=C('#2b3350');
    if(dir==='N')box(.1,.52,.5,.5,.08,.38,c);          // virado ao norte: encosto ao sul
    else if(dir==='S')box(.1,.1,.5,.5,.08,.38,c);
    else if(dir==='E')box(.1,.1,.5,.08,.5,.38,c);
    else box(.52,.1,.5,.08,.5,.38,c);
  })};
  SP.backN=back('N');SP.backS=back('S');SP.backE=back('E');SP.backW=back('W');

  /* plantas */
  function plant(s,seed,pot){
    var W_=140,H_=190,c=document.createElement('canvas');c.width=W_*2;c.height=H_*2;
    var k=c.getContext('2d');k.scale(2,2);var r=rng(seed),bx=W_/2,by=H_-22;
    var sqp=(pot==='sq'),pw=24*s,ph=sqp?.5*ZH:26*s;
    function leaves(from,to){
      for(var i=from;i<to;i++){
        var th=(-165+r()*150)*Math.PI/180,L=(38+r()*34)*s*(i%3===0?1.12:1),
            tx=bx+Math.cos(th)*L*.95,ty=by-ph-6+Math.sin(th)*L+Math.abs(Math.cos(th))*L*.28,
            mx=(bx+tx)/2,my=(by-ph-6+ty)/2-L*.22,nx=-Math.sin(th),ny=Math.cos(th),wd=L*.17,
            pal=['#2b7a45','#3a9455','#4aa860','#2a6d3f','#5dbb6e'];
        k.beginPath();k.moveTo(bx,by-ph-4);
        k.quadraticCurveTo(mx+nx*wd,my+ny*wd,tx,ty);k.quadraticCurveTo(mx-nx*wd,my-ny*wd,bx,by-ph-4);
        k.fillStyle=pal[Math.floor(r()*pal.length)];k.fill();
        k.beginPath();k.moveTo(bx,by-ph-4);k.quadraticCurveTo(mx,my,tx,ty);k.strokeStyle='rgba(220,255,200,.28)';k.lineWidth=.8;k.stroke();
      }
    }
    leaves(0,7);
    k.fillStyle='rgba(0,0,0,.28)';k.beginPath();k.ellipse(bx,by+2,sqp?32:pw*.75,sqp?14:pw*.3,0,0,7);k.fill();
    if(sqp){
      var hA=.8*A/2*1,hB=.8*B/2*1,hz=ph;
      var Wb=[bx-hA*2/1,by],Sb=[bx,by+hB*2],Eb=[bx+hA*2,by];
      k.fillStyle='#bdb7aa';k.beginPath();k.moveTo(bx-hA*1,by-hB*1+hB*1);k.lineTo(bx,by+hB*1);k.lineTo(bx,by+hB*1-hz);k.lineTo(bx-hA*1,by-hz);k.closePath();k.fill();
      k.fillStyle='#8f8a7e';k.beginPath();k.moveTo(bx,by+hB*1);k.lineTo(bx+hA*1,by);k.lineTo(bx+hA*1,by-hz);k.lineTo(bx,by+hB*1-hz);k.closePath();k.fill();
      k.fillStyle='#d9d3c6';k.beginPath();k.moveTo(bx,by-hB*1-hz);k.lineTo(bx+hA*1,by-hz);k.lineTo(bx,by+hB*1-hz);k.lineTo(bx-hA*1,by-hz);k.closePath();k.fill();
      k.fillStyle='#2a1d12';k.beginPath();k.moveTo(bx,by-hB*.7-hz);k.lineTo(bx+hA*.7,by-hz);k.lineTo(bx,by+hB*.7-hz);k.lineTo(bx-hA*.7,by-hz);k.closePath();k.fill();
      k.strokeStyle='#c9a15a';k.lineWidth=1.2;k.beginPath();k.moveTo(bx-hA*1,by-hz+3);k.lineTo(bx,by+hB*1-hz+3);k.lineTo(bx+hA*1,by-hz+3);k.stroke();
      leaves(7,12);return {c:c,w:W_,h:H_,ax:W_/2,ay:by+3};
    }
    var pg=k.createLinearGradient(bx-pw/2,0,bx+pw/2,0);pg.addColorStop(0,mix(pot,'#ffffff',.25));pg.addColorStop(1,mix(pot,'#000000',.25));
    k.beginPath();k.moveTo(bx-pw/2,by-ph);k.lineTo(bx+pw/2,by-ph);k.lineTo(bx+pw*.38,by);k.lineTo(bx-pw*.38,by);k.closePath();k.fillStyle=pg;k.fill();
    k.beginPath();k.ellipse(bx,by-ph,pw/2,pw*.18,0,0,7);k.fillStyle='#2a1d12';k.fill();
    leaves(7,12);
    return {c:c,w:W_,h:H_,ax:W_/2,ay:by+3};
  }
  var plantCache={};
  function addPlant(x,y,s,seed,pot){
    var key=s+'|'+seed+'|'+(pot||'');
    var sp=plantCache[key]||(plantCache[key]=plant(s,seed,pot||'#ececf1'));
    O(x+y+.05,function(){g.drawImage(sp.c,X(x,y)-sp.ax,Y(x,y,0)-sp.ay,sp.w,sp.h)});
  }
  function place(sp,x,y,z,d,gl){O(d,function(){g.drawImage(sp.c,X(x,y)-sp.ax,Y(x,y,z||0)-sp.ay,sp.wp,sp.hp)},gl)}

  /* ---------- paredes ---------- */
  function depthOf(axis,c,m){return axis==='x'?m+c:c+m}
  function woodWall(axis,c,a0,a1,H,pal){
    var n=Math.max(1,Math.round((a1-a0)/1.1)),L=(a1-a0)/n,T=.18;
    for(var i=0;i<n;i++)(function(s,e){
      var face,top;
      if(axis==='x'){face=[[s,c+T,0],[e,c+T,0],[e,c+T,H],[s,c+T,H]];top=[[s,c,H],[e,c,H],[e,c+T,H],[s,c+T,H]]}
      else{face=[[c+T,s,0],[c+T,e,0],[c+T,e,H],[c+T,s,H]];top=[[c,s,H],[c,e,H],[c+T,e,H],[c+T,s,H]]}
      var gr=g.createLinearGradient(0,Y(face[3][0],face[3][1],H),0,Y(face[0][0],face[0][1],0));
      gr.addColorStop(0,pal[0]);gr.addColorStop(1,pal[1]);
      O(depthOf(axis,c,(s+e)/2),function(){
        poly(face,gr,'rgba(40,22,8,.4)',1);poly(top,pal[2]);
        var cv_=axis==='x'?[[s,c+T,H-.07],[e,c+T,H-.07]]:[[c+T,s,H-.07],[c+T,e,H-.07]];line3(cv_,F.THEME.ledGlow,6);line3(cv_,F.THEME.ledCore,1.6);
        poly(axis==='x'?[[s,c+T,0],[e,c+T,0],[e,c+T,.14],[s,c+T,.14]]:[[c+T,s,0],[c+T,e,0],[c+T,e,.14],[c+T,s,.14]],'rgba(18,10,4,.55)');
      });
    })(a0+i*L,a0+(i+1)*L);
  }
  function glassChunk(axis,c,s,e,H,onlyBeam){
    var m=(s+e)/2,T=.14,P=function(u,z){return axis==='x'?[u,c,z]:[c,u,z]};
    var pan=[P(s,.16),P(e,.16),P(e,H),P(s,H)],base=[P(s,0),P(e,0),P(e,.16),P(s,.16)];
    var q0=pan[3],q1=pan[0];
    var gr=g.createLinearGradient(0,Y(q0[0],q0[1],H),0,Y(q1[0],q1[1],.16));
    gr.addColorStop(0,'rgba(190,215,255,.20)');gr.addColorStop(1,'rgba(120,160,235,.07)');
    var hl=[P(s+(e-s)*.18,.2),P(s+(e-s)*.34,.2),P(s+(e-s)*.62,H-.05),P(s+(e-s)*.46,H-.05)];
    O(depthOf(axis,c,m),function(){
      if(!onlyBeam){
        poly(pan,gr);poly(hl,'rgba(255,255,255,.09)');poly([P(s,.52),P(e,.52),P(e,.66),P(s,.66)],'rgba(255,255,255,.13)');poly(base,'#25396a');
        line3([P(s,0),P(s,H)],'#3f5d98',3);line3([P(e,0),P(e,H)],'#3f5d98',3);
      }
      if(axis==='x')box(s,c-T/2,H,e-s,T,.17,{t:'#93abd8',l:'#4d6eaa',r:'#34508a',e:'rgba(255,255,255,.25)'});
      else box(c-T/2,s,H,T,e-s,.17,{t:'#93abd8',l:'#4d6eaa',r:'#34508a',e:'rgba(255,255,255,.25)'});
    });
  }
  function glassWall(axis,c,a0,a1,door,H){
    var segs=door?[[a0,door[0],0],[door[0],door[1],1],[door[1],a1,0]]:[[a0,a1,0]];
    segs.forEach(function(sg){
      var n=Math.max(1,Math.round((sg[1]-sg[0])/1.8)),L=(sg[1]-sg[0])/n;
      for(var i=0;i<n;i++)glassChunk(axis,c,sg[0]+i*L,sg[0]+(i+1)*L,H,sg[2]);
    });
  }
  var WOOD=['#8a5a2e','#e0a458','#5c3b1d'],WOODD=['#6f4824','#c78a43','#4c3017'],CHAR=['#171d2c','#434a5c','#10141f'];

  /* decoração e objetos de cada sala vêm da definição do andar (def.decor / def.props) */
  function artOn(axis,c,u0,len,kind){
    var P=function(u,z){return axis==='x'?[u0+u,c,z]:[c,u0+u,z]};
    var U0=axis==='x'?1.2:1.0,W2=2.3,z0=.95,z1=1.8;
    var Q=function(a,b,za,zb,fill,stroke,lw){poly([P(U0+a,za),P(U0+b,za),P(U0+b,zb),P(U0+a,zb)],fill,stroke,lw)};
    var L=function(pts,col,lw){line3(pts.map(function(p){return P(U0+p[0],p[1])}),col,lw)};
    var d=(axis==='x'?(u0+U0+W2/2+c):(c+u0+U0+W2/2))+.3;
    O(d,function(){
      var dark='#0e1730',edge='#3b5a93';
      if(kind==='moodboard'){
        Q(0,W2,z0,z1,'#cdb98f','#6a4a30',2.5);
        var pal=['#e8715a','#5fb0e8','#f2c14e','#7fd18b','#b58cf0','#ff9ec0','#4fb3a5','#e0a458'];
        for(var i=0;i<4;i++)for(var j=0;j<2;j++)Q(.12+i*.5,.12+i*.5+.42,z0+.08+j*.38,z0+.08+j*.38+.3,pal[(i+j*4)%8],'#fff',1);
      }else if(kind==='checklist'){
        Q(0,W2,z0,z1,'#f2efe6','#9aa3b5',2.5);
        for(var r2=0;r2<4;r2++){var zz=z1-.2-r2*.17;Q(.12,.2,zz-.07,zz,'#fff','#8a93a8',1);if(r2<3)L([[.13,zz-.03],[.155,zz-.065],[.19,zz+.005]],'#2fae6a',2);Q(.3,.3+[1.0,.8,1.2,.6][r2],zz-.05,zz-.02,'#b8bfcf')}
        Q(1.6,2.2,z1-.35,z1-.1,'#ffe27a','rgba(0,0,0,.2)',1);
      }else if(kind==='tvboard'){
        var gtv=g.createLinearGradient(0,Y.apply(null,P(U0+1,z1)),0,Y.apply(null,P(U0+1,z0)));gtv.addColorStop(0,'#1a2b52');gtv.addColorStop(1,'#08101f');
        Q(0,1.4,z0,z1,gtv,'#2b3347',3);Q(.12,1.28,z1-.2,z1-.14,'rgba(120,170,255,.8)');Q(.12,.9,z1-.34,z1-.3,'rgba(255,255,255,.35)');Q(.12,1.1,z1-.46,z1-.42,'rgba(255,255,255,.25)');
        Q(1.55,W2,z0,z1,'#f2efe6','#9aa3b5',2.5);[['#ffe27a',0],['#8fd0ff',.2],['#ff9ec0',.4]].forEach(function(s,i){Q(1.65+i*.2,1.8+i*.2,z1-.3,z1-.15,s[0],'rgba(0,0,0,.2)',1)});
      }else if(kind==='gantt'){
        Q(0,W2,z0,z1,dark,edge,2.5);[[.1,.9,'#ff7a4a'],[.4,.8,'#5fa8ff'],[.7,.9,'#ff7a4a'],[1.1,.7,'#7fd18b'],[1.5,.55,'#5fa8ff']].forEach(function(b,i){var zz=z1-.16-i*.14;Q(.12+b[0]*.8,.12+b[0]*.8+b[1]*.8,zz-.08,zz,b[2])});
        for(var t2=0;t2<6;t2++)L([[.12+t2*.34,z0+.04],[.12+t2*.34,z1-.06]],'rgba(255,255,255,.14)',.8);
      }else if(kind==='blueprint'){
        Q(0,W2,z0,z1,'#2a58a0','#c8defa',2.5);
        for(var u=1;u<8;u++)L([[u*.28,z0+.05],[u*.28,z1-.05]],'rgba(255,255,255,.22)',.8);for(var v=1;v<4;v++)L([[.06,z0+v*.2],[W2-.06,z0+v*.2]],'rgba(255,255,255,.22)',.8);
        L([[.3,z0+.15],[1.5,z0+.15],[1.5,z1-.15],[.3,z1-.15],[.3,z0+.15]],'#fff',1.6);L([[.8,z0+.15],[.8,z0+.5],[1.5,z0+.5]],'#fff',1.2);
      }else if(kind==='finance'){
        Q(0,W2,z0,z1,dark,edge,2.5);L([[.15,z0+.15],[.5,z0+.25],[.8,z0+.2],[1.2,z0+.42],[1.6,z0+.5],[2.1,z0+.68]],'#6fe3a0',2.4);
        [.2,.32,.26,.44].forEach(function(h,i){Q(1.55+i*.14,1.65+i*.14,z0+.08,z0+.08+h*.5,'rgba(255,255,255,.5)')});Q(.12,.9,z1-.14,z1-.1,'rgba(255,255,255,.55)');
      }else if(kind==='candles'){
        Q(0,W2,z0,z1,dark,edge,2.5);var cs=[[.2,.25,.4,1],[.4,.3,.45,0],[.6,.35,.55,1],[.8,.3,.5,0],[1.0,.4,.62,1],[1.2,.45,.66,1],[1.4,.38,.58,0],[1.6,.5,.7,1],[1.8,.55,.74,1],[2.0,.5,.68,0]];
        cs.forEach(function(c){var col=c[3]?'#6fe3a0':'#ff7a6e';L([[c[0]+.03,z0+c[1]-.04],[c[0]+.03,z0+c[2]+.04]],col,1.2);Q(c[0],c[0]+.06,z0+c[1],z0+c[2],col)});
      }else if(kind==='ads'){
        Q(0,W2,z0,z1,dark,edge,2.5);var ring=[];for(var a2=0;a2<=20;a2++)ring.push([.5+Math.cos(a2/20*6.283)*.3,(z0+z1)/2+Math.sin(a2/20*6.283)*.26]);
        poly(ring.map(function(p){return P(U0+p[0],p[1])}),'#f4b860');poly(ring.map(function(p){return P(U0+.5+(p[0]-.5)*.55,(z0+z1)/2+(p[1]-(z0+z1)/2)*.55)}),dark);
        [.2,.34,.28,.46,.38].forEach(function(h,i){Q(1.1+i*.22,1.24+i*.22,z0+.1,z0+.1+h,'#5fa8ff')});
      }else if(kind==='server'){
        Q(0,W2,z0,z1,dark,edge,2.5);for(var s2=0;s2<5;s2++){var zz2=z1-.14-s2*.15;Q(.12,.22,zz2-.08,zz2,s2===3?'#ff9a4a':'#5fe0a0');Q(.32,.32+[1.4,1.0,1.7,.8,1.2][s2],zz2-.06,zz2-.02,'rgba(255,255,255,.3)')}
      }else if(kind==='funnel'){
        Q(0,W2,z0,z1,dark,edge,2.5);var lay=[[1.0,.8,'#4f8cff'],[.8,.55,'#6aa6ff'],[.55,.3,'#8cc0ff']];
        lay.forEach(function(l,i){var zt=z1-.14-i*.22,zb=zt-.18;poly([P(U0+1.15-l[0]*.9,zt),P(U0+1.15+l[0]*.9,zt),P(U0+1.15+l[1]*.9,zb),P(U0+1.15-l[1]*.9,zb)],l[2])});
      }else{ // kpi
        Q(0,W2,z0,z1,dark,edge,2.5);var tops=[];
        for(var k2=0;k2<6;k2++){var hh=.12+k2*.06+(k2%2?.03:0);Q(.2+k2*.16,.31+k2*.16,z0+.1,z0+.1+hh,'#6fa3ff');tops.push([.255+k2*.16,z0+.1+hh]);}
        L(tops,'#ffd37a',2);Q(1.35,2.1,z1-.26,z1-.18,'rgba(255,255,255,.75)');Q(1.35,1.9,z1-.42,z1-.36,'rgba(255,255,255,.35)');Q(.2,1.0,z1-.14,z1-.1,'rgba(255,255,255,.55)');
      }
      /* quadro decorativo ao lado */
      Q(2.5,3.2,z0+.04,z1-.06,'#e8e1d0','#6a4a30',2.5);Q(2.62,3.08,z0+.14,z1-.16,'#1f3a6b');Q(2.7,2.95,z0+.2,z0+.42,'#d96a4a');Q(2.85,3.02,z0+.34,z0+.58,'#f2c14e');
    });
  }

  /* ---------- salas ---------- */
  var dh=.8;
  Object.keys(F.R).forEach(function(k,ri){
    var r=F.R[k];
    if(r.side==='N')glassWall('x',r.y,r.x,r.x1,[r.cx-dh,r.cx+dh],1.45);else woodWall('x',r.y,r.x,r.x1,2.0,WOOD);
    if(r.side==='W')glassWall('y',r.x,r.y,r.y1,[r.cy-dh,r.cy+dh],1.45);else woodWall('y',r.x,r.y,r.y1,2.0,WOODD);
    glassWall('y',r.x1,r.y,r.y1,r.side==='E'?[r.cy-dh,r.cy+dh]:null,1.45);
    glassWall('x',r.y1,r.x,r.x1,null,1.45);
    /* arte de parede (por andar) */
    var DK=(F.DECOR||{})[k]||'kpi';
    if(r.side==='N')artOn('y',r.x+.19,r.y,r.d,DK);else artOn('x',r.y+.19,r.x,r.w,DK);
    /* mobília */
    var x0=r.x,y0=r.y;
    if(k==='reu'){
      O(r.cx+r.cy,function(){box(r.cx-1.1,r.cy-.5,0,2.2,1.0,.72,{t:'#efe4cd',l:'#8a7650',r:'#6d5c3c',e:'rgba(255,255,255,.3)'})});
      F.SEATS.forEach(function(s2){
        place(SP.chairBase,s2[0]-.35,s2[1]-.35,0,s2[0]+s2[1]+.02);
        var bk={N:SP.backN,S:SP.backS,E:SP.backE,W:SP.backW}[s2[2]],dd={N:.3,S:-.3,E:-.3,W:.3}[s2[2]];
        place(bk,s2[0]-.35,s2[1]-.35,0,s2[0]+s2[1]+dd);
      });
      place(SP.lamp,r.x1-1.1,r.y1-1.1,0,r.x1+r.y1-1.0,[r.x1-.75,r.y1-.75,1.5,110,80,.45]);
    }else{
      place(SP.workV[ri%4],x0+1.5,y0+.5,0,x0+1.5+1.3+y0+.5+.48);
      place(SP.chairBase,x0+2.7-.35,y0+1.95-.35,0,x0+2.7+y0+1.95+.02);
      place(SP.backN,x0+2.7-.35,y0+1.95-.35,0,x0+2.7+y0+1.95+.3);
      place(SP.desk2,x0+.9,y0+3.2,0,x0+.9+1.1+y0+3.2+.42);
      place(SP.chairBase,x0+2.0-.35,y0+2.85-.35,0,x0+2.0+y0+2.85+.02);
      place(SP.backS,x0+2.0-.35,y0+2.85-.35,0,x0+2.0+y0+2.85-.3);
      place(SP.shelf,x0+.2,y0+.8,0,x0+.2+.22+y0+.8+.8);
      place(SP.cab,x0+4.5,y0+.5,0,x0+4.5+.27+y0+.5+.35);
      var pr=F.PROPS[k];
      if(pr)place(SP[pr.s],x0+pr.x,y0+pr.y,0,x0+pr.x+.5+y0+pr.y+.5);
      else if(ri%2===0)addPlant(x0+4.85,y0+3.85,.85,r.x*3+r.y*7+5);
      place(SP.lamp,x0+.15,y0+3.75,0,x0+.15+.35+y0+3.75+.35,[x0+.5,y0+4.1,1.5,110,80,.45]);
    }
    /* placa */
    var px=r.x+.25,py=r.y1+.02;
    O(px+1.4+py+6,function(){
      var own=F.OWNER[k],col=ST.idle.c;
      if(k==='dir')col=(F.approvals.length?ST.esperando.c:ST.idle.c);
      else if(own)col=ST[F.AG[own].state].c;
      else col=F.meetingOn?ST.reuniao.c:ST.idle.c;
      plate(px,py,2.5,r.name,r.sub,col,30,17);
    });
  });
  /* placa: o corpo (com sombra, caro de desenhar) vira sprite; só o ponto de status é desenhado a cada frame */
  var plateCache={};
  function plateSprite(title,sub,tf,sf,wP){
    var key=title+'|'+sub+'|'+tf+'|'+sf+'|'+wP+'|'+F.THEME.plate;if(plateCache[key])return plateCache[key];
    var hP=88,pad=24,c=document.createElement('canvas');c.width=(wP+pad*2)*2;c.height=(hP+pad*2)*2;
    var k=c.getContext('2d');k.scale(2,2);k.translate(pad,pad);
    var sg=g;g=k;
    g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=14;
    g.fillStyle='#131b31';rr(0,0,wP,hP,10);g.fill();g.shadowBlur=0;
    g.strokeStyle=F.THEME.plate;g.lineWidth=3;g.stroke();
    g.textAlign='center';g.textBaseline='alphabetic';
    g.fillStyle='#fff';g.font='800 '+tf+'px "Bricolage Grotesque","Trebuchet MS",sans-serif';g.fillText(title,wP/2,hP/2-4);
    g.fillStyle='#a9b6d6';g.font='500 '+sf+'px Figtree,sans-serif';g.fillText(sub,wP/2,hP/2+sf+6);
    g=sg;
    return (plateCache[key]={c:c,pad:pad,w:wP+pad*2,h:hP+pad*2});
  }
  function plate(px,py,pz,title,sub,dot,tf,sf,wP){
    wP=wP||270;var sp=plateSprite(title,sub,tf,sf,wP);
    g.save();g.translate(X(px,py),Y(px,py,pz));g.transform(A/100,B/100,0,ZH/100,0,0);
    g.drawImage(sp.c,-sp.pad,-sp.pad,sp.w,sp.h);
    g.fillStyle=dot;g.beginPath();g.arc(wP-17,17,7,0,7);g.fill();
    g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=2;g.stroke();
    g.restore();
  }

  /* ---------- saguão ---------- */
  woodWall('x',0,5.4,17.4,2.6,CHAR);
  /* painel de ripas, luz e nichos atrás da recepção */
  O(11.65,function(){
    var gl=g.createLinearGradient(0,Y(11.4,.2,.1),0,Y(11.4,.2,1.4));gl.addColorStop(0,'rgba(255,184,80,.55)');gl.addColorStop(1,'rgba(255,184,80,0)');
    poly([[6,.2,.05],[16.8,.2,.05],[16.8,.2,1.5],[6,.2,1.5]],gl);
    var cl=['#53381f','#74502d'];
    for(var i=0;i<40;i++){var u=8.3+i*.15;poly([[u,.19,.12],[u+.11,.19,.12],[u+.11,.19,2.5],[u,.19,2.5]],cl[i%2])}
    line3([[8.3,.19,2.5],[14.3,.19,2.5]],F.THEME.ledCore,1.6);
    [[6.3,7.5],[15.3,16.5]].forEach(function(n){
      poly([[n[0],.19,.9],[n[1],.19,.9],[n[1],.19,2.0],[n[0],.19,2.0]],'#0b0f1b',F.THEME.recLed,1.6);
      line3([[n[0]+.04,.19,1.4],[n[1]-.04,.19,1.4]],F.THEME.recLed,1.2);
      [[.35,1.4],[.8,.9]].forEach(function(v){var vx=X(n[0]+v[0],.19),vy=Y(n[0]+v[0],.19,v[1]+.05);g.fillStyle='#c9a15a';g.beginPath();g.ellipse(vx,vy-4,3.4,6,0,0,7);g.fill();g.fillStyle='#e8c98a';g.beginPath();g.ellipse(vx,vy-9,2,1.2,0,0,7);g.fill()});
    });
    line3([[6,.2,.08],[16.8,.2,.08]],F.THEME.recLed,2.5);
  });
  O(12.6,function(){plate(9.9,.2,2.45,'RECEPÇÃO','Entrada de tarefas',ST.trabalhando.c,40,21,300)});
  place(SP.recdesk,8.9,1.1,0,8.9+2.6+1.1+.6+.5);
  place(SP.sofaL,8.6,4.0,0,8.6+.6+4.0+1.0+.2);
  place(SP.sofaR,13.5,4.0,0,13.5+.6+4.0+1.0+.2);
  place(SP.table,10.7,4.5,0,10.7+.6+4.5+.5+.2);
  /* colunas com luz */
  [[7.9,3.0],[14.7,3.0],[7.9,7.2],[14.7,7.2]].forEach(function(p){
    var cx=p[0]-.22,cy=p[1]-.22;
    O(p[0]+p[1]+.3,function(){
      box(cx-.04,cy-.04,0,.52,.52,.1,C('#3a4256'));
      box(cx,cy,.1,.44,.44,2.35,{t:'#4a536b',l:'#2f3649',r:'#222838',e:'rgba(255,255,255,.2)'});
      box(cx-.04,cy-.04,2.45,.52,.52,.12,C('#3a4256'));
      poly([[cx+.02,cy+.44,.2],[cx+.42,cy+.44,.2],[cx+.42,cy+.44,.28],[cx+.02,cy+.44,.28]],F.THEME.recLed);
      poly([[cx+.44,cy+.02,.2],[cx+.44,cy+.42,.2],[cx+.44,cy+.42,.28],[cx+.44,cy+.02,.28]],F.THEME.recLed);
    });
  });
  /* luminárias pendentes sobre o lounge */
  [10.3,11.4,12.5].forEach(function(x){
    O(x+5.0+3.2,function(){
      var sx=X(x,5.0),top=Y(x,5.0,3.6),sy=Y(x,5.0,2.1);
      g.strokeStyle='#1c2233';g.lineWidth=1.4;g.beginPath();g.moveTo(sx,top);g.lineTo(sx,sy-9);g.stroke();
      var gr=g.createLinearGradient(0,sy-10,0,sy+3);gr.addColorStop(0,'#323b52');gr.addColorStop(1,'#1a2030');
      g.fillStyle=gr;g.beginPath();g.moveTo(sx-4,sy-10);g.lineTo(sx+4,sy-10);g.lineTo(sx+13,sy);g.lineTo(sx-13,sy);g.closePath();g.fill();
      g.fillStyle='#ffe2a0';g.beginPath();g.ellipse(sx,sy,13,3.5,0,0,7);g.fill();
    },[x,5.0,1.9,95,65,.55]);
  });
  /* abajures ao lado dos sofás */
  place(SP.lamp,7.85,6.15,0,7.85+6.15+.7,[8.2,6.5,1.5,110,80,.5]);
  place(SP.lamp,14.45,6.15,0,14.45+6.15+.7,[14.8,6.5,1.5,110,80,.5]);
  /* jardineiras: poucas, grandes e arquitetônicas */
  addPlant(8.15,1.55,1.7,3,'sq');addPlant(14.1,1.75,1.7,4,'sq');addPlant(9.5,7.55,1.1,5,'sq');addPlant(13.3,7.55,1.1,6,'sq');
  /* barras holográficas (KPI) */
  O(15.3+.9,function(){
    for(var i=0;i<F.bars.length;i++){
      var h=.25+F.bars[i]/100*1.7,x=14.45+i*.3;
      box(x,.55,0,.22,.22,h,{t:F.THEME.bar[0],l:F.THEME.bar[1],r:F.THEME.bar[2],e:'rgba(255,255,255,.5)'});
    }
  });

  F.S.forEach(function(o,i){o.i=i});
  F.S.sort(function(a,b){return a.d-b.d||a.i-b.i});

  /* ---------- solo ---------- */
  var gm=.5;
  var hallG=g.createLinearGradient(0,Y(-gm,-gm,0),0,Y(WW+gm,DD+gm,0));hallG.addColorStop(0,'#d6cfbf');hallG.addColorStop(1,'#efe8d8');
  F.ground=function(){
    poly([[-gm,DD+gm,0],[WW+gm,DD+gm,0],[WW+gm,DD+gm,-.5],[-gm,DD+gm,-.5]],'#141b36');
    poly([[WW+gm,-gm,0],[WW+gm,DD+gm,0],[WW+gm,DD+gm,-.5],[WW+gm,-gm,-.5]],'#0d1329');
    poly([[-gm,-gm,0],[WW+gm,-gm,0],[WW+gm,DD+gm,0],[-gm,DD+gm,0]],hallG,'#33477a',2);
    g.strokeStyle='rgba(110,90,60,.13)';g.lineWidth=1;
    for(var i=0;i<=WW;i+=2){line3([[i,0,0],[i,DD,0]],'rgba(110,90,60,.12)',1)}
    for(var j=0;j<=DD;j+=2){line3([[0,j,0],[WW,j,0]],'rgba(110,90,60,.12)',1)}
    Object.keys(F.R).forEach(function(k){
      var r=F.R[k],cx=X(r.cx,r.cy),cy=Y(r.cx,r.cy,0);
      var rg=g.createRadialGradient(cx,cy,10,cx,cy,170);rg.addColorStop(0,'#f6e3bd');rg.addColorStop(1,'#cfb07c');
      poly([[r.x,r.y,0],[r.x1,r.y,0],[r.x1,r.y1,0],[r.x,r.y1,0]],rg,'#8a6a3a',1.5);
    });
    /* tapetes das salas */
    Object.keys(F.R).forEach(function(k){
      var r=F.R[k];
      if(k==='reu'){poly([[r.cx-1.9,r.cy-1.4,.012],[r.cx+1.9,r.cy-1.4,.012],[r.cx+1.9,r.cy+1.4,.012],[r.cx-1.9,r.cy+1.4,.012]],F.THEME.rug[0],F.THEME.rug[1],2)}
      else{poly([[r.x+1.05,r.y+1.3,.012],[r.x+4.05,r.y+1.3,.012],[r.x+4.05,r.y+3.35,.012],[r.x+1.05,r.y+3.35,.012]],F.THEME.rug[0],F.THEME.rug[1],2);
           poly([[r.x+1.2,r.y+1.45,.013],[r.x+3.9,r.y+1.45,.013],[r.x+3.9,r.y+3.2,.013],[r.x+1.2,r.y+3.2,.013]],null,'rgba(255,255,255,.14)',1)}
      /* capacho na porta */
      var m=r.side==='E'?[[r.x1+.1,r.cy-.55],[r.x1+.85,r.cy-.55],[r.x1+.85,r.cy+.55],[r.x1+.1,r.cy+.55]]:r.side==='W'?[[r.x-.85,r.cy-.55],[r.x-.1,r.cy-.55],[r.x-.1,r.cy+.55],[r.x-.85,r.cy+.55]]:[[r.cx-.55,r.y-.85],[r.cx+.55,r.y-.85],[r.cx+.55,r.y-.1],[r.cx-.55,r.y-.1]];
      poly(m.map(function(q){return [q[0],q[1],.014]}),'#2a3145','rgba(255,255,255,.14)',1);
    });
    /* faixa de latão no piso do lounge */
    var ring=function(rx,ry,col,lw){var pts=[];for(var a=0;a<=48;a++){var t=a/48*Math.PI*2;pts.push([11.4+Math.cos(t)*rx,5.0+Math.sin(t)*ry,.015])}line3(pts,col,lw)};
    ring(4.3,2.7,'rgba(201,161,90,.75)',2.2);ring(4.1,2.55,'rgba(201,161,90,.35)',1);
    /* tapete */
    poly([[8.6,3.5,.01],[14.2,3.5,.01],[14.2,6.5,.01],[8.6,6.5,.01]],'#7d8599','#667087',2);
    poly([[8.85,3.75,.02],[13.95,3.75,.02],[13.95,6.25,.02],[8.85,6.25,.02]],'rgba(255,255,255,.05)');
    /* LED */
    var led=[
      [[5.8,.5],[5.8,13.6]],[[17.1,.5],[17.1,13.6]],
      [[7.5,3.0],[15.1,3.0],[15.1,7.2],[7.5,7.2],[7.5,3.0]],
      [[6.0,8.9],[16.7,8.9]]
    ];
    led.forEach(function(p){var pts=p.map(function(q){return [q[0],q[1],.02]});line3(pts,F.THEME.ledGlow,10);line3(pts,F.THEME.ledCore,2.6)});
  };
}

