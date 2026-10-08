/* =====================================================================
   PRÉDIO: cada andar é um objeto com o seu estado (time, tarefas, memória,
   metas, cenário). F aponta para o andar em execução; VIEW é o andar na tela.
   Fora de inFloor(), F === VIEW. Estado novo de um andar entra em createFloor.
   ===================================================================== */
var FLOORS={},FLOORIDS=[],F=null,VIEW=null,inBg=false,FLOORDEFS=[];

/* planta-base do andar: todas as empresas usam o mesmo desenho de salas */
var LAYOUT={
 dir:{x:0,y:0,w:5.4,d:4.4,side:'E'},
 con:{x:0,y:4.8,w:5.4,d:4.4,side:'E'},
 aq:{x:0,y:9.6,w:5.4,d:4.4,side:'E'},
 qua:{x:17.4,y:0,w:5.4,d:4.4,side:'W'},
 tra:{x:17.4,y:4.8,w:5.4,d:4.4,side:'W'},
 ti:{x:17.4,y:9.6,w:5.4,d:4.4,side:'W'},
 rev:{x:7.2,y:9.6,w:4.4,d:4.4,side:'N'},
 reu:{x:12.1,y:9.6,w:4.4,d:4.4,side:'N'}
};
var LANEL=6.3,LANER=16.95,HL=8.3;

/* cada arquivo de andar (floors/*.js) chama registerFloor(def) */
function registerFloor(def){FLOORDEFS.push(def);Object.keys(def.CTX||{}).forEach(function(k){DEFCTX[k]=def.CTX[k]})}

/* roda uma função "dentro" de um andar */
function inFloor(Fl,fn){
  if(F===Fl)return fn();
  var prev=F;F=Fl;inBg=(Fl!==VIEW);
  try{return fn()}finally{F=prev;inBg=(prev!==VIEW)}
}
function later(fn,ms){var Fl=F;return setTimeout(function(){inFloor(Fl,fn)},ms)}
function bindF(fn){var Fl=F;return function(){var a=arguments,out;inFloor(Fl,function(){out=fn.apply(null,a)});return out}}
function tgp(){return '[Torre Gabriel · '+F.FMETA.nome+'] '}
function peekStuck(Fl){var a=Fl.AG[Fl.STK.id];return !!(a&&a.state==='travado')}
function deriveRooms(R){
  Object.keys(R).forEach(function(k){
    var r=R[k];r.id=k;r.x1=r.x+r.w;r.y1=r.y+r.d;r.cx=r.x+r.w/2;r.cy=r.y+r.d/2;
    if(r.side==='E'){r.inner=[r.x1-.8,r.cy];r.out=[LANEL,r.cy];r.junc=[LANEL,HL]}
    else if(r.side==='W'){r.inner=[r.x+.8,r.cy];r.out=[LANER,r.cy];r.junc=[LANER,HL]}
    else{r.inner=[r.cx,r.y+.8];r.out=[r.cx,9.0];r.junc=[r.cx,HL]}
    r.spot=[r.x+2.7,r.y+1.95];r.spot2=[r.x+2.0,r.y+2.85];
  });
}
function mkSeats(R){return [[-.6,-.95,'S'],[.6,-.95,'S'],[-.6,.95,'N'],[.6,.95,'N'],[-1.5,0,'E'],[1.5,0,'W']].map(function(s){return [R.reu.cx+s[0],R.reu.cy+s[1],s[2]]})}
function initAgents(){
  Object.keys(F.AG).forEach(function(k){
    var a=F.AG[k];
    a.state='idle';a.task=null;a.progress=0;a.dur=10;a.path=[];a.loc=a.room;a.walking=false;a.inbox=[];a.done=0;a.attn=false;a.pending=null;a.ph=Math.random()*6;F.cost[k]=0;
    a.spot=a.fixed||(a.seat===2?F.R[a.room].spot2:F.R[a.room].spot);a.x=a.spot[0];a.y=a.spot[1];
  });
}
/* monta o objeto do andar a partir da definição (floors/*.js) */
function createFloor(def){
  var R=clone(LAYOUT);
  Object.keys(def.ROOMS).forEach(function(k){R[k].name=def.ROOMS[k][0];R[k].sub=def.ROOMS[k][1]});
  deriveRooms(R);
  var AG={};
  def.AG.forEach(function(a){AG[a.id]=a;a.seat=a.seat||1});
  var Fl={
    id:def.meta.id,def:def,FMETA:def.meta,
    /* time e planta */
    R:R,SEATS:mkSeats(R),OWNER:def.OWNER,AG:AG,WORKERS:def.WORKERS,ORDER:def.ORDER,REVID:def.REVID,RECID:def.RECID,
    MEET:def.MEET,CONNS:def.CONNS,ROUTE:def.ROUTE,STK:def.STK,THEME:def.theme,DECOR:def.decor,PROPS:def.props||{},
    /* catálogos do andar */
    TPL:def.TPL,DV:def.DV||{},CHK:def.CHK||{},AGTAGS:def.AGTAGS||{},KW:BASE_KW.concat(def.KW||[]),REJ_ITEMS:def.REJ||[],
    METFX:def.METFX||{},OUT:def.OUT||{},OUTTAGS:def.OUTTAGS||{},INS:def.INS||{},AVA:def.AVA||{},AGEMO:def.EMO||{},SLEMO:def.SLEMO||{},
    /* estado da simulação */
    connState:{},tasks:[],reviewQ:[],approvals:[],chat:[{w:'rec',t:def.meta.greet}],logs:[],slots:[],sel:null,nid:1,aid:1,
    kpi:{done:0,approved:0,rejected:0,meet:0},cost:{},now:0,stuckAt:def.meta.stuckAt,meetAt:def.meta.meetAt,spawnAt:3,meetIdx:0,meetingOn:false,
    barsData:def.barsData.slice(),bars:def.barsData.slice(),
    /* memória, metas, aprendizado, XP, verificações agendadas */
    MEM:[],mid:1,STATS:{applied:0,avoided:0,rejHist:[],ok:0,fail:0,retro:0},MET:clone(def.MET),MET0:clone(def.MET),
    XP:{},checks:[],journal:[],
    /* cenário (montado em build) */
    S:[],ground:null,staticLayer:null,glowLayer:null
  };
  Fl.CONNS.forEach(function(c){Fl.connState[c.id]='ok'});
  inFloor(Fl,initAgents);
  return Fl;
}
function floorOfAgent(aid){for(var i=0;i<FLOORIDS.length;i++){var Fl=FLOORS[FLOORIDS[i]];if(Fl.AG[aid])return Fl}return null}
