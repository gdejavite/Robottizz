/* =====================================================================
   ANDAR 6 · DEJAVITE CONSTRUTORA
   Tudo o que é deste andar mora aqui: time, salas, metas, tarefas,
   entregas de exemplo, regras de revisão e sementes da memória.
   ===================================================================== */
(function(){
function ag(id,name,role,room,color,hair,auto,seat){return {id:id,name:name,role:role,room:room,color:color,hair:hair,auto:auto,seat:seat||1}}
registerFloor({
 ROOMS:{dir:['DIRETORIA','Gabriel · Sócio'],con:['COMERCIAL','Bruno · Clara · Clientes'],aq:['ORÇAMENTOS','Otávio · Caio · Compras'],qua:['MARKETING','Marina · Zeca · CRM'],
          tra:['OBRA','Mateus · Cronograma'],ti:['FINANCEIRO','Fábio · Joana · Contratos'],rev:['QUALIDADE','Rui · Revisão & QA'],reu:['REUNIÃO','Decisões e atas']},
 AG:[
   {id:'gab',name:'Gabriel',role:'Sócio',room:'dir',color:'#f4b860',hair:'#2a2118',me:1,auto:[]},
   {id:'duda',name:'Duda',role:'Recepção',room:'hall',color:'#ff9f6b',hair:'#3a2018',fixed:[11.4,.78],auto:[['g','Classificar e encaminhar pedidos e leads'],['y','Pedir detalhe quando o pedido for vago'],['r','Executar tarefas sozinha: ela só roteia']]},
   ag('bruno','Bruno','Comercial','con','#59c7e0','#1f2a3a',[['g','Qualificar leads e responder dúvidas comuns'],['y','Confirmar visita técnica com o lead'],['r','Prometer prazo ou preço fechado (barrado)']]),
   ag('clara','Clara','Clientes','con','#ee7fa6','#4a2418',[['g','Responder dúvidas de prazo com o cronograma'],['y','Enviar atualização e fotos ao cliente'],['r','Enviar foto sem autorização (barrado)']],2),
   ag('otavio','Otávio','Orçamentos','aq','#7fd18b','#2b2b2b',[['g','Levantar insumos e montar rascunhos'],['y','Enviar orçamento ao cliente'],['r','Usar preço sem fonte verificável (barrado)']]),
   ag('caio','Caio','Compras','aq','#c79bff','#1c1c28',[['g','Pedir e comparar cotações'],['y','Enviar pedido de cotação'],['r','Fechar compra sem confirmação dupla']],2),
   ag('marina','Marina','Marketing','qua','#ff6a8a','#2a1a14',[['g','Roteiros, legendas e calendário'],['y','Publicar post ou carrossel'],['r','Ativar anúncio ou usar depoimento sem autorização']]),
   ag('zeca','Zeca','CRM e automações','qua','#8f9bff','#222',[['g','Sincronizar leads e checar conexões'],['y','Ativar nova automação'],['r','Disparar mensagem em massa sem aprovação']],2),
   ag('mateus','Mateus','Obra','tra','#e8a23c','#3a2a1a',[['g','Cronograma, diário de obra e conferência'],['y','Apontar divergência técnica'],['r','Liberar medição ao banco sem confirmação dupla']]),
   ag('fabio','Fábio','Financeiro','ti','#4fb3a5','#201a14',[['g','Fluxo de caixa e conciliação'],['y','Enviar cobrança em atraso'],['r','Pagar ou negociar dívida sem aprovação']]),
   ag('joana','Joana','Documentos e contratos','ti','#d98cf0','#3b2a1a',[['g','Checklists e conferência de documentos'],['y','Protocolar documentos da obra'],['r','Enviar contrato ou documento oficial sem confirmação dupla']],2),
   ag('rui','Rui','Qualidade e revisão','rev','#e5d36b','#2a2a2a',[['g','Revisar orçamentos, contratos e textos'],['y','Devolver para retrabalho com motivo'],['r','Aprovar peça que quebre as regras de marca']])
  ],

   OWNER:{dir:'gab',con:'bruno',aq:'otavio',qua:'marina',tra:'mateus',ti:'fabio',rev:'rui',reu:null},
   WORKERS:['bruno','clara','otavio','caio','marina','zeca','mateus','fabio','joana'],
   ORDER:['duda','bruno','clara','otavio','caio','marina','zeca','mateus','fabio','joana','rui'],
   MEET:[
    {who:'otavio',title:'Reunião · Orçamentos · agora (15 min)',part:['otavio','caio','rui'],d:'O aço subiu 7% desde o último orçamento e há 2 propostas abertas aguardando resposta.',
     opts:['A · Reajustar as 2 propostas abertas e avisar os clientes','B · Manter o preço por mais 7 dias e renegociar com o fornecedor'],reco:'Recomendação do Otávio: B, com 3 novas cotações do Caio.'},
    {who:'bruno',title:'Reunião · Comercial · agora (10 min)',part:['bruno','marina','zeca'],d:'Os leads do formulário subiram 30%, mas 40% não respondem no WhatsApp em 24h.',
     opts:['A · Automatizar o primeiro contato em até 5 minutos','B · Manter manual e reforçar o follow-up'],reco:'Recomendação do Bruno: A, com o Zeca ajustando a automação.'}],
   CONNS:[
    {id:'tally',n:'Tally (formulário de leads)',d:'Entrada dos leads do site e do Instagram'},{id:'crm',n:'CRM',d:'Funil de leads e clientes'},
    {id:'zapi',n:'WhatsApp (Z-API)',d:'Zeca e Bruno dependem desta conexão',exp:'sessão ativa'},{id:'gmail',n:'Gmail',d:'Cotações, cobranças e propostas'},
    {id:'cal',n:'Google Calendar',d:'Visitas técnicas e reuniões'},{id:'drive',n:'Google Drive',d:'Projetos, plantas e orçamentos'},
    {id:'meta',n:'Meta Ads e Instagram',d:'Campanhas e posts da Marina'},{id:'sinapi',n:'Base de preços (SINAPI e lojas)',d:'Fonte verificável dos orçamentos'}],
   ROUTE:[
    ['bruno',/lead|whats|visita|terreno|tally|interess/i,'Comercial'],
    ['clara',/cliente|atualiza|p[oó]s-venda|satisfa|d[uú]vida|prazo da obra/i,'Clientes'],
    ['otavio',/or[cç]amento|proposta|quanto custa|marcenaria|planta|sinapi|insumo/i,'Orçamentos'],
    ['caio',/cota[cç][aã]o|fornecedor|compra|material/i,'Compras'],
    ['marina',/post|carrossel|legenda|an[uú]ncio|instagram|reels|campanha|conte[uú]do/i,'Marketing'],
    ['zeca',/crm|automa|z-api|zapi|funil|conex/i,'CRM e automações'],
    ['mateus',/obra|cronograma|medi[cç][aã]o|etapa|di[aá]rio|canteiro|funda[cç]/i,'Obra'],
    ['fabio',/cobran[cç]a|pagamento|fluxo de caixa|boleto|nota fiscal|financeiro/i,'Financeiro'],
    ['joana',/contrato|alvar[aá]|\bart\b|documento|financiamento|certid/i,'Documentos']],
   STK:{id:'zeca',conn:'zapi',log:'Zeca travou: a sessão do WhatsApp (Z-API) desconectou.',title:'Zeca travou',desc:'A sessão do WhatsApp (Z-API) desconectou. Reescaneie o QR code para voltar a responder os leads.',
     mem:'A sessão do WhatsApp (Z-API) desconectou e deixou leads sem resposta. Checar a conexão todo dia e avisar o Gabriel na hora.',tags:['conexao','whatsapp','leads','crm'],
     subject:'Zeca travou: reconectar o WhatsApp',body:'A sessão do WhatsApp (Z-API) desconectou e o Zeca parou de responder os leads. Abra a Torre Gabriel e toque em Reconectar (reescaneie o QR code na Z-API).',
     fixLog:'Zeca reconectou o WhatsApp e voltou a responder os leads.'},
   REVID:'rui',RECID:'duda',
   theme:{rug:['rgba(40,36,44,.65)','rgba(255,110,80,.6)'],ledGlow:'rgba(255,73,45,.30)',ledCore:'rgba(255,150,120,.95)',plate:'#ff492d',recLed:'#ff6a4a',bar:['rgba(255,205,185,.95)','rgba(255,130,95,.85)','rgba(220,80,50,.8)']},
   barsData:[22,35,28,48,40,52,44],
   MET:{
    leads:{n:'Leads qualificados por semana',s:'LEADS',f:'int',v:14,m:25,dir:1,h:[10,11,12,12,13,13,14,14]},
    visitas:{n:'Visitas técnicas por semana',s:'VISITAS',f:'int',v:4,m:8,dir:1,h:[3,3,4,3,4,4,4,4]},
    orcs:{n:'Orçamentos enviados por semana',s:'ORÇ.',f:'int',v:5,m:10,dir:1,h:[3,4,4,5,4,5,5,5]},
    fech:{n:'Taxa de fechamento de orçamentos',s:'FECHAMENTO',f:'pct0',v:18,m:30,dir:1,max:100,h:[15,16,16,17,17,18,18,18]},
    resp:{n:'Tempo de resposta ao lead',s:'RESPOSTA',f:'min',v:42,m:15,dir:-1,h:[58,54,50,48,46,45,43,42]},
    prazo:{n:'Obras dentro do prazo',s:'NO PRAZO',f:'pct0',v:78,m:95,dir:1,max:100,h:[72,73,75,74,76,77,78,78]}},
   meta:{id:'dej',nome:'Dejavite',andar:6,empresa:'Dejavite',empresaLong:'Dejavite Construtora (construção, reforma e marcenaria em São José do Rio Preto)',
     sub:'6º andar · Dejavite Construtora · demonstração',lsKey:'torre_mem_v4_dej',docName:'torre-memoria-dejavite',hud:['leads','fech'],stuckAt:20,meetAt:36,
     greet:'Oi, Gabriel. Aqui é a Duda, da Recepção do 6º andar (Dejavite). O que você precisa?',
     sugg:['Qualificar os leads de hoje','Montar orçamento de casa de 120 m²','Pedir cotação de materiais','Cobrar parcela em atraso']},
 decor:{dir:'kpi',con:'funnel',aq:'blueprint',qua:'moodboard',tra:'gantt',ti:'finance',rev:'checklist',reu:'tvboard'},
 props:{tra:{s:'bptable',x:3.45,y:2.95},aq:{s:'bptable',x:3.45,y:2.95},ti:{s:'safe',x:4.3,y:3.0}},
 AVA:{gab:{hs:'short',sk:'#e9bf98',tie:'#f4b860'},duda:{hs:'bob',sk:'#e0ac80'},bruno:{hs:'short',sk:'#e0ac80'},clara:{hs:'long',sk:'#f2caa6'},
  otavio:{hs:'short',sk:'#c68a5e',gl:1},caio:{hs:'cap',sk:'#e9bf98'},marina:{hs:'long',sk:'#e0ac80'},zeca:{hs:'cap',sk:'#8d5a3a'},
  mateus:{hs:'hat',sk:'#d9a273'},fabio:{hs:'short',sk:'#f2caa6',gl:1},joana:{hs:'bun',sk:'#c68a5e'},rui:{hs:'bob',sk:'#e9bf98',gl:1}},
 EMO:{gab:'👤',duda:'🛎️',bruno:'🤝',clara:'🏡',otavio:'📐',caio:'📦',marina:'🎨',zeca:'🤖',mateus:'👷',fabio:'💰',joana:'📄',rui:'✅'},
 SLEMO:{gab:':bust_in_silhouette:',duda:':bellhop_bell:',bruno:':handshake:',clara:':house:',otavio:':triangular_ruler:',caio:':package:',marina:':art:',zeca:':robot_face:',mateus:':construction_worker:',fabio:':moneybag:',joana:':page_facing_up:',rui:':white_check_mark:'},
 AGTAGS:{
 duda:['pedido'],
 bruno:['leads','whatsapp','visita','conversao','compliance','financiamento'],
 clara:['cliente','satisfacao','obra','prazo','compliance'],
 otavio:['orcamento','proposta','preco','financiamento','compliance','marcenaria'],
 caio:['compras','fornecedor','preco','cotacao','material'],
 marina:['conteudo','post','carrossel','leads','compliance','financiamento','obra'],
 zeca:['crm','automacao','whatsapp','leads','conexao'],
 mateus:['obra','cronograma','medicao','etapa','prazo','financiamento'],
 fabio:['financeiro','cobranca','caixa','prazo','fornecedor'],
 joana:['documentos','contrato','financiamento','alvara','compliance'],
 rui:['compliance','revisao']},
 KW:[[/or[cç]amento/i,'orcamento'],[/cota[cç]/i,'cotacao'],[/etapa|medi[cç]/i,'medicao'],[/financiamento|caixa\b/i,'financiamento'],[/contrato|alvar|\bart\b|certid/i,'documentos'],
 [/whatsapp|z-api/i,'whatsapp'],[/cronograma|obra/i,'obra'],[/cobran/i,'cobranca'],[/marcenaria/i,'marcenaria'],[/insumo|material|fornecedor/i,'material']],
 REJ:[
 {k:'fontepreco',ag:['otavio','caio'],t:'preço sem fonte verificável',lesson:'Todo preço precisa de fonte verificável (SINAPI, loja e produto). Sem fonte, marcar "ESTIMATIVA NÃO VERIFICADA".'},
 {k:'promessaprazo',ag:['bruno','otavio','marina','clara'],t:'promessa de prazo ou preço fechado sem condições',lesson:'Não prometer prazo nem preço fixo sem cronograma e condições por escrito.'},
 {k:'depoimento',ag:['marina'],t:'depoimento ou antes e depois sem autorização',lesson:'Nada de depoimento ou antes e depois sem autorização escrita do cliente.'},
 {k:'logoarte',ag:['marina'],t:'logo ou nome da marca na arte',lesson:'Nas artes: sem logo e sem o nome da marca; fundo escuro único em todos os posts.'},
 {k:'cotfalta',ag:['caio'],t:'cotação sem CNPJ, papel timbrado ou data',lesson:'Toda cotação precisa de valores itemizados, papel timbrado, data, CNPJ e assinatura do responsável.'},
 {k:'divergencia',ag:['mateus','otavio','joana'],t:'divergência técnica não apontada',lesson:'Ao achar divergência técnica, apontar o conflito em vez de chutar.'},
 {k:'cobrancadata',ag:['fabio'],t:'cobrança sem data, responsável e próximo passo',lesson:'Toda cobrança registra datas, responsáveis e o próximo passo.'}],
 METFX:{
 bruno:[['leads',[.5,1.2],0],['visitas',[.2,.5],0],['resp',[-2,-.8],[.3,1]]],
 clara:[['fech',[.15,.4],-.1]],
 otavio:[['orcs',[.3,.6],0],['fech',[.3,.7],-.2]],
 caio:[['fech',[.05,.15],0]],
 marina:[['leads',[.7,1.5],0]],
 zeca:[['resp',[-2.5,-1],[.5,1.5]],['leads',[.2,.6],0]],
 mateus:[['prazo',[.4,.9],-.5]],
 fabio:[['prazo',[.05,.2],0]],
 joana:[['prazo',[.1,.3],-.2]]},
 OUT:{
 bruno:{ok:['Resposta em até 15 min com 2 horários de visita agendou a visita. Repetir.','Lead com terreno e financiamento definidos virou visita em 48h. Priorizar esse perfil.'],
        fail:['Lead qualificado sem retorno em 48h esfriou. Evitar ficar mais de 24h sem follow-up.']},
 clara:{ok:['Atualização semanal com fotos autorizadas aumentou a satisfação do cliente. Repetir.'],
        fail:['Cliente ficou 10 dias sem atualização e reclamou do prazo. Evitar passar de 7 dias sem atualizar.']},
 otavio:{ok:['Orçamento com cronograma e a explicação da liberação por etapas foi fechado. Repetir a explicação.','Orçamento com fonte em todos os preços gerou confiança e fechou. Repetir.'],
         fail:['Orçamento sem cronograma resumido gerou dúvida e não fechou. Evitar enviar sem cronograma.']},
 caio:{ok:['Três cotações comparáveis, com CNPJ e prazo, permitiram negociar {p}% de desconto. Repetir.'],
       fail:['Cotação sem papel timbrado e sem CNPJ foi recusada pelo fornecedor. Evitar pedir ou aceitar cotação sem esses dados.']},
 marina:{ok:['Post de obra em andamento (sem rosto de cliente) gerou {n} leads. Repetir o formato.','Carrossel sobre liberação por etapas gerou {n} leads qualificados. Repetir o tema.'],
         fail:['Post só com preço gerou poucos leads. Evitar falar só de preço; mostrar processo e segurança.']},
 zeca:{ok:['Lead do formulário entrou no CRM e recebeu WhatsApp em 1 min. Repetir a automação.'],
       fail:['A sessão do WhatsApp desconectada deixou leads sem resposta por horas. Evitar passar de 24h sem checar a conexão.']},
 mateus:{ok:['Medição conferida contra projeto e fotos antes de liberar a etapa evitou retrabalho. Repetir.'],
         fail:['Etapa liberada sem conferir a medição atrasou a obra. Evitar liberar sem medição conferida.']},
 fabio:{ok:['Cobrança com datas, responsável e próximo passo foi paga no prazo. Repetir o formato.'],
        fail:['Cobrança sem prazo definido não foi respondida. Evitar cobrar sem data e próximo passo.']},
 joana:{ok:['Checklist de documentos completo antes de enviar ao banco evitou pendência. Repetir.'],
        fail:['Documento vencido travou a análise do financiamento. Evitar enviar sem conferir a validade.']}},
 OUTTAGS:{
 bruno:['leads','whatsapp','visita','conversao'],clara:['cliente','satisfacao','obra','prazo'],otavio:['orcamento','proposta','preco','financiamento'],
 caio:['compras','fornecedor','preco','cotacao','material'],marina:['conteudo','post','carrossel','leads','obra','financiamento'],
 zeca:['crm','automacao','whatsapp','leads','conexao'],mateus:['obra','cronograma','medicao','etapa','prazo'],fabio:['financeiro','cobranca','caixa'],joana:['documentos','contrato','financiamento']},
 INS:{
 bruno:[{x:'Leads que já informam terreno próprio e financiamento viram visita 2x mais rápido.',t:['leads','visita','financiamento','conversao']}],
 clara:[{x:'Clientes que recebem foto da obra toda semana perguntam {p}% menos sobre prazo.',t:['cliente','obra','prazo','satisfacao']}],
 otavio:[{x:'Orçamentos que explicam a liberação por etapas do financiamento fecham mais.',t:['orcamento','financiamento','proposta','conteudo']},
         {x:'Os preços de cimento e aço variaram {p}% nos últimos meses: vale atualizar a base antes de orçar.',t:['orcamento','preco','material','compras']}],
 caio:[{x:'Cotar com 3 fornecedores reduz o custo do material em média {p}%.',t:['compras','fornecedor','preco','orcamento','material']}],
 marina:[{x:'Posts que mostram o processo da obra (sem rosto de cliente) têm mais cliques que posts só de preço.',t:['conteudo','post','obra','leads']}],
 zeca:[{x:'Responder o lead em até 5 minutos dobra a chance de ele aceitar a visita.',t:['leads','whatsapp','automacao','visita','crm']}],
 mateus:[{x:'Etapas conferidas por medição antes da liberação reduzem retrabalho e atraso.',t:['obra','medicao','etapa','prazo','financiamento']}],
 fabio:[{x:'Cobranças enviadas no dia do vencimento são pagas {p}% mais rápido.',t:['cobranca','financeiro','caixa']}],
 joana:[{x:'Os documentos que mais travam o financiamento são certidões vencidas e ART sem assinatura.',t:['documentos','financiamento','alvara','contrato']}]},
 CHK:{
 bruno:['Não promete prazo nem preço','Aviso de que valores dependem de visita e projeto','Dados do lead protegidos (LGPD)'],
 clara:['Só envia fotos autorizadas pelo cliente','Prazos conferidos com o cronograma','Tom cordial e claro'],
 otavio:['Todos os preços citam fonte verificável','Cronograma resumido incluído','Divergências técnicas apontadas, sem chute'],
 caio:['Valores itemizados, papel timbrado, data e CNPJ','Assinatura do responsável','Fornecedores comparáveis entre si'],
 marina:['Sem logo e sem nome da marca na arte','Sem depoimento nem antes e depois sem autorização','Sem promessa de prazo ou preço'],
 zeca:['Não envia mensagem em massa sem aprovação','Respeita opt-out do lead','Testado com poucos leads antes'],
 mateus:['Medição conferida contra projeto e fotos','Divergências apontadas, sem chute','Liberação só com a sua confirmação dupla'],
 fabio:['Datas, responsável e próximo passo registrados','Tom firme e cordial','Valores conferidos com o contrato'],
 joana:['Validade dos documentos conferida','Cláusulas conferidas com o orçamento aprovado','Documento oficial só com a sua confirmação dupla']},
 CTX:{
 duda:'Recepção do 6º andar (Dejavite Construtora). Recebe os pedidos do Gabriel (texto, áudio, foto, planta) e os leads novos, identifica a área certa (comercial, clientes, orçamentos, compras, marketing, CRM, obra, financeiro, documentos) e encaminha ao agente responsável. Pergunta o mínimo quando o pedido estiver vago. Não executa tarefas sozinha.',
 bruno:'Comercial da Dejavite Construtora (São José do Rio Preto e região). Atende os leads que chegam pelo formulário (Tally) e pelo WhatsApp: qualifica (tem terreno? vai financiar? prazo? tipo de obra), responde dúvidas em linguagem simples e agenda a visita técnica. Não promete prazo nem preço fechado antes da visita e do projeto. Quando o lead estiver quente, pede aprovação para confirmar a visita.',
 clara:'Relacionamento com clientes da Dejavite. Envia a atualização semanal da obra (avanço da etapa, próximos passos, fotos já autorizadas pelo cliente), responde dúvidas de prazo com base no cronograma real, faz a pesquisa de satisfação pós-entrega e pede indicações. Tom cordial e claro. Nunca envia foto sem autorização.',
 otavio:'Orçamentos da Dejavite (obra e marcenaria). Monta orçamentos itemizados a partir da planta e do escopo. Todo preço precisa citar fonte verificável (SINAPI SP/Nacional em primeiro lugar, depois lojas de Rio Preto como a Leroy Merlin, com loja, produto e preço); sem cotação real, marcar "ESTIMATIVA NÃO VERIFICADA". Inclui cronograma resumido e explica a liberação por etapas do financiamento bancário, o principal diferencial de confiança. Ao achar divergência técnica, aponta o conflito em vez de chutar.',
 caio:'Compras da Dejavite. Pede cotações a pelo menos 3 fornecedores com e-mail formal: valores itemizados, papel timbrado, data, CNPJ e assinatura do responsável. Compara as respostas em igualdade de condições (prazo, frete, validade) e recomenda o fornecedor. Nunca fecha compra sem a confirmação dupla do Gabriel.',
 marina:'Marketing da Dejavite. Cria o calendário de posts, legendas e roteiros de carrossel e Reels em linguagem simples (sem jargão de engenharia), explicando o diferencial: liberação por etapas pelo banco. Regras de arte: sem logo e sem o nome da marca no slide, fundo escuro único em todos os posts, identificação só pelo perfil. Nada de depoimento ou antes e depois sem autorização escrita do cliente. Anúncios só com a confirmação dupla do Gabriel.',
 zeca:'CRM e automações da Dejavite. Cuida do funil de leads (Tally, CRM e WhatsApp via Z-API): sincroniza os leads, mantém o primeiro contato automático em poucos minutos, acompanha a conexão do WhatsApp e avisa o Gabriel na hora se ela cair. Não dispara mensagens em massa sem aprovação e respeita quem pediu para não receber.',
 mateus:'Obra da Dejavite. Mantém o cronograma, o diário de obra e as medições. Confere cada medição contra o projeto e as fotos antes de pedir a liberação da etapa ao banco. Organiza por tópicos, itens de projeto, folhas, responsáveis e providências. Aponta divergências em vez de chutar. A liberação de etapa movimenta dinheiro: sempre com a confirmação dupla do Gabriel.',
 fabio:'Financeiro da Dejavite. Acompanha o fluxo de caixa de cada obra, concilia pagamentos e redige cobranças de fornecedores e clientes em atraso registrando datas, responsáveis e próximos passos, em tom firme porém cordial (sem perder a amizade). Nunca paga nem negocia dívida sem aprovação do Gabriel.',
 joana:'Documentos e contratos da Dejavite. Monta o checklist de documentos do financiamento (conferindo validade), organiza alvará, ART e certidões da obra e prepara contratos de prestação de serviço conferidos com o orçamento aprovado. Contrato e documento oficial só saem com a confirmação dupla do Gabriel.',
 rui:'Qualidade e revisão da Dejavite. Revisa orçamentos, contratos, textos e posts antes de saírem: confere fontes de preço, quantitativos, prazos, cláusulas e regras de marca. Nas análises técnicas separa divergências, pontos aprovados, pendências e recomendações. Devolve para retrabalho dizendo exatamente o motivo.'},
 TPL:{
 bruno:[{t:'Qualificar lead do WhatsApp (terreno, financiamento, prazo)',rv:1,ap:{k:'amarelo',title:'Confirmar visita técnica com o lead quente',d:'Marcos S. tem terreno próprio, quer construir uma casa de cerca de 120 m² com financiamento e pediu uma visita.'}},
        {t:'Responder leads do formulário (Tally)'},{t:'Follow-up de leads sem resposta há 24h',rv:1}],
 clara:[{t:'Enviar atualização semanal ao cliente',rv:1,ap:{k:'amarelo',title:'Enviar a atualização semanal da obra ao cliente',d:'Resumo da semana com avanço da etapa, próximos passos e fotos já autorizadas pelo cliente.'}},
        {t:'Pesquisa de satisfação pós-entrega',rv:1},{t:'Responder dúvida do cliente sobre prazo',rv:1}],
 otavio:[{t:'Montar orçamento de casa de 120 m² (financiamento)',rv:1,ap:{k:'amarelo',title:'Enviar orçamento ao cliente (casa de 120 m²)',d:'Orçamento itemizado com fonte em todos os preços, cronograma resumido e explicação da liberação por etapas do financiamento.'}},
         {t:'Levantar insumos com fonte verificável'},
         {t:'Orçamento de marcenaria (cozinha e closet)',rv:1,ap:{k:'amarelo',title:'Enviar orçamento de marcenaria',d:'Levantamento técnico da planta, lista de peças e orçamento itemizado.'}}],
 caio:[{t:'Pedir cotações itemizadas a 3 fornecedores',rv:1,ap:{k:'amarelo',title:'Enviar pedido de cotação aos fornecedores',d:'E-mail formal pedindo valores itemizados, papel timbrado, data, CNPJ e assinatura do responsável.'}},
       {t:'Comparar cotações recebidas',rv:1,ap:{k:'vermelho',title:'Fechar compra de materiais da fundação (R$ 18.400)',d:'Mexe em dinheiro, então exige confirmação dupla. Melhor proposta entre 3 cotações comparáveis.'}},
       {t:'Conferir prazos de entrega dos materiais'}],
 marina:[{t:'Roteiro de carrossel: como funciona a liberação por etapas',rv:1,ap:{k:'amarelo',title:'Publicar carrossel sobre liberação por etapas',d:'7 slides explicando o financiamento por etapas, fundo escuro único, sem logo e sem o nome da marca.'}},
         {t:'Legenda do post de obra em andamento',rv:1},
         {t:'Campanha de leads locais (Instagram e Meta)',rv:1,ap:{k:'vermelho',title:'Ativar campanha de leads com R$ 40/dia',d:'Mexe em dinheiro, então exige confirmação dupla. Público: São José do Rio Preto e região, quem pensa em construir ou reformar.'}}],
 zeca:[{t:'Sincronizar leads do Tally com o CRM'},{t:'Checar a conexão do WhatsApp (Z-API)'},
       {t:'Ajustar automação de primeiro contato',rv:1,ap:{k:'amarelo',title:'Ativar resposta automática de primeiro contato',d:'Resposta em até 5 minutos para todo lead novo, com uma pergunta de qualificação.'}}],
 mateus:[{t:'Atualizar cronograma da obra'},
         {t:'Conferir a medição da etapa de fundação',rv:1,ap:{k:'vermelho',title:'Liberar a medição da fundação ao banco',d:'A liberação por etapa movimenta o dinheiro do financiamento, então exige confirmação dupla. Medição conferida contra projeto e fotos.'}},
         {t:'Registrar diário de obra e fotos'}],
 fabio:[{t:'Cobrança de fornecedor ou cliente em atraso',rv:1,ap:{k:'amarelo',title:'Enviar cobrança em atraso',d:'E-mail firme e cordial, com datas, responsável e próximo passo.'}},
        {t:'Atualizar fluxo de caixa da obra'},{t:'Conciliar pagamentos da semana'}],
 joana:[{t:'Montar checklist de documentos do financiamento',rv:1},
        {t:'Conferir alvará, ART e documentos da obra',rv:1,ap:{k:'amarelo',title:'Protocolar documentos da obra',d:'Alvará, ART e certidões conferidos e organizados para protocolo.'}},
        {t:'Preparar contrato de prestação de serviço',rv:1,ap:{k:'vermelho',title:'Enviar contrato para assinatura do cliente',d:'Documento oficial: exige confirmação dupla. Cláusulas conferidas com o orçamento aprovado.'}}]},
 DV:{
 'Qualificar lead do WhatsApp (terreno, financiamento, prazo)':{tipo:'Confirmação de visita técnica',blocos:[
   ['Quem é o lead','Marcos S., São José do Rio Preto. Tem terreno próprio, quer uma casa de cerca de 120 m² e pretende financiar. Respondeu em 10 minutos e pediu visita.'],
   ['Mensagem que o Bruno vai enviar','Oi, Marcos! Aqui é o Bruno, da Dejavite. Para entender o seu terreno e o projeto, podemos fazer uma visita técnica sem compromisso. Tenho quinta às 9h ou sexta às 15h. Qual fica melhor?\n\nO valor e o prazo só são definidos depois da visita e do projeto, combinado?'],
   ['Próximo passo','Se ele confirmar, o Bruno cria o evento no calendário e avisa o Otávio para iniciar o orçamento.']],
  impacto:'Pode somar 1 visita técnica na semana (meta 8, simulado).',depois:'O Bruno envia a mensagem e reserva o horário no calendário.'},
 'Responder leads do formulário (Tally)':{tipo:'Respostas a leads do formulário',blocos:[
   ['Mensagem padrão','Oi! Recebi o seu pedido de orçamento pela Dejavite. Para te ajudar melhor: você já tem terreno? Pretende financiar? Qual o tipo de obra (construção, reforma ou marcenaria)?'],
   ['Lead com dúvida de prazo','Para dar um prazo real, precisamos ver o terreno e o projeto. Posso marcar uma visita técnica sem compromisso?']],
  impacto:'Mantém o tempo de resposta abaixo de 15 minutos (meta).',depois:'O Bruno responde os leads agora.'},
 'Follow-up de leads sem resposta há 24h':{tipo:'Follow-up de leads',blocos:[
   ['Mensagem','Oi! Passando para ver se ficou alguma dúvida sobre o seu projeto. Se quiser, posso te mandar um resumo de como funciona a liberação por etapas do financiamento. Sem compromisso.']],
  impacto:'Recupera leads que esfriaram.',depois:'O Bruno envia o follow-up aos leads parados.'},
 'Enviar atualização semanal ao cliente':{tipo:'Atualização semanal da obra',blocos:[
   ['Mensagem ao cliente','Oi! Atualização da sua obra desta semana:\n• Etapa atual: fundação, 80% concluída.\n• Próximos passos: concretagem na terça, se o tempo permitir.\n• Prazo: dentro do cronograma combinado.\n\nSegue em anexo as fotos da semana.'],
   ['Fotos anexadas','4 fotos do canteiro, sem pessoas identificáveis, todas já autorizadas pelo cliente.']],
  impacto:'Mantém o cliente informado (meta: nenhuma obra mais de 7 dias sem atualização).',depois:'A Clara envia a atualização pelo WhatsApp do cliente.'},
 'Pesquisa de satisfação pós-entrega':{tipo:'Pesquisa de satisfação',blocos:[
   ['Mensagem','Oi! Sua obra foi entregue e queremos saber como foi. De 0 a 10, quanto você recomendaria a Dejavite? E o que poderíamos melhorar?']],
  impacto:'Gera o NPS e pedidos de indicação.',depois:'A Clara envia a pesquisa ao cliente.'},
 'Responder dúvida do cliente sobre prazo':{tipo:'Resposta ao cliente',blocos:[
   ['Resposta','Pelo cronograma atual, a etapa termina na próxima semana. Se a chuva atrasar a concretagem, aviso você no mesmo dia com a nova previsão.']],
  impacto:'Evita insegurança do cliente com o prazo.',depois:'A Clara envia a resposta.'},
 'Montar orçamento de casa de 120 m² (financiamento)':{tipo:'Orçamento itemizado',blocos:[
   ['Resumo','Casa térrea de 120 m², padrão médio, financiada. Valor total estimado: R$ 312.000 (simulado). Prazo: 9 meses.'],
   ['Itens principais (com fonte)','Fundação e estrutura: R$ 78.400 (SINAPI SP, jul/2026).\nAlvenaria e cobertura: R$ 61.200 (SINAPI SP, jul/2026).\nInstalações: R$ 49.800 (SINAPI SP e Leroy Merlin SJRP).\nAcabamentos: R$ 74.600 (Leroy Merlin SJRP, lojas e produtos citados na planilha).\nMão de obra e administração: R$ 48.000.'],
   ['Liberação por etapas','O banco libera o dinheiro por etapa concluída e medida, o que protege o cliente: ele só paga pelo que foi executado.'],
   ['Aviso','Valores sujeitos a visita técnica, projeto aprovado e análise de crédito. Itens sem cotação real estão marcados como ESTIMATIVA NÃO VERIFICADA.']],
  impacto:'Pode somar 1 orçamento enviado (meta 10 por semana, simulado).',depois:'O Otávio gera o PDF e envia ao cliente.'},
 'Levantar insumos com fonte verificável':{tipo:'Levantamento de insumos',blocos:[
   ['Resultado','28 itens atualizados com mínimo, médio e máximo e fonte (SINAPI SP/Nacional ou loja e produto).'],
   ['Pendência','1 item sem cotação real: marcado como ESTIMATIVA NÃO VERIFICADA até confirmar com fornecedor.']],
  impacto:'Mantém a base de preços confiável.',depois:'A base de preços é atualizada.'},
 'Orçamento de marcenaria (cozinha e closet)':{tipo:'Orçamento de marcenaria',blocos:[
   ['Resumo','Cozinha planejada e closet. Total estimado: R$ 46.900 (simulado). Prazo: 45 dias.'],
   ['Peças e materiais','Lista de peças por ambiente e chapas MDF com fornecedor e preço citados.'],
   ['Divergência apontada','A planta indica 2,40 m para o vão da cozinha, mas o corte mostra 2,34 m. Pedir conferência no local antes de produzir.']],
  impacto:'Pode somar 1 orçamento enviado.',depois:'O Otávio envia o orçamento com a divergência sinalizada.'},
 'Pedir cotações itemizadas a 3 fornecedores':{tipo:'E-mail de pedido de cotação',blocos:[
   ['Assunto','Solicitação de cotação itemizada: materiais para fundação'],
   ['E-mail','Prezados,\n\nSolicitamos cotação dos itens abaixo, com valores unitários e totais itemizados, em papel timbrado, com data, CNPJ e assinatura do responsável. Informar também prazo de entrega, frete e validade da proposta.\n\nItens: cimento CP II (50 kg), aço CA-50 (10 mm), brita 1 e areia média, nas quantidades da planilha anexa.\n\nResposta até sexta-feira.\n\nAtenciosamente,\nDejavite Construtora']],
  impacto:'Permite comparar propostas em igualdade de condições.',depois:'O Caio envia o e-mail aos 3 fornecedores.'},
 'Comparar cotações recebidas':{tipo:'Comparativo de cotações',blocos:[
   ['Resultado','Fornecedor A: R$ 18.400, entrega em 3 dias.\nFornecedor B: R$ 19.650, entrega em 2 dias.\nFornecedor C: R$ 20.100, entrega em 5 dias.'],
   ['Recomendação','Fornecedor A: menor preço com prazo compatível com a concretagem. Todas as propostas têm CNPJ, data e papel timbrado.']],
  impacto:'Economia de R$ 1.250 contra a segunda melhor proposta (simulado).',depois:'O Caio fecha o pedido com o Fornecedor A. Mexe em dinheiro, então exige confirmação dupla.'},
 'Conferir prazos de entrega dos materiais':{tipo:'Conferência de prazos',blocos:[
   ['Resultado','Todos os materiais da próxima etapa chegam até 2 dias antes do uso. Sem risco de atraso.']],
  impacto:'Protege o cronograma.',depois:'O Caio acompanha as entregas.'},
 'Roteiro de carrossel: como funciona a liberação por etapas':{tipo:'Carrossel de 7 slides + legenda',blocos:[
   ['Slide 1 · Gancho','Construir com financiamento: você só paga o que foi construído.'],
   ['Slide 2 · O medo','Muita gente teme pagar tudo antes e a obra não andar.'],
   ['Slide 3 · Como funciona','O banco libera o dinheiro por etapa, depois que a etapa é medida e conferida.'],
   ['Slide 4 · Etapas','Fundação, estrutura, alvenaria, cobertura, instalações e acabamento.'],
   ['Slide 5 · Segurança','Cada etapa é conferida antes da liberação, com fotos e medição.'],
   ['Slide 6 · Transparência','Você acompanha a obra toda semana, com fotos e cronograma.'],
   ['Slide 7 · Chamada','Quer saber se o seu projeto cabe no financiamento? Chame a gente no WhatsApp.'],
   ['Arte','Fundo escuro único em todos os slides, sem logo e sem o nome da marca.'],
   ['Legenda','Entender como o financiamento libera o dinheiro por etapa dá segurança para construir. Salve este post e compartilhe com quem está planejando a casa própria.']],
  impacto:'Meta: +3 a +5 leads qualificados por semana (simulado).',depois:'A Marina agenda a publicação no Instagram para hoje às 18h.'},
 'Legenda do post de obra em andamento':{tipo:'Legenda de Instagram',blocos:[
   ['Legenda','Obra em andamento em Rio Preto: fundação concluída e estrutura começando. Cada etapa é conferida antes de seguir. Quer entender como funciona? Chame no WhatsApp.']],
  impacto:'Mantém a frequência de posts.',depois:'A Marina agenda a publicação.'},
 'Campanha de leads locais (Instagram e Meta)':{tipo:'Campanha paga (mexe em dinheiro)',blocos:[
   ['Configuração','Verba: R$ 40/dia por 14 dias (R$ 560 no total).\nPúblico: São José do Rio Preto e região, 28 a 55 anos, interesse em construção e financiamento.\nObjetivo: mensagens no WhatsApp.'],
   ['Criativos','Carrossel de liberação por etapas e vídeo curto de obra em andamento, sem depoimento e sem logo.'],
   ['Meta','CPL alvo de R$ 18 (simulado), com 30 leads no período.']],
  impacto:'Cerca de 30 leads em 14 dias (simulado).',depois:'A Marina ativa a campanha. Como mexe em dinheiro, exige confirmação dupla.'},
 'Sincronizar leads do Tally com o CRM':{tipo:'Sincronização de leads',blocos:[
   ['Resultado','12 leads novos entraram no CRM, sem duplicados. 2 leads sem telefone foram marcados para contato por e-mail.']],
  impacto:'Nenhum lead se perde entre o formulário e o CRM.',depois:'O Zeca mantém a sincronização.'},
 'Checar a conexão do WhatsApp (Z-API)':{tipo:'Checagem da conexão',blocos:[
   ['Resultado','Sessão do WhatsApp ativa. Última mensagem enviada há 3 minutos.']],
  impacto:'Evita leads sem resposta.',depois:'O Zeca avisa se a sessão cair.'},
 'Ajustar automação de primeiro contato':{tipo:'Automação de primeiro contato',blocos:[
   ['O que muda','Todo lead novo recebe uma mensagem em até 5 minutos: "Oi! Recebi o seu pedido. Você já tem terreno e pretende financiar?"'],
   ['Segurança','Testada com 5 leads de teste. Quem responder "parar" deixa de receber mensagens.']],
  impacto:'Tempo de resposta ao lead de 42 para cerca de 5 minutos (simulado).',depois:'O Zeca ativa a automação.'},
 'Atualizar cronograma da obra':{tipo:'Cronograma da obra',blocos:[
   ['Situação','Fundação: 80%. Estrutura inicia na próxima semana. Prazo geral mantido.'],
   ['Risco','Previsão de chuva na terça pode atrasar a concretagem em 1 dia.']],
  impacto:'Mantém o prazo visível para o cliente e o banco.',depois:'O Mateus publica o cronograma atualizado.'},
 'Conferir a medição da etapa de fundação':{tipo:'Medição da etapa (mexe em dinheiro do financiamento)',blocos:[
   ['Conferência','Sapatas e vigas: 100% conforme projeto (folhas 03 e 04).\nImpermeabilização: executada, com fotos.\nDivergência: 1 pilar com 2 cm a menos de seção em relação à folha 04. Pedir conferência.'],
   ['Pontos aprovados','Fundação conforme projeto, exceto o pilar apontado.'],
   ['Pendências e recomendação','Corrigir ou justificar o pilar P7 antes de liberar. Parecer do responsável técnico.']],
  impacto:'Libera a próxima parcela do financiamento no prazo (simulado).',depois:'O Mateus envia a medição ao banco. A liberação por etapa mexe em dinheiro, então exige confirmação dupla.'},
 'Registrar diário de obra e fotos':{tipo:'Diário de obra',blocos:[
   ['Registro do dia','Equipe de 6 pessoas. Concretagem das vigas baldrame. Sem acidentes. 12 fotos organizadas por etapa.']],
  impacto:'Mantém o histórico da obra.',depois:'O Mateus arquiva o diário.'},
 'Cobrança de fornecedor ou cliente em atraso':{tipo:'E-mail de cobrança',blocos:[
   ['Assunto','Pagamento em aberto: parcela 3 (vencimento em 10/09)'],
   ['E-mail','Prezado,\n\nIdentificamos que a parcela 3, no valor de R$ 8.200, com vencimento em 10/09, ainda consta em aberto. Pedimos a regularização até sexta-feira (03/10), com o envio do comprovante para este e-mail.\n\nResponsável pela conferência: Fábio (Financeiro). Se houver qualquer dificuldade, conversamos para encontrar a melhor solução.\n\nAtenciosamente,\nDejavite Construtora']],
  impacto:'Recupera o valor em atraso sem desgaste na relação.',depois:'O Fábio envia o e-mail e agenda a conferência para sexta.'},
 'Atualizar fluxo de caixa da obra':{tipo:'Fluxo de caixa',blocos:[
   ['Resumo','Entradas previstas: R$ 61.000. Saídas previstas: R$ 47.500. Saldo projetado em 30 dias: positivo.']],
  impacto:'Antecipa falta de caixa.',depois:'O Fábio atualiza a planilha.'},
 'Conciliar pagamentos da semana':{tipo:'Conciliação',blocos:[
   ['Resultado','14 pagamentos conferidos com notas e contratos. 1 divergência de R$ 120 apontada para conferência.']],
  impacto:'Mantém o caixa confiável.',depois:'O Fábio fecha a conciliação.'},
 'Montar checklist de documentos do financiamento':{tipo:'Checklist de documentos',blocos:[
   ['Cliente','RG e CPF, comprovante de renda, comprovante de residência, certidão de matrícula do terreno atualizada.'],
   ['Obra','Projeto aprovado, alvará, ART assinada, orçamento e cronograma.'],
   ['Validade','Certidão de matrícula vence em 5 dias: renovar antes de enviar ao banco.']],
  impacto:'Evita pendência na análise do financiamento.',depois:'A Joana envia o checklist ao cliente.'},
 'Conferir alvará, ART e documentos da obra':{tipo:'Conferência de documentos da obra',blocos:[
   ['Pontos aprovados','Alvará válido. ART assinada. Certidões em dia.'],
   ['Pendências','Falta a assinatura do responsável técnico na folha 02 do projeto.']],
  impacto:'Evita embargo e atraso no financiamento.',depois:'A Joana protocola os documentos após a correção.'},
 'Preparar contrato de prestação de serviço':{tipo:'Contrato (documento oficial)',blocos:[
   ['Resumo','Contrato de prestação de serviço de construção, conforme o orçamento aprovado. Valor, prazo e condições idênticos aos do orçamento.'],
   ['Cláusulas principais','Escopo, cronograma, liberação por etapas, reajuste, multa por atraso, responsabilidades e foro.'],
   ['Pontos a conferir','Dados do cliente e CNPJ da empresa conferidos. Cláusula de reajuste sem divergência com o orçamento.']],
  impacto:'Formaliza o fechamento da venda.',depois:'A Joana envia o contrato para assinatura. Documento oficial exige confirmação dupla.'}},
 seed:function(){
  addMem({kind:'regra',author:'gab',pin:true,w:5,src:'seed',text:'Todo preço no orçamento cita fonte verificável (SINAPI SP/Nacional, ou loja e produto, como Leroy Merlin de Rio Preto). Sem fonte real, marcar "ESTIMATIVA NÃO VERIFICADA".',tags:['orcamento','preco','material','cotacao','compras','proposta']});
  addMem({kind:'regra',author:'gab',pin:true,w:5,src:'seed',text:'Marketing: sem logo e sem o nome da marca no slide, fundo escuro único em todos os posts e identificação só pelo perfil.',tags:['conteudo','post','carrossel','obra','leads']});
  addMem({kind:'regra',author:'gab',pin:true,w:5,src:'seed',text:'Nada de depoimento ou antes e depois sem autorização escrita do cliente.',tags:['conteudo','post','cliente','obra','compliance']});
  addMem({kind:'regra',author:'gab',pin:true,w:5,src:'seed',text:'Dinheiro, contrato, documento oficial e liberação de etapa só com aprovação do Gabriel.',tags:['compras','contrato','documentos','medicao','etapa','cobranca','campanha','financiamento']});
  addMem({kind:'regra',author:'gab',pin:true,w:5,src:'seed',text:'Diferencial de confiança: a liberação por etapas pelo banco no financiamento. Explicar sempre com clareza.',tags:['financiamento','orcamento','proposta','conteudo','leads','visita']});
  addMem({kind:'regra',author:'gab',pin:true,w:5,src:'seed',text:'Ao achar divergência técnica, apontar o conflito em vez de chutar.',tags:['obra','medicao','orcamento','documentos','cronograma']});
}
});
})();
