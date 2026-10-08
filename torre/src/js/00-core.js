/* =====================================================================
   NÚCLEO: utilitários e constantes comuns a todos os andares
   ===================================================================== */
var $=function(s){return document.querySelector(s)};
var _put={};
/* só troca o HTML quando ele mudou (evita repintar e perder foco/hover) */
function put(selector,html){if(_put[selector]===html)return;_put[selector]=html;var e=document.querySelector(selector);if(e)e.innerHTML=html}
function rnd(a,b){return a+Math.random()*(b-a)}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function hhmm(d){d=d||new Date();return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function brl(n){return 'R$ '+n.toFixed(2).replace('.',',')}
function mergeInto(dst,src){Object.keys(src).forEach(function(k){dst[k]=src[k]})}
function clone(o){return JSON.parse(JSON.stringify(o))}
function lsGet(k,def){try{var v=localStorage.getItem(k);return v==null?def:v}catch(e){return def}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function hashStr(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return h}
/* troca o HTML de um contêiner só quando a assinatura muda */
function putSig(el,html){
  if(!el)return false;var sig=String(hashStr(html));
  if(el.getAttribute('data-sig')===sig)return false;
  el.setAttribute('data-sig',sig);el.innerHTML=html;return true;
}

var ST={idle:{l:'Disponível',c:'#8a93ab'},trabalhando:{l:'Trabalhando',c:'#6fd3a0'},revisando:{l:'Revisando',c:'#7aa7ff'},
  esperando:{l:'Esperando',c:'#f4b860'},travado:{l:'Travado',c:'#ff6a5c'},reuniao:{l:'Em reunião',c:'#c79bff'}};
var LV={supervisionado:{l:'Supervisionado',d:'toda entrega passa por aprovação do Gabriel antes de sair',h:'Toda entrega vem para você aprovar.'},
 equilibrado:{l:'Equilibrado',d:'pede aprovação para ações sensíveis (publicar, enviar proposta ao cliente) e sempre para dinheiro',h:'Pede aprovação para ações sensíveis (padrão).'},
 autonomo:{l:'Autônomo',d:'executa sozinho o que for de risco médio e apenas avisa depois; dinheiro, conta de trading e documento oficial sempre pedem aprovação',h:'Executa o amarelo sozinho e avisa. Vermelho sempre pede.'}};
var KINDS={regra:{l:'Regra do Gabriel',c:'#f4b860'},preferencia:{l:'Preferência',c:'#c79bff'},evitar:{l:'Evitar',c:'#ff6a5c'},
  repetir:{l:'Repetir',c:'#6fd3a0'},insight:{l:'Insight',c:'#7aa7ff'},decisao:{l:'Decisão',c:'#59c7e0'}};
/* palavras-chave comuns a todos os andares; cada andar soma as suas (def.KW) */
var BASE_KW=[[/carrossel/i,'carrossel'],[/reels/i,'reels'],[/legenda/i,'legenda'],[/drawdown/i,'drawdown'],[/ranking|mql5/i,'ranking'],[/\bea\b|eas\b/i,'ea'],
 [/cpl|campanha|an[uú]ncio|verba|or[cç]amento/i,'campanha'],[/lead|dm\b/i,'leads'],[/proposta/i,'proposta'],[/token|conex/i,'conexao'],
 [/deploy|vercel|publicar atual/i,'deploy'],[/relat[oó]rio/i,'relatorio'],[/post/i,'post']];
/* contexto padrão de cada agente (todas as empresas); preenchido por registerFloor */
var DEFCTX={};
var CAP={sample:null,db:null,mcp:null,perms:null,doc:null,uso:null,state:null,docMs:{},ready:false,mcpInfo:{},uid:null};
