/* =====================================================================
   ENTREGAS: o que o agente está entregando para você aprovar
   ===================================================================== */
function genericDv(a,t){
  return {tipo:'Rascunho (modo demonstração)',demo:true,blocos:[
    ['Pedido recebido',t?t.title:'—'],
    ['O que '+a.name+' entregaria','Em modo demonstração o conteúdo final não é gerado. Ligue "Agentes com IA real" na aba Agentes para receber o texto completo, escrito com o contexto e a memória do agente.']],
    impacto:'Sem estimativa no modo demonstração.',depois:a.name+' segue com a tarefa conforme você decidir.'};
}
function buildView(a,t,ap){
  var res=t&&t.result,v={tipo:'Entrega',blocos:[],texto:'',impacto:'',depois:'',checks:[],src:'',demo:false,mem:[],agente:a.name,tarefa:t?t.title:ap.title};
  if(res&&res.entrega){
    v.tipo=res.tipo||'Entrega da IA';v.texto=res.entrega;v.impacto=res.impacto;v.depois=res.depois;
    v.checks=(res.checagem||[]).slice(0,5);
    v.src=t.reviewedBy==='ia'?'Autoverificação do agente + revisão com IA de '+F.AG[F.REVID].name:'Autoverificação do agente (a revisão simulada não leu este texto)';
  }else{
    var dv=(t&&t.tpl&&F.DV[t.tpl.t])||genericDv(a,t);
    v.tipo=dv.tipo;v.blocos=dv.blocos.map(function(b){return [b[0],fillData(b[1])]});v.impacto=fillData(dv.impacto);v.depois=fillData(dv.depois);v.demo=true;
    v.checks=(F.CHK[a.id]||['Dentro das regras do time']).slice();
    if(t&&t.rework)v.checks.unshift('Corrigido depois que '+F.AG[F.REVID].name+' devolveu ('+t.rework+')');
    v.src=F.AG[F.REVID].name+' (simulação)';
    if(!F.DV[t&&t.tpl&&t.tpl.t])v.checks=[];
  }
  v.pdcaReal=!!(res&&res.pdca&&res.pdca.plan);v.pdca=v.pdcaReal?res.pdca:pdcaSim(a,t||{title:ap.title});
  var mem=(t&&t.mem)||[];
  v.mem=mem.filter(function(m){return m.kind!=='regra'}).slice(0,3).concat(mem.filter(function(m){return m.kind==='regra'}).slice(0,1));
  return v;
}
function viewText(v,max){
  var s=v.texto||v.blocos.map(function(b){return b[0]+':\n'+b[1]}).join('\n\n');
  return s.length>max?s.slice(0,max-1)+'…':s;
}
function previewHtml(v){
  if(v.texto)return '<div class="prev">'+esc(v.texto.slice(0,230))+(v.texto.length>230?'…':'')+'</div>';
  return '<div class="prev"><b>'+esc(v.tipo)+'</b><br>'+v.blocos.map(function(b){return '• '+esc(b[0])}).join('<br>')+'</div>';
}
/* ---------- janela de revisão da entrega ---------- */
var apOpen=null;
function openApproval(id){
  var o=F.approvals.filter(function(x){return x.id==id})[0];if(!o||!o.view)return;
  apOpen=id;var v=o.view,a=F.AG[o.agent],red=o.kind==='vermelho';
  var body=v.texto?'<pre class="deliv">'+esc(v.texto)+'</pre>':
    v.blocos.map(function(b){return '<div class="blk"><h4>'+esc(b[0])+'</h4><div class="deliv">'+esc(b[1])+'</div></div>'}).join('');
  var h='<div class="aph"><div><span class="chip" style="--c:'+(red?'#ff6a5c':'#f4b860')+'">'+(red?'Confirmação dupla (dinheiro)':'Aprovação')+'</span>'+
    '<h2 id="apT">'+esc(a.name)+' entregou: '+esc(v.tarefa)+'</h2><p class="hint" style="margin:0">'+esc(a.role)+'</p></div><button class="btn ghost sm" data-m="close" id="apClose">Fechar</button></div>';
  if(v.demo)h+='<div class="note">Modo demonstração: o conteúdo abaixo é um exemplo do que o agente entregaria. Ligue "Agentes com IA real" na aba Agentes para receber o texto real.</div>';
  h+='<div class="aps"><h3>Resumo</h3><p>'+esc(o.d)+'</p></div>'+
     '<div class="aps"><h3>'+esc(v.tipo)+': o que será entregue</h3>'+body+'</div>'+
     '<div class="aps two"><div><h3>Impacto esperado</h3><p>'+esc(v.impacto||'Não informado.')+'</p></div><div><h3>Se você aprovar</h3><p>'+esc(v.depois||'Não informado.')+'</p></div></div>';
  if(v.pdca)h+=pdcaHtml(v);
  if(v.checks.length)h+='<div class="aps"><h3>Checagem · '+esc(v.src)+'</h3><ul class="ck">'+v.checks.map(function(c){return '<li>'+esc(c)+'</li>'}).join('')+'</ul></div>';
  if(v.mem.length)h+='<div class="aps"><h3>O que o time lembrou ao preparar isso</h3><ul>'+v.mem.map(function(m){return '<li><b>'+KINDS[m.kind].l+'</b> ('+esc(nameOf(m.author))+'): '+esc(m.text.slice(0,160))+'</li>'}).join('')+'</ul></div>';
  h+='<div class="aps"><h3>Sua decisão</h3><div class="acts"><button class="btn" data-m="ok">Aprovar</button><button class="btn ghost" data-m="adjtoggle">Pedir ajuste</button><button class="btn no" data-m="notoggle">Recusar</button></div>'+
     '<div class="adj ajrow"><textarea rows="2" placeholder="O que o agente deve mudar?" aria-label="Ajuste"></textarea><button class="btn sm" data-m="adj">Enviar ajuste</button></div>'+
     '<div class="adj rej"><textarea rows="2" placeholder="Por que recusou? (o time guarda isso e não repete)" aria-label="Motivo da recusa"></textarea><button class="btn no sm" data-m="no">Confirmar recusa</button></div></div>';
  $('#apBody').innerHTML=h;openDlg($('#apDlg'));$('#apDlg .dlg').scrollTop=0;
  var c=$('#apClose');if(c)c.focus();
}
function closeApprovalDlg(){apOpen=null;closeDlg($('#apDlg'))}
$('#apDlg').addEventListener('close',function(){apOpen=null});
$('#apDlg').addEventListener('click',function(e){
  if(e.target===this){closeApprovalDlg();return}
  var b=e.target.closest('button');if(!b)return;
  var act=b.dataset.m;if(!act)return;
  var dlg=$('#apBody');
  if(act==='close'){closeApprovalDlg();return}
  if(act==='adjtoggle'){dlg.querySelector('.ajrow').classList.toggle('on');dlg.querySelector('.rej').classList.remove('on');return}
  if(act==='notoggle'){dlg.querySelector('.rej').classList.toggle('on');dlg.querySelector('.ajrow').classList.remove('on');return}
  var o=F.approvals.filter(function(x){return x.id==apOpen})[0];if(!o){closeApprovalDlg();return}
  if(act==='ok'){
    if(o.kind==='vermelho'&&!b.dataset.armed){b.dataset.armed='1';b.textContent='Confirmar de novo';setTimeout(function(){if(b.isConnected){delete b.dataset.armed;b.textContent='Aprovar'}},4000);return}
    closeApprovalDlg();decide(o.id,'ok');return;
  }
  if(act==='adj'){var ta=dlg.querySelector('.ajrow textarea'),v=ta.value.trim();if(!v){ta.focus();return}closeApprovalDlg();decide(o.id,'adj',v);return}
  if(act==='no'){var r=dlg.querySelector('.rej textarea').value;closeApprovalDlg();decide(o.id,'no',r);return}
});


