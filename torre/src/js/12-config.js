/* =====================================================================
   CONFIGURAÇÃO: salva neste aparelho e na sua conta (quando disponível).
   CFG.schema versiona o formato; migrateCfg converte versões antigas.
   ===================================================================== */
var CFG_SCHEMA=6,CFG_KEY='torre_cfg_v3';
var CFG={schema:CFG_SCHEMA,real:false,method:'',price:{},agents:{},sound:false,
  notify:{emailOn:false,email:'',slackOn:false,slack:'',slackBy:{},viaBot:false,link:'https://claude.ai/artifact/JnoQRWf8dU42CAujAStJ36',
    n8nProject:'',n8nTable:'',slackApprove:false,n8nDecTable:'',execOn:false,n8nExecTable:''},
  /* dados privados de cada empresa: ficam só na sua conta e neste aparelho, nunca no código */
  data:{}};
var saveT=null;
function defaultLevel(k){var Fl=FLOORDEFS.filter(function(d){return d.LEVELS&&d.LEVELS[k]})[0];return Fl?Fl.LEVELS[k]:'equilibrado'}
function initAgentCfg(){Object.keys(DEFCTX).forEach(function(k){if(!CFG.agents[k])CFG.agents[k]={ctx:DEFCTX[k],level:defaultLevel(k),custom:false}})}
function companyData(fid){return CFG.data[fid]||(CFG.data[fid]={facts:'',vars:{},supa:{project:'',q:{}},auto:false})}
var str=function(x,n){return typeof x==='string'?x.trim().slice(0,n):''};
/* versões antigas (schema < 6): o contexto só era "personalizado" quando tinha a marca v (salvo por você) */
function migrateCfg(d){
  if(!d||typeof d!=='object')return d;
  if((d.schema||0)<6&&d.agents)Object.keys(d.agents).forEach(function(k){var x=d.agents[k];if(x&&typeof x==='object')x.custom=!!x.v});
  if(d.notify&&d.notify.slackBy==null)d.notify.slackBy={};
  return d;
}
function mergeCfg(d){
  d=migrateCfg(d);
  if(!d||typeof d!=='object')return;
  if(typeof d.real==='boolean')CFG.real=d.real;
  if(typeof d.sound==='boolean')CFG.sound=d.sound;
  if(typeof d.method==='string')CFG.method=d.method.slice(0,4000);
  if(d.price&&typeof d.price==='object')Object.keys(PRICE_DEF).forEach(function(k){var v=+d.price[k];if(v>0&&v<1e6)CFG.price[k]=v});
  var n=d.notify||{},N=CFG.notify;
  ['emailOn','slackOn','viaBot','slackApprove','execOn'].forEach(function(k){if(typeof n[k]==='boolean')N[k]=n[k]});
  if(typeof n.email==='string')N.email=str(n.email,200);
  if(typeof n.slack==='string')N.slack=str(n.slack,200);
  if(typeof n.link==='string'&&/^https:\/\//.test(n.link))N.link=str(n.link,300);
  ['n8nProject','n8nTable','n8nDecTable','n8nExecTable'].forEach(function(k){if(typeof n[k]==='string')N[k]=str(n[k],80)});
  if(n.slackBy&&typeof n.slackBy==='object')Object.keys(n.slackBy).forEach(function(f){if(/^[a-z0-9_]{1,20}$/.test(f)&&typeof n.slackBy[f]==='string')N.slackBy[f]=str(n.slackBy[f],60)});
  var ag=d.agents||{};
  Object.keys(CFG.agents).forEach(function(k){
    var x=ag[k];if(!x||typeof x!=='object')return;
    if(x.custom&&typeof x.ctx==='string'&&x.ctx.trim()){CFG.agents[k].ctx=x.ctx.slice(0,3000);CFG.agents[k].custom=true}
    if(LV[x.level])CFG.agents[k].level=x.level;
  });
  if(d.data&&typeof d.data==='object')Object.keys(d.data).forEach(function(fid){
    var x=d.data[fid];if(!x||typeof x!=='object'||!/^[a-z0-9_]{1,20}$/.test(fid))return;
    var c=companyData(fid);
    if(typeof x.facts==='string')c.facts=x.facts.slice(0,6000);
    if(x.vars&&typeof x.vars==='object')Object.keys(x.vars).slice(0,80).forEach(function(k){if(/^\w{1,40}$/.test(k)&&(typeof x.vars[k]==='string'||typeof x.vars[k]==='number'))c.vars[k]=String(x.vars[k]).slice(0,300)});
    if(x.supa&&typeof x.supa==='object'){c.supa.project=str(x.supa.project,60);if(x.supa.q&&typeof x.supa.q==='object')Object.keys(x.supa.q).forEach(function(k){if(typeof x.supa.q[k]==='string')c.supa.q[k]=x.supa.q[k].slice(0,2000)})}
    if(typeof x.auto==='boolean')c.auto=x.auto;
  });
}
function saveCfg(){
  CFG.schema=CFG_SCHEMA;
  lsSet(CFG_KEY,JSON.stringify(CFG));
  clearTimeout(saveT);
  saveT=setTimeout(function(){if(CAP.doc){try{CAP.doc.set(clone(CFG)).catch(function(){})}catch(e){}}},700);
}
function loadLocalCfg(){try{mergeCfg(JSON.parse(lsGet(CFG_KEY,'null')))}catch(e){}}
