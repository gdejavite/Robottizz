/* =====================================================================
   PAINEL DE CONFIGURAÇÕES (aba Agentes): autonomia, avisos, Slack, n8n,
   dados da empresa, preferências, consumo de IA e método de gestão.
   Um único ouvinte de clique e um de mudança para todo o painel.
   ===================================================================== */
function chip(t,ok){return '<span class="chip '+(ok?'ok':'bad')+'">'+t+'</span>'}
function chk(id,on,label,dis){return '<div class="chk"><input type="checkbox" id="'+id+'"'+(on?' checked':'')+(dis?' disabled':'')+'><label for="'+id+'" style="margin:0;color:var(--text)">'+label+'</label></div>'}
function fld(id,label,val,ph,extra){return '<label for="'+id+'">'+label+'</label><input type="text" id="'+id+'" value="'+esc(val||'')+'" placeholder="'+esc(ph||'')+'"'+(extra||'')+'>'}
var dataFloor=null;
function varsToText(v){return Object.keys(v||{}).map(function(k){return k+' = '+v[k]}).join('\n')}
function textToVars(t){var o={};String(t||'').split('\n').forEach(function(l){var m=l.match(/^\s*(\w{1,40})\s*[=:]\s*(.*)$/);if(m)o[m[1]]=m[2].trim().slice(0,300)});return o}
function dataBox(){
  var fid=dataFloor||(VIEW&&VIEW.id)||FLOORIDS[0],Fl=FLOORS[fid],d=companyData(fid),need=(Fl.def.DATAVARS||[]);
  var missing=need.filter(function(k){return !d.vars[k]});
  var metKeys=Object.keys(Fl.MET);
  return '<div class="box" id="dataBox" style="grid-column:1/-1"><h3>Dados da empresa (privados)</h3>'+
    '<p class="hint" style="margin:0 0 8px">Números reais e fatos internos ficam aqui, salvos na sua conta e neste aparelho, e não no código da página. Os agentes usam esses dados nos prompts e nas entregas de exemplo; as metas podem vir do Supabase.</p>'+
    '<label for="dataFloorSel">Andar</label><select id="dataFloorSel">'+FLOORIDS.map(function(id){var m=FLOORS[id].FMETA;return '<option value="'+id+'"'+(id===fid?' selected':'')+'>'+m.andar+'º · '+esc(m.nome)+'</option>'}).join('')+'</select>'+
    (missing.length?'<div class="note">Faltam '+missing.length+' dado(s) usados pelos agentes: '+esc(missing.join(', '))+'. Importe o arquivo de dados ou preencha abaixo.</div>':'')+
    '<label for="dataFacts">Fatos e linha de base (texto livre que vai para todos os agentes deste andar)</label><textarea id="dataFacts" rows="5" maxlength="6000" placeholder="Ex.: receita de set/2026, permanência média, situação do pipeline…">'+esc(d.facts)+'</textarea>'+
    '<label for="dataVars">Variáveis usadas nos textos ({{nome}}), uma por linha: nome = valor</label><textarea id="dataVars" rows="6" placeholder="receita_set = R$ 0.000">'+esc(varsToText(d.vars))+'</textarea>'+
    '<div class="acts" style="margin-top:8px"><button class="btn sm" id="dataSave">Salvar dados</button><label class="btn ghost sm filebtn">Importar arquivo (.json)<input type="file" id="dataFile" accept="application/json,.json" hidden></label><button class="btn ghost sm" id="dataExport">Exportar</button><span class="saved" id="dataMsg" aria-live="polite"></span></div>'+
    '<h3 style="margin-top:16px">Metas sincronizadas com o Supabase</h3>'+
    '<p class="hint" style="margin:0 0 6px">Cada consulta deve devolver linhas em ordem cronológica com a coluna <b>valor</b>; a última linha vira o valor atual e as anteriores, o histórico. Use só dados agregados (LGPD). Exige o conector Supabase liberado nesta página.</p>'+
    fld('supaProject','ID do projeto Supabase',d.supa.project,'ex.: abcdefghijklmnop')+
    metKeys.map(function(k){var m=Fl.MET[k];return '<label for="supaQ_'+k+'">'+esc(m.n)+' <small class="hint">('+k+')</small></label><textarea id="supaQ_'+k+'" class="supaq" data-k="'+k+'" rows="2" placeholder="select mes, valor from vw_'+k+' order by mes">'+esc(d.supa.q[k]||'')+'</textarea>'}).join('')+
    chk('supaAuto',d.auto,'Sincronizar sozinho ao abrir a Torre (e a cada 6 horas)')+
    '<div class="acts" style="margin-top:8px"><button class="btn sm" id="supaSave">Salvar consultas</button><button class="btn ghost sm" id="supaSync">Sincronizar agora</button></div><p class="hint" id="supaMsg" style="margin:8px 0 0"></p></div>';
}
function renderSettings(){
  var n=CFG.notify,mi=CAP.mcpInfo||{};
  var st=chip(CAP.sample?'IA disponível':'IA indisponível aqui',!!CAP.sample)+chip(CAP.doc?'Salvo na sua conta':'Salvo só neste aparelho',!!CAP.doc)+
    chip(mi.Gmail==='connected'?'Gmail conectado':(CAP.mcp?'Gmail: confirme na 1ª vez':'Gmail indisponível aqui'),mi.Gmail==='connected')+
    chip(mi.Slack==='connected'?'Slack conectado':(CAP.mcp?'Slack: confirme na 1ª vez':'Slack indisponível aqui'),mi.Slack==='connected')+
    chip(mi.Supabase==='connected'?'Supabase conectado':(CAP.mcp?'Supabase: confirme na 1ª vez':'Supabase indisponível aqui'),mi.Supabase==='connected');
  var ae=document.activeElement,keep=ae&&ae.id&&$('#settings').contains(ae)?ae.id:null;
  $('#settings').innerHTML=
   '<div class="box"><h3>Autonomia dos agentes</h3>'+
   chk('cfgReal',CFG.real,'Agentes com IA real',!CAP.sample)+
   '<p class="hint" style="margin:0 0 6px">Cada tarefa é executada pela IA com o contexto de cada agente; a revisão (Íris/Rui) lê o texto de verdade e a Recepção usa IA quando não reconhece o pedido. Gasta o uso do seu Claude. Com isso ligado, as tarefas de exemplo param: os agentes trabalham nos seus pedidos (aba Chat) e na rotina de cada um.</p>'+
   '<div class="st">'+st+'</div></div>'+
   '<div class="box"><h3>Me avisar por e-mail</h3>'+
   chk('cfgEmailOn',n.emailOn,'Enviar e-mail quando precisarem de mim')+
   fld('cfgEmail','Seu e-mail (o aviso só vai para este endereço)',n.email,'voce@exemplo.com',' inputmode="email" autocomplete="email"')+
   '<div class="acts" style="margin-top:10px"><button class="btn ghost sm" id="tstEmail">Enviar e-mail de teste</button></div><p class="hint" id="msgEmail" style="margin:8px 0 0"></p></div>'+
   '<div class="box"><h3>Me avisar no Slack</h3>'+
   chk('cfgSlackOn',n.slackOn,'Enviar mensagem no Slack quando precisarem de mim')+
   FLOORIDS.map(function(id){var m=FLOORS[id].FMETA;return fld('cfgSlack_'+id,'Canal do '+m.andar+'º andar ('+esc(m.nome)+'): ID do canal',slackChannelFor(id),'Ex.: C0C6LR7QZN0')}).join('')+
   '<p class="hint" style="margin:6px 0 0">No Slack: abra o canal e use "Copiar ID".</p>'+
   fld('cfgLink','Link da Torre nos avisos',n.link,'https://claude.ai/artifact/…')+
   '<div class="acts" style="margin-top:10px">'+FLOORIDS.map(function(id){return '<button class="btn ghost sm" data-ts="'+id+'">Testar '+esc(FLOORS[id].FMETA.nome)+'</button>'}).join('')+'</div><p class="hint" id="msgSlack" style="margin:8px 0 0"></p></div>'+
   '<div class="box"><h3>Bot do n8n, aprovação pelo Slack e execução real</h3>'+
   chk('cfgViaBot',n.viaBot,'Enviar os avisos pelo bot do n8n (foto, nome e função de cada agente)')+
   fld('cfgN8nProject','ID do projeto no n8n',n.n8nProject,'ID do projeto no n8n')+
   fld('cfgN8nTable','Tabela da fila de avisos',n.n8nTable,'ID da tabela de avisos')+
   chk('cfgSlackApprove',n.slackApprove,'Aprovar pelo Slack: o aviso leva botões ✅/❌ e a Torre aplica a decisão')+
   fld('cfgN8nDecTable','Tabela de decisões (o n8n grava os cliques)',n.n8nDecTable,'ID da tabela de decisões')+
   chk('cfgExecOn',n.execOn,'Execução real: ao aprovar, ações marcadas (ex.: criar campanha pausada) vão para a fila do n8n')+
   fld('cfgN8nExecTable','Tabela de execuções',n.n8nExecTable,'ID da tabela de execuções')+
   '<p class="hint" style="margin:6px 0 0">Ligue cada item só depois que o fluxo correspondente estiver ativo no n8n (veja o guia em torre/docs). Nada é executado sem a sua aprovação na Torre ou no Slack.</p>'+
   '<div class="acts" style="margin-top:8px"><button class="btn ghost sm" id="tstDec">Ler decisões agora</button></div><p class="hint" id="msgN8n" style="margin:8px 0 0"></p></div>'+
   '<div class="box"><h3>Preferências</h3>'+
   chk('cfgSound',CFG.sound,'Sons (elevador e alerta de agente travado)')+
   '<p class="hint" style="margin:6px 0 0">Atalhos: <kbd>1</kbd>–<kbd>7</kbd> abas, <kbd>E</kbd> próximo andar, <kbd>R</kbd> revisar a próxima pendência, <kbd>Esc</kbd> fechar, <kbd>?</kbd> ajuda.</p></div>'+
   '<div class="box"><h3>Quando eu sou avisado</h3><div class="rule"><i class="y"></i><span>Aprovação de ação sensível (publicar, enviar proposta)</span></div><div class="rule"><i class="r"></i><span>Confirmação dupla (dinheiro, verba, conta de trading)</span></div><div class="rule"><i class="y"></i><span>Pedido de reunião, com opções e recomendação</span></div><div class="rule"><i class="r"></i><span>Agente travado (token expirado, por exemplo)</span></div><div class="rule"><i class="g"></i><span>Ação feita sozinha por agente autônomo (só para eu saber)</span></div>'+
   '<p class="hint" style="margin:8px 0 0">O aviso chega por e-mail ou Slack; eu decido aqui em "Precisam de você" ou, com a aprovação pelo Slack ligada, pelos botões.</p></div>'+
   dataBox()+usoBox()+methodBox();
  if(keep){var el=document.getElementById(keep);if(el)el.focus()}
}
async function ensurePerm(name){if(CAP.perms){try{await CAP.perms.request(['mcp:'+name])}catch(e){}}}
function setMsg(id,t){var m=document.getElementById(id);if(m)m.textContent=t}
$('#settings').addEventListener('change',async function(e){
  var id=e.target.id,n=CFG.notify,v=e.target.type==='checkbox'?e.target.checked:String(e.target.value||'').trim();
  var boolMap={cfgEmailOn:['emailOn','Gmail'],cfgSlackOn:['slackOn','Slack'],cfgViaBot:['viaBot','n8n'],cfgSlackApprove:['slackApprove','n8n'],cfgExecOn:['execOn','n8n']};
  var txtMap={cfgEmail:'email',cfgLink:'link',cfgN8nProject:'n8nProject',cfgN8nTable:'n8nTable',cfgN8nDecTable:'n8nDecTable',cfgN8nExecTable:'n8nExecTable'};
  if(id==='cfgReal'){CFG.real=v;saveCfg();inFloor(VIEW,function(){log(CFG.real?'Agentes com IA real ligados: tarefas passam a usar o contexto de cada agente.':'Agentes voltaram ao modo de demonstração.','k-meet')})}
  else if(id==='cfgSound'){CFG.sound=v;saveCfg();if(v)playSound('ping')}
  else if(boolMap[id]){n[boolMap[id][0]]=v;saveCfg();if(v)await ensurePerm(boolMap[id][1])}
  else if(txtMap[id]){if(id==='cfgLink'&&v&&!/^https:\/\//.test(v)){setMsg('msgSlack','O link precisa começar com https://');return}n[txtMap[id]]=v.slice(0,300);saveCfg()}
  else if(id.indexOf('cfgSlack_')===0){n.slackBy[id.slice(9)]=v.slice(0,60);saveCfg()}
  else if(id.indexOf('prc_')===0){var kk=id.slice(4),vv=parseFloat(String(e.target.value).replace(',','.'));if(vv>0&&vv<1e6)CFG.price[kk]=vv;else delete CFG.price[kk];saveCfg();usoRefresh(true)}
  else if(id==='dataFloorSel'){dataFloor=v;var db=$('#dataBox');if(db)db.outerHTML=dataBox()}
  else if(id==='supaAuto'){companyData(dataFloor||VIEW.id).auto=v;saveCfg()}
  else if(id==='dataFile'){var f=e.target.files&&e.target.files[0];if(f)importDataFile(f)}
});
$('#settings').addEventListener('click',async function(e){
  var b=e.target.closest('button');if(!b)return;
  var fid=dataFloor||VIEW.id;
  if(b.id==='tstEmail'){
    CFG.notify.email=($('#cfgEmail').value||'').trim();saveCfg();
    if(!EMAIL_RE.test(CFG.notify.email)){setMsg('msgEmail','Digite um e-mail válido primeiro.');return}
    setMsg('msgEmail','Enviando…');b.disabled=true;
    try{await ensurePerm('Gmail');await sendEmail('[Torre Gabriel] Teste de aviso','Este é um teste. Quando um agente precisar de você, o aviso chega assim.');setMsg('msgEmail','E-mail de teste enviado. Confira a caixa de entrada.')}
    catch(err){setMsg('msgEmail','Não enviou: '+mcpErr(err)+'.')}
    b.disabled=false;
  }else if(b.dataset.ts){
    var Fl=FLOORS[b.dataset.ts],fn=Fl.FMETA.nome;
    FLOORIDS.forEach(function(id){var el=document.getElementById('cfgSlack_'+id);if(el)CFG.notify.slackBy[id]=el.value.trim()});saveCfg();
    var ch=slackChannelFor(Fl.id);
    if(!ch){setMsg('msgSlack','Preencha o canal do andar '+fn+' primeiro.');return}
    setMsg('msgSlack','Enviando…');b.disabled=true;
    try{
      if(CFG.notify.viaBot){var rc=Fl.RECID;await ensurePerm('n8n');await queueSlack(queueRow(Fl,rc,Fl.AG[rc].name,'fyi','Teste de aviso','Teste do bot: cada agente chega com a sua foto, nome e função.','Este é um teste. Quando um agente precisar de você, o aviso chega assim, com detalhes na thread.',ch));setMsg('msgSlack','Teste na fila do bot. Sai no Slack em até 1 minuto, se o fluxo do n8n estiver ativo.')}
      else{await ensurePerm('Slack');await slackPost(ch,'**Torre Gabriel · '+fn+'** · Teste de aviso\nQuando um agente precisar de você, o aviso chega assim.');setMsg('msgSlack','Mensagem de teste enviada no canal da '+fn+'. Confira no Slack.')}
    }catch(err){setMsg('msgSlack','Não enviou: '+mcpErr(err)+'.')}
    b.disabled=false;
  }else if(b.id==='tstDec'){
    setMsg('msgN8n','Lendo…');var r=await pollRemoteDecisions(true);setMsg('msgN8n',r);
  }else if(b.id==='usoReset'){
    USO.days={};USO.log=[];USO.ready=true;usoSave();usoRefresh(true);
  }else if(b.id==='saveMethod'){
    CFG.method=($('#cfgMethod').value||'').trim().slice(0,4000);saveCfg();setMsg('msgMethod','Salvo. Vale a partir da próxima tarefa.');inFloor(VIEW,function(){log('Você atualizou o método de gestão dos agentes.','k-meet')});
  }else if(b.id==='resetMethod'){
    CFG.method='';saveCfg();renderSettings();setMsg('msgMethod','Padrão restaurado.');
  }else if(b.id==='dataSave'){
    var d=companyData(fid);d.facts=($('#dataFacts').value||'').slice(0,6000);d.vars=textToVars($('#dataVars').value);saveCfg();
    setMsg('dataMsg','Dados salvos.');refreshAfterData(fid);
  }else if(b.id==='dataExport'){
    exportData();
  }else if(b.id==='supaSave'){
    var c=companyData(fid);c.supa.project=($('#supaProject').value||'').trim();
    document.querySelectorAll('.supaq').forEach(function(t){var v2=t.value.trim();if(v2)c.supa.q[t.dataset.k]=v2;else delete c.supa.q[t.dataset.k]});saveCfg();setMsg('supaMsg','Consultas salvas.');
  }else if(b.id==='supaSync'){
    setMsg('supaMsg','Sincronizando…');b.disabled=true;var res=await syncSupabase(FLOORS[fid]);setMsg('supaMsg',res);b.disabled=false;
  }
});
