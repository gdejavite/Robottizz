/* =====================================================================
   n8n: fila de execução real (ex.: Otto cria a campanha PAUSADA depois da
   sua aprovação) e leitura das decisões tomadas pelos botões do Slack.
   O formato das ferramentas do n8n é lido na hora (describeTool), como no Slack.
   ===================================================================== */
var N8N_READ=['get_data_table_rows','list_data_table_rows','search_data_table_rows','query_data_table_rows','get_rows'],n8nReadTool=null;
async function n8nAddRow(table,row){
  if(!CAP.mcp)throw {code:'server_not_connected'};
  await CAP.mcp.callTool('n8n','add_data_table_rows',{dataTableId:table,projectId:CFG.notify.n8nProject,rows:[row]});
}
async function n8nRows(table){
  if(!CAP.mcp)throw {code:'server_not_connected'};
  if(!n8nReadTool){
    for(var i=0;i<N8N_READ.length&&!n8nReadTool;i++){
      try{var sc=await CAP.mcp.describeTool('n8n',N8N_READ[i]);n8nReadTool={tool:N8N_READ[i],props:(sc.inputSchema||{}).properties||{}}}
      catch(e){if(e&&(e.code==='server_not_connected'||e.code==='needs_reauth'||e.code==='not_in_manifest'))throw e}
    }
    if(!n8nReadTool)throw {code:'x',message:'o conector do n8n não tem ferramenta para ler linhas de tabela'};
  }
  var input={};
  Object.keys(n8nReadTool.props).forEach(function(k){
    if(/table/i.test(k))input[k]=table;else if(/project/i.test(k))input[k]=CFG.notify.n8nProject;else if(/^limit$|take|page_?size/i.test(k))input[k]=100;
  });
  var res=await CAP.mcp.callTool('n8n',n8nReadTool.tool,input);
  var rows=parseRows(res);
  if(!rows&&res&&Array.isArray(res.data))rows=res.data;
  return rows||[];
}
/* ---------- execução real depois da aprovação ---------- */
function runAction(o){
  var N=CFG.notify,a=F.AG[o.agent],ex=o.exec,Fl=F;
  if(!N.execOn||!N.n8nExecTable||!N.n8nProject){log(a.name+' registrou a execução de "'+(ex.label||ex.acao)+'" (execução real desligada: simulado).','k-meet');return}
  var row={acao:ex.acao,parametros:JSON.stringify(ex.params||{}),andar:Fl.FMETA.nome,agente:a.name,titulo:String(o.title).slice(0,200),ap_key:o.key||'',status:'pendente',aprovado_em:new Date().toISOString()};
  n8nAddRow(N.n8nExecTable,row).then(function(){inFloor(Fl,function(){log(a.name+' enviou para execução no n8n: '+(ex.label||ex.acao)+'. O fluxo executa e registra o resultado.','k-ok')})},
    function(e){inFloor(Fl,function(){log('Não consegui enviar a execução para o n8n ('+mcpErr(e)+'). Nada foi executado.','k-red')})});
}
/* ---------- decisões vindas do Slack (o n8n grava cada clique numa tabela) ---------- */
var SEEN_KEY='torre_dec_vistas',seenDec={};
try{seenDec=JSON.parse(lsGet(SEEN_KEY,'{}'))||{}}catch(e){seenDec={}}
var SLACK_ACT={aprovar:'ok',aprovar2:'ok',ok:'ok',recusar:'no',no:'no',a:'A',b:'B',agendar:'agendar'};
async function pollRemoteDecisions(manual){
  var N=CFG.notify;
  if(!N.slackApprove||!N.n8nDecTable||!N.n8nProject)return 'Aprovação pelo Slack desligada ou sem a tabela de decisões.';
  var rows;
  try{rows=await n8nRows(N.n8nDecTable)}catch(e){return 'Não consegui ler as decisões: '+mcpErr(e)+'.'}
  var applied=0,waiting=0;
  rows.forEach(function(r){
    var key=String(r.ap_key||'').trim(),dec=String(r.decisao||r.decision||'').trim().toLowerCase(),id=key+'|'+dec;
    if(!key||!dec||seenDec[id])return;
    var hit=findApproval(key),act=SLACK_ACT[dec];
    if(!hit||!act){if(!hit)seenDec[id]=Date.now();return}
    /* dinheiro e documento oficial: no Slack também exige a segunda confirmação (aprovar2) */
    if(hit.o.kind==='vermelho'&&act==='ok'&&dec!=='aprovar2'){waiting++;return}
    seenDec[id]=Date.now();applied++;
    inFloor(hit.Fl,function(){decide(hit.o.id,act,String(r.motivo||r.ajuste||''),'pelo Slack')});
  });
  var ks=Object.keys(seenDec);if(ks.length>400)ks.sort(function(a,b){return seenDec[a]-seenDec[b]}).slice(0,ks.length-400).forEach(function(k){delete seenDec[k]});
  lsSet(SEEN_KEY,JSON.stringify(seenDec));
  var msg=applied?applied+' decisão(ões) do Slack aplicada(s).':'Nenhuma decisão nova.';
  if(waiting)msg+=' '+waiting+' de dinheiro aguardam a segunda confirmação (aprovar2).';
  return msg;
}
