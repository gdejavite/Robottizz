/* =====================================================================
   AVISOS: e-mail (Gmail), Slack direto ou pela fila do bot no n8n
   ===================================================================== */
var EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var NOTIFY_MAX=15,sentCount=0,capWarned=false,notifyChain=Promise.resolve(),notified={};
function mcpErr(e){
  var c=e&&e.code;
  var m={server_not_connected:'conector não conectado: adicione em Configurações → Conectores',needs_reauth:'reconecte o conector em Configurações → Conectores',
    not_in_manifest:'você não permitiu este conector nesta página',consent_required:'permissão do conector pendente',blocked_by_policy:'bloqueado pela política da organização',
    approval_required:'a organização exige aprovação por chamada',server_unavailable:'conector indisponível agora',selection_required:'escolha qual conector usar',
    tool_error:'o conector recusou o envio'+(e&&e.message?': '+String(e.message).slice(0,140):'')};
  return m[c]||(c==='x'&&e.message)||c||'erro inesperado';
}
function torreLink(){return CFG.notify.link||''}
async function sendEmail(subject,body){
  var to=(CFG.notify.email||'').trim();
  if(!EMAIL_RE.test(to))throw {code:'x',message:'e-mail inválido'};
  if(!CAP.mcp)throw {code:'server_not_connected'};
  await CAP.mcp.callTool('Gmail','send_message',{to:[to],subject:subject,body:body});
}
var SLACK_TOOLS=['slack_send_message','slack_post_message'];
var LVEMO={amarelo:'🟡',vermelho:'🔴',reuniao:'🟣',travado:'⚠️',fyi:'✅'};
function slackChannelFor(fid){var n=CFG.notify;return ((n.slackBy&&n.slackBy[fid])||(fid==='rob'?n.slack:'')||'').trim()}
var slackTool=null;
async function slackPost(target,text,threadTs){
  if(!target)throw {code:'x',message:'destino do Slack vazio'};
  if(!CAP.mcp)throw {code:'server_not_connected'};
  if(!slackTool){
    var tool=null,schema=null;
    for(var i=0;i<SLACK_TOOLS.length&&!schema;i++){
      try{schema=await CAP.mcp.describeTool('Slack',SLACK_TOOLS[i]);tool=SLACK_TOOLS[i]}
      catch(e){if(e&&(e.code==='server_not_connected'||e.code==='needs_reauth'||e.code==='not_in_manifest'))throw e}
    }
    if(!schema)throw {code:'x',message:'não consegui ler o formato da ferramenta do Slack'};
    slackTool={tool:tool,props:(schema.inputSchema||{}).properties||{},req:(schema.inputSchema||{}).required||[]};
  }
  var input={},fT=false,fM=false,fH=false;
  Object.keys(slackTool.props).forEach(function(k){
    if(!fT&&/channel|recipient|user_id|^to$/i.test(k)){input[k]=target;fT=true}
    else if(!fM&&/^(message|text|content|body|markdown_text)$/i.test(k)){input[k]=text;fM=true}
    else if(threadTs&&!fH&&/^thread_ts$/i.test(k)){input[k]=threadTs;fH=true}
  });
  var miss=slackTool.req.filter(function(k){return !(k in input)});
  if(!fT||!fM||miss.length)throw {code:'x',message:'formato do Slack diferente do esperado'+(miss.length?' (exige: '+miss.join(', ')+')':'')};
  var out=await CAP.mcp.callTool('Slack',slackTool.tool,input);
  return {res:out,threaded:Object.keys(slackTool.props).some(function(k){return /^thread_ts$/i.test(k)})};
}
/* tenta achar o carimbo de tempo (ts) da mensagem enviada, para responder em thread */
function findTs(res){
  var t='';try{t=JSON.stringify(res)||''}catch(e){}
  var m=t.match(/"(?:ts|message_ts)"\s*:\s*"(\d{10}\.\d{6})"/);if(m)return m[1];
  m=t.match(/\/p(\d{16})/);if(m)return m[1].slice(0,10)+'.'+m[1].slice(10);
  return null;
}
var threadsOk=null;
/* bot do n8n: a Torre grava o aviso numa fila (tabela do n8n) e o fluxo publica no Slack com a foto, o nome e a função do agente.
   Com "aprovar pelo Slack" ligado, a linha leva a chave da aprovação e o fluxo mostra os botões. */
