/* =====================================================================
   MÉTODO DE GESTÃO: PDCA COMO BASE DE TODA TAREFA
   ===================================================================== */
var MGMT_DEFAULT=[
 'MÉTODO OBRIGATÓRIO: PDCA em toda tarefa.',
 'P (Planejar): defina objetivo e meta mensurável ligados às metas da empresa; indicador e prazo; hipótese; causa raiz do problema (5 Porquês ou Ishikawa quando o problema se repetir); priorize (Pareto ou matriz GUT); plano de ação em 5W2H (o quê, por quê, quem, onde, quando, como, quanto custa); riscos antes de agir (FMEA simples).',
 'D (Executar): execute em escala pequena (piloto), seguindo o plano e registrando o que foi feito; controle o fluxo com Kanban e limite de trabalho em andamento.',
 'C (Verificar): meça o resultado contra a meta, no prazo definido, com dado real da fonte; compare previsto x realizado e aponte o desvio e a causa. Nunca pule esta etapa.',
 'A (Agir): se atingiu a meta, padronize (checklist ou POP) e replique; se não, ajuste o plano ou abandone, e registre a lição na memória.',
 'Ferramentas e quando usar: PDCA (ciclo base de tudo); 5W2H (plano de ação); 5 Porquês e Ishikawa (causa raiz); Pareto, curva ABC e GUT (priorização e compras); Kanban (fluxo e WIP); SIPOC (mapear processo); FMEA (risco antes de agir); A3 (decisão de grande impacto); Kaizen (melhoria contínua pequena); 5S (organização de dados e arquivos); RACI (quem decide o quê).',
 'LGPD: use dados agregados por padrão; não cite nome, telefone ou e-mail de clientes em canais ou mensagens a terceiros; dado pessoal só quando indispensável e aprovado pelo Gabriel.'
].join('\n');
function methodText(){return (CFG.method&&CFG.method.trim())||MGMT_DEFAULT}
function pdcaSim(a,t){
  var fx=F.METFX[a.id]||[],key=(fx[0]&&F.MET[fx[0][0]])?fx[0][0]:Object.keys(F.MET)[0],m=F.MET[key];
  var meta=m?fmtM(m,m.m):'',atual=m?fmtM(m,m.v):'';
  return {
    plan:{objetivo:m?('Aproximar "'+m.n+'" da meta ('+atual+' → '+meta+')'):t.title,indicador:m?m.n:'',meta:meta,
      hipotese:'Executar "'+t.title+'" melhora o indicador sem aumentar o risco.',
      causa:'Se o problema se repetir, confirmar a causa com 5 Porquês ou Ishikawa.',
      w5h2:['O quê: '+t.title,'Por quê: avançar a meta de '+(m?m.n:'receita'),'Quem: '+a.name+' executa e o Gabriel aprova','Onde: canal ou ferramenta da tarefa','Quando: nesta semana','Como: conforme a entrega acima','Quanto: sem custo, ou verba só com a sua confirmação dupla']},
    do:'Executar em escala pequena (piloto), seguindo o plano e registrando o que foi feito.',
    check:{como:'Medir '+(m?m.n:'o resultado')+' com dado real da fonte e comparar previsto x realizado.',quando:'Em 7 dias após a execução.',criterio:m?('Sucesso se o indicador se aproximar de '+meta+' sem violar as regras do time.'):'Sucesso se a meta do plano for atingida.'},
    act:{sucesso:'Padronizar (checklist ou POP) e replicar nos demais casos.',falha:'Ajustar o plano ou abandonar, e registrar a lição na memória.'},
    ferramentas:['PDCA','5W2H']
  };
}
function normPdca(p){
  if(!p||typeof p!=='object'||!p.plan)return null;
  var s=function(x,n){return String(x||'').slice(0,n||240)};
  var pl=p.plan||{},ck=p.check||{},ac=p.act||{};
  return {plan:{objetivo:s(pl.objetivo),indicador:s(pl.indicador,120),meta:s(pl.meta,120),hipotese:s(pl.hipotese),causa:s(pl.causa_raiz||pl.causa),
      w5h2:Array.isArray(pl.w5h2)?pl.w5h2.slice(0,7).map(function(x){return s(x,160)}):[]},
    do:s(p.do,320),check:{como:s(ck.como),quando:s(ck.quando,120),criterio:s(ck.criterio)},act:{sucesso:s(ac.se_sucesso||ac.sucesso),falha:s(ac.se_falha||ac.falha)},
    ferramentas:Array.isArray(p.ferramentas)?p.ferramentas.slice(0,6).map(function(x){return s(x,40)}):[]};
}
function pdcaHtml(v){
  var p=v.pdca,li=function(arr){return arr&&arr.length?'<ul>'+arr.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>':''};
  return '<div class="aps"><h3>Ciclo PDCA'+(v.pdcaReal?'':' · modelo da demonstração')+'</h3><div class="pdca">'+
    '<div class="pd p"><b>P · Planejar</b><p>'+esc(p.plan.objetivo)+'</p><small>Indicador: '+esc(p.plan.indicador)+' · Meta: '+esc(p.plan.meta)+'</small><p>'+esc(p.plan.hipotese)+'</p>'+(p.plan.causa?'<small>Causa raiz: '+esc(p.plan.causa)+'</small>':'')+li(p.plan.w5h2)+'</div>'+
    '<div class="pd d"><b>D · Executar</b><p>'+esc(p.do)+'</p></div>'+
    '<div class="pd c"><b>C · Verificar</b><p>'+esc(p.check.como)+'</p><small>'+esc(p.check.quando)+' · '+esc(p.check.criterio)+'</small></div>'+
    '<div class="pd a"><b>A · Agir</b><p><b>Se der certo:</b> '+esc(p.act.sucesso)+'</p><p><b>Se não:</b> '+esc(p.act.falha)+'</p></div></div>'+
    (p.ferramentas&&p.ferramentas.length?'<p class="hint" style="margin:8px 0 0">Ferramentas usadas: '+esc(p.ferramentas.join(', '))+'</p>':'')+'</div>';
}
function methodBox(){
  return '<div class="box" style="grid-column:1/-1"><h3>Método de gestão (vale para todos os agentes)</h3>'+
    '<p class="hint" style="margin:0 0 8px">O PDCA é a base de toda tarefa: cada entrega traz Planejar, Executar, Verificar e Agir. Aqui ficam também as ferramentas de gestão e produção e a regra da LGPD. Você pode editar quando quiser.</p>'+
    '<textarea id="cfgMethod" rows="12" maxlength="4000">'+esc(methodText())+'</textarea>'+
    '<div class="acts" style="margin-top:10px"><button class="btn sm" id="saveMethod">Salvar método</button><button class="btn ghost sm" id="resetMethod">Restaurar padrão</button><span class="saved" id="msgMethod" aria-live="polite"></span></div></div>';
}
function ensureRules(){
  addMem({kind:'regra',scope:'time',author:'gab',pin:true,w:5,ik:'pdca-regra',src:'seed',
    text:'Todo trabalho segue o PDCA: planejar (meta, indicador, 5W2H), executar em piloto, verificar com dado real e agir (padronizar ou ajustar). Nunca pular a verificação.',
    tags:['conteudo','post','carrossel','reels','leads','campanha','trafego','cpl','orcamento','obra','compras','cobranca','financeiro','documentos','contrato','ea','ranking','drawdown','relatorio','conexao','automacao','crm','whatsapp','prazo','medicao','etapa','financiamento','proposta','cliente','prova']});
  addMem({kind:'regra',scope:'time',author:'gab',pin:true,w:5,ik:'lgpd-regra',src:'seed',
    text:'LGPD: usar dados agregados por padrão; não expor nome, telefone ou e-mail de clientes em canais ou mensagens a terceiros; dado pessoal só quando indispensável e aprovado.',
    tags:['leads','cliente','crm','whatsapp','conteudo','proposta','cobranca','documentos','contrato','campanha']});
}
