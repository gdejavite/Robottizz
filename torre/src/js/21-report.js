/* =====================================================================
   RELATÓRIO SEMANAL (Cobertura): uma página por andar com metas, gargalo,
   decisões, lições e ranking do time. Abre numa janela e imprime/salva em PDF.
   ===================================================================== */
var WEEK=7*864e5;
function reportHtml(){
  var since=Date.now()-WEEK,today=new Date().toLocaleDateString('pt-BR'),rv=revenueSum(),aom=agentOfMonth();
  var h='<header class="rp-h"><h1>Torre Gabriel · Relatório semanal</h1><p>'+new Date(since).toLocaleDateString('pt-BR')+' a '+today+'</p></header>';
  h+='<section class="rp-sum"><div><b>'+(rv.parts.length?fmtM({f:'brl0'},rv.tot):'—')+'</b><span>Receita mensal somada</span></div><div><b>'+FLOORIDS.reduce(function(s,id){return s+FLOORS[id].approvals.length},0)+'</b><span>Pendências agora</span></div><div><b>'+(aom?esc(aom.a.name):'—')+'</b><span>Agente do mês</span></div></section>';
  FLOORIDS.slice().sort(function(a,b){return FLOORS[b].FMETA.andar-FLOORS[a].FMETA.andar}).forEach(function(id){
    var Fl=FLOORS[id],ev=Fl.journal.filter(function(e){return e.ts>since}),bn=bottleneck(Fl);
    var cnt=function(re){return ev.filter(function(e){return re.test(e.x)}).length};
    var dec=ev.filter(function(e){return /^Você (aprovou|recusou|pediu ajuste)|^Decisão|^Ata ·|decidido pelo Slack/.test(e.x)}).slice(-12);
    var les=Fl.MEM.filter(function(m){return m.t>since&&m.kind!=='regra'}).sort(function(a,b){return memScore(b)-memScore(a)}).slice(0,6);
    var rank=Object.keys(Fl.XP).filter(function(k){return Fl.AG[k]}).sort(function(a,b){return Fl.XP[b].xp-Fl.XP[a].xp}).slice(0,5);
    h+='<section class="rp-f"><h2>'+Fl.FMETA.andar+'º andar · '+esc(Fl.FMETA.empresaLong||Fl.FMETA.nome)+'</h2>'+
      (bn?'<p class="rp-bn"><b>Gargalo nº 1:</b> '+esc(bn.m.n)+' em '+bn.p+'% da meta.</p>':'')+
      '<table><tr><th>Meta</th><th>Atual</th><th>Alvo</th><th>%</th></tr>'+Object.keys(Fl.MET).map(function(k){var m=Fl.MET[k];return '<tr><td>'+esc(m.n)+'</td><td>'+fmtM(m,m.v)+'</td><td>'+fmtM(m,m.m)+'</td><td>'+(m.v==null?'—':metPct(m)+'%')+'</td></tr>'}).join('')+'</table>'+
      '<p class="rp-k">Na semana: '+cnt(/ concluiu "/)+' tarefas concluídas · '+cnt(/^Você aprovou/)+' aprovações · '+cnt(/^Você recusou/)+' recusas · '+cnt(/ devolveu "/)+' devoluções da revisão · '+cnt(/^Reunião iniciada/)+' reuniões.</p>'+
      '<h3>Decisões</h3>'+(dec.length?'<ul>'+dec.map(function(e){return '<li>'+new Date(e.ts).toLocaleDateString('pt-BR')+' · '+esc(e.x)+'</li>'}).join('')+'</ul>':'<p>Nenhuma decisão registrada.</p>')+
      '<h3>O que o time aprendeu</h3>'+(les.length?'<ul>'+les.map(function(m){return '<li><b>'+KINDS[m.kind].l+':</b> '+esc(m.text)+'</li>'}).join('')+'</ul>':'<p>Sem lições novas.</p>')+
      '<h3>Ranking do time</h3>'+(rank.length?'<ol>'+rank.map(function(k){return '<li>'+esc(Fl.AG[k].name)+' ('+esc(Fl.AG[k].role)+') · nível '+xpLevel(k,Fl)+' · '+Fl.XP[k].xp+' XP</li>'}).join('')+'</ol>':'<p>Sem XP ainda.</p>')+
      '</section>';
  });
  h+='<footer class="rp-ft">Gerado pela Torre Gabriel em '+today+' '+hhmm()+'. Números marcados como simulados vêm da demonstração.</footer>';
  return h;
}
function openReport(){
  $('#reportBody').innerHTML='<div class="report">'+reportHtml()+'</div>';
  openDlg($('#reportDlg'));
}
$('#reportDlg').addEventListener('click',function(e){
  if(e.target===this){closeDlg(this);return}
  var b=e.target.closest('button');if(!b)return;
  if(b.dataset.r==='close')closeDlg(this);
  else if(b.dataset.r==='print'){
    var pa=$('#printArea');pa.innerHTML=$('#reportBody').innerHTML;document.body.classList.add('print-report');
    closeDlg(this);
    setTimeout(function(){try{window.print()}catch(err){}},50);
  }
});
window.addEventListener('afterprint',function(){document.body.classList.remove('print-report');$('#printArea').innerHTML=''});