var AVATAR_IDS=['gab','bia','vic','maestro','cleo','luna','rita','trace','buck','atlas','dara','alex','otto','iris'];
async function queueSlack(row){
  var N=CFG.notify;
  if(!N.n8nTable||!N.n8nProject)throw {code:'x',message:'IDs da fila do n8n não preenchidos (aba Agentes → Avisos)'};
  await n8nAddRow(N.n8nTable,row);
}
function queueRow(Fl,aid,who,lv,title,short,body,chan,apKey){
  var ag=aid&&Fl.AG[aid],role=(ag&&ag.role)||'',nm=Fl.FMETA.nome;
  /* agente_id: o n8n usa para buscar a foto do agente; só vale para quem tem foto no servidor de avatares */
  return {andar:nm,empresa:Fl.FMETA.empresa||nm,agente:who||'Torre',agente_id:(aid&&AVATAR_IDS.indexOf(aid)>=0)?aid:'',funcao:role,
    icone:(aid&&Fl.SLEMO[aid])||':office:',nivel:lv,titulo:String(title).slice(0,200),
    resumo:String(short||body||'').slice(0,300),detalhes:String(body||'').slice(0,3500),canal:chan,link:torreLink(),status:'pendente',
    ap_key:apKey||'',botoes:!!(apKey&&CFG.notify.slackApprove)};
}
function notifyRaw(subject,body,key,who,extra){
  var n=CFG.notify,Fl=F,nm=Fl.FMETA.nome,chan=slackChannelFor(Fl.id),aid=extra&&extra.aid,link=torreLink();
  if(!(n.emailOn||n.slackOn))return;
  if(key){key=Fl.id+':'+key;if(notified[key])return;notified[key]=1}
  if(sentCount>=NOTIFY_MAX){
    if(!capWarned){capWarned=true;log('Limite de '+NOTIFY_MAX+' avisos nesta sessão atingido: os próximos não serão enviados até recarregar a Torre.','k-red')}
    return;
  }
  sentCount++;
  var rest=subject.replace(/^\[[^\]]*\]\s*/,''),lv=(extra&&extra.lvl)||'amarelo',short=(extra&&extra.short)||'';
  var ae=(aid&&Fl.AGEMO[aid])||'',head=(LVEMO[lv]||'🟡')+' '+(ae?ae+' ':'')+'Torre Gabriel · '+(who?'Agente '+who+' · ':'')+nm+' · '+rest;
  var lk=link?'[Abrir a Torre]('+link+')':'';
  var mainTxt='**'+head+'**\n'+(short?short+'\n':'')+'Detalhes na thread ↓'+(lk?'  ·  '+lk:'');
  var oneTxt='**'+head+'**\n'+body+(lk?'\n\n'+lk:'');
  /* o envio é assíncrono: os logs voltam para o andar que gerou o aviso */
  var logF=function(t,k){inFloor(Fl,function(){log(t,k)})};
  notifyChain=notifyChain.then(async function(){
    if(n.emailOn){try{await sendEmail(subject,body+(link?'\n\nAbrir a Torre: '+link:''));logF('E-mail enviado para você: '+rest,'k-ok')}catch(e){logF('Não consegui enviar o e-mail: '+mcpErr(e)+'.','k-red')}}
    if(n.slackOn){
      if(!chan){logF('Canal do Slack do andar '+nm+' não definido: aviso não enviado no Slack (aba Agentes).','k-red')}
      else{
        try{
          var queued=false;
          if(n.viaBot){
            try{await queueSlack(queueRow(Fl,aid,who,lv,rest,short||body.slice(0,160),body,chan,extra&&extra.apKey));queued=true;logF('Aviso na fila do bot ('+nm+'): sai no Slack em até 1 min.','k-ok')}
            catch(e2){logF('Fila do bot indisponível ('+mcpErr(e2)+'): enviei direto pelo seu Slack.','k-red')}
          }
          if(!queued){
            if(threadsOk===false){await slackPost(chan,oneTxt)}
            else{
              var r1=await slackPost(chan,mainTxt),ts=findTs(r1.res);
              if(ts&&r1.threaded){threadsOk=true;await slackPost(chan,body,ts)}
              else{threadsOk=false;await slackPost(chan,body)}
            }
            logF('Aviso enviado no Slack ('+nm+').','k-ok');
          }
        }catch(e){logF('Não consegui enviar no Slack: '+mcpErr(e)+'.','k-red')}
      }
    }
    await new Promise(function(r){setTimeout(r,1500)});
  }).catch(function(){});
}
function notifyApproval(o){
  var a=F.AG[o.agent],tag=o.kind==='vermelho'?'Confirmação dupla':o.kind==='reuniao'?'Pedido de reunião':'Aprovação';
  var L=[a.name+' ('+a.role+') precisa de você.','',o.title,'',o.d];
  if(o.view){L.push('','ENTREGA ('+o.view.tipo+'):',viewText(o.view,1800));if(o.view.impacto)L.push('','Impacto esperado: '+o.view.impacto);if(o.view.depois)L.push('Se você aprovar: '+o.view.depois);if(o.view.demo)L.push('','(Modo demonstração: conteúdo de exemplo.)')}
  if(o.view&&o.view.pdca){var pp=o.view.pdca;L.push('','PDCA · P) '+pp.plan.objetivo+' | C) '+pp.check.quando+', critério: '+pp.check.criterio)}
  if(o.opts){L.push('','Opções:');o.opts.forEach(function(x){L.push('- '+x)});if(o.reco)L.push('',o.reco)}
  L.push('',CFG.notify.slackApprove&&CFG.notify.viaBot?'Decida pelos botões do Slack ou abra a Torre Gabriel.':'Abra a Torre Gabriel para aprovar, ajustar ou recusar.');
  notifyRaw(tgp()+tag+': '+o.title,L.join('\n'),'ap'+o.id,a.name,{aid:a.id,lvl:o.kind==='vermelho'?'vermelho':o.kind==='reuniao'?'reuniao':'amarelo',short:(o.d||'').slice(0,160),apKey:o.key});
}
