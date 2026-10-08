/* =====================================================================
   XP E NÍVEIS: +10 por tarefa concluída, +15 quando você aprova,
   +20 quando a verificação real bate a meta, −5 quando a revisão devolve.
   Nível n exige 20·(n−1)² XP. "Agente do mês" = mais XP no mês corrente.
   ===================================================================== */
function monthKey(d){d=d||new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)}
function xpOf(aid){return F.XP[aid]||(F.XP[aid]={xp:0,m:{}})}
function xpForLevel(n){return 20*(n-1)*(n-1)}
function xpLevel(aid,Fl){var x=(Fl||F).XP[aid];if(!x)return 1;return Math.floor(Math.sqrt(x.xp/20))+1}
function addXP(aid,n){
  if(!F.AG[aid]||aid==='gab'||aid===F.RECID||!n)return;
  var x=xpOf(aid),before=xpLevel(aid),mk=monthKey();
  x.xp=Math.max(0,x.xp+n);x.m[mk]=Math.max(0,(x.m[mk]||0)+n);
  Object.keys(x.m).sort().slice(0,-3).forEach(function(k){delete x.m[k]});
  var after=xpLevel(aid);
  if(after>before)log(F.AG[aid].name+' subiu para o nível '+after+'!','k-ok');
}
function agentOfMonth(){
  var mk=monthKey(),best=null;
  FLOORIDS.forEach(function(id){var Fl=FLOORS[id];Object.keys(Fl.XP).forEach(function(k){var v=(Fl.XP[k].m||{})[mk]||0;if(v>0&&Fl.AG[k]&&(!best||v>best.xp))best={a:Fl.AG[k],Fl:Fl,xp:v}})});
  return best;
}
