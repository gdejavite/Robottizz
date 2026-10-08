/* =====================================================================
   ANDAR 7 · ROBOTIZZ TRADER SOLUTIONS
   Estruturado pelo funil de receita. Números internos NÃO ficam aqui: os
   textos usam {{variáveis}} preenchidas pelos "Dados da empresa" (aba
   Agentes), que ficam só na sua conta. As metas vêm do Supabase ou do
   arquivo de dados importado.
   ===================================================================== */
(function(){
var COMP='COMPLIANCE (CVM/Anbima): nunca prometer lucro, renda garantida, retorno fixo, resultado certo, ausência de perdas ou enriquecimento rápido. Vetado: "copytrade" (usar "estratégias automatizadas via OnTick"), "lucro garantido", "renda passiva garantida", "fique rico", "sem risco" e "risco zero". Sempre incluir aviso de risco ao citar resultado, performance ou backtest.';
var BIZ='NEGÓCIO: a Robotizz vende estratégias automatizadas próprias (Maxximus, Lavoazzie, Imbalance, Equilíbrio), acessíveis via OnTick para quem tem conta na XP ou Rico. Planos: SILVER R$ 97, GOLD R$ 149, PLATINUM R$ 379, INFINITE R$ 949. Mensalidades pelo Iugu. Público: homens de 25 a 44 anos, Sul e Sudeste, que querem automatizar sem largar o controle. Caminho de conversão: comentário "ROBÔ" → DM → link da bio → ativação no OnTick.';
var WPP='WHATSAPP: a conta está em janela pós-restrição (desde {{wpp_restricao}}). Não usar WhatsApp como destino de anúncio nem fazer disparo sem a confirmação do Gabriel.';
var RISCO='Aviso: resultados passados não garantem resultados futuros. Operar no mercado financeiro envolve risco de perda.';
function mk(id,name,role,room,color,hair,auto,seat){return {id:id,name:name,role:role,room:room,color:color,hair:hair,auto:auto,seat:seat||1}}
function D(t,b,i,d){return {tipo:t,blocos:b,impacto:i,depois:d}}
/* aprovação de exemplo; exec = ação real enviada ao n8n depois que você aprova */
function A(k,t,d,exec){return {k:k,title:t,d:d,exec:exec||null}}
registerFloor({
 meta:{id:'rob',nome:'Robotizz',andar:7,empresa:'Robotizz',empresaLong:'Robotizz Trader Solutions',
   sub:'7º andar · Robotizz Trader Solutions · dados reais da gestão, entregas de exemplo',tag:'dados reais · metas provisórias',realMet:true,
   lsKey:'torre_mem_v5',docName:'torre-memoria-rob-v5',hud:['receita','leadsReg'],stuckAt:24,meetAt:40,
   greet:'Oi, Gabriel. Aqui é a Recepção do 7º andar. O foco é aumentar o faturamento: o que você precisa?',
   sugg:['Plano de crescimento da semana','Publicar as peças paradas','Painel de funil e receita','Plano de retenção dos primeiros 90 dias']},
 ROOMS:{dir:['DIRETORIA','Gabriel · Vic'],con:['CONTEÚDO','Maestro · Cleo · Social'],aq:['VENDAS','Luna · Rita · Retenção'],qua:['DADOS','Atlas · Dara · Robôs'],
   tra:['TRÁFEGO','Trace · Buck · Mídia'],ti:['AUTOMAÇÃO','Alex · Otto · Execução'],rev:['COMPLIANCE','Íris · Revisão & QA'],reu:['REUNIÃO','Decisões e atas']},
 AG:[
   {id:'gab',name:'Gabriel',role:'Sócio',room:'dir',color:'#f4b860',hair:'#2a2118',me:1,auto:[]},
   {id:'bia',name:'Bia',role:'Recepção',room:'hall',color:'#b072ff',hair:'#3a1f5c',fixed:[11.4,.78],auto:[['g','Classificar e encaminhar pedidos'],['y','Pedir detalhe quando o pedido for vago'],['r','Executar tarefas sozinha: ela só roteia']]},
   mk('vic','Vic','Chefe de Receita','dir','#ffd37a','#2a2118',[['g','Ler o funil e priorizar ciclos PDCA'],['y','Aprovar plano semanal com você'],['r','Mover verba ou prometer resultado']],2),
   mk('maestro','Maestro','Conteúdo e calendário','con','#59c7e0','#5a2d1c',[['g','Roteiros, legendas e calendário'],['y','Publicar peça aprovada pela Íris'],['r','Usar termo vetado ou prometer resultado (barrado)']]),
   mk('cleo','Cleo','Direção visual','con','#ff9ec0','#3b2a1a',[['g','Roteiro visual de carrossel e Reels'],['y','Enviar arte para publicação'],['r','Aviso de risco ilegível (barrado)']],2),
   mk('luna','Luna','SDR e conversão','aq','#2fd5b4','#1c1c2b',[['g','Qualificar leads e registrar no pipeline'],['y','Enviar mensagem de conversão ao lead quente'],['r','Prometer resultado ou disparar WhatsApp (barrado)']]),
   mk('rita','Rita','Retenção e sucesso','aq','#b58cf0','#4a2418',[['g','Mapear risco de churn e planejar toques'],['y','Enviar plano de retenção aprovado'],['r','Disparo em massa ou WhatsApp sem liberação']],2),
   mk('trace','Trace','Analista de tráfego','tra','#f08a5d','#1f1a16',[['g','Auditar campanhas e benchmarks'],['y','Propor teste de criativo'],['r','Ativar campanha sem confirmação dupla']]),
   mk('buck','Buck','Orçamento e escala','tra','#e8a23c','#222',[['g','Calcular LTV e CAC máximo'],['y','Propor verba de teste'],['r','Gastar ou mover verba sem confirmação dupla']],2),
   mk('atlas','Atlas','Quant e robôs','qua','#7fd18b','#2d2d2d',[['g','Ler ranking, drift e atualizar o catálogo'],['y','Sugerir pausa ou ajuste de robô'],['r','Mexer em conta de trading']]),
   mk('dara','Dara','Dados e receita','qua','#4fb3a5','#201a14',[['g','Painel de funil, MRR e churn (dados agregados)'],['y','Padronizar registros no sistema de gestão'],['r','Expor nome, telefone ou e-mail (LGPD)']],2),
   mk('alex','Alex','Automação e infraestrutura','ti','#8f9bff','#222',[['g','Monitorar conexões, Supabase e Windsor'],['y','Publicar nova automação'],['r','Alterar credenciais sozinho']]),
   mk('otto','Otto','Execução por API','ti','#9dd0ff','#1c1c28',[['g','Preparar publicação e campanha pausada'],['y','Agendar peças aprovadas'],['r','Ativar campanha sem confirmação dupla']],2),
   mk('iris','Íris','Compliance e qualidade','rev','#ff7eb6','#3b2a1a',[['g','Revisar texto, números e avisos de risco'],['y','Devolver para retrabalho com motivo'],['r','Aprovar peça com promessa de resultado']])
 ],
 WORKERS:['vic','maestro','cleo','luna','rita','trace','buck','atlas','dara','alex','otto'],
 ORDER:['bia','vic','maestro','cleo','luna','rita','trace','buck','atlas','dara','alex','otto','iris'],
 OWNER:{dir:'gab',con:'maestro',aq:'luna',qua:'atlas',tra:'trace',ti:'alex',rev:'iris',reu:null},
 REVID:'iris',RECID:'bia',
 LEVELS:{buck:'supervisionado',otto:'supervisionado',rita:'supervisionado'},
 STK:{id:'alex',conn:'meta',log:'Alex travou: o token do Meta Ads expirou.',title:'Alex travou',desc:'O token do Meta Ads expirou. Reconecte em Conexões.',
   mem:'O token do Meta Ads expirou e travou o Alex. Avisar o Gabriel para reconectar com 7 dias de antecedência.',tags:['token','conexao','trafego','campanha'],
   subject:'Alex travou: reconectar o Meta Ads',body:'O token do Meta Ads expirou e o Alex parou de trabalhar. Abra a Torre Gabriel e toque em Reconectar (ou reconecte em Conexões).',fixLog:'Alex reconectou o Meta Ads e voltou ao trabalho.'},
 theme:{rug:['rgba(58,76,120,.55)','rgba(150,175,230,.55)'],ledGlow:'rgba(255,170,60,.28)',ledCore:'rgba(255,214,140,.95)',plate:'#33466f',recLed:'#ffc467',bar:['rgba(190,215,255,.95)','rgba(120,165,255,.82)','rgba(80,120,225,.8)']},
 decor:{dir:'kpi',con:'moodboard',aq:'funnel',qua:'candles',tra:'ads',ti:'server',rev:'checklist',reu:'tvboard'},
 props:{ti:{s:'rack',x:4.3,y:3.0}},
 barsData:[30,45,25,60,40,55,35],
 /* metas: valor atual e histórico chegam pelo Supabase ou pelo arquivo de dados (v:null = sem dado ainda) */
 MET:{
   receita:{n:'Receita mensal lançada (OnTick)',s:'RECEITA',f:'brl0',v:null,m:3000,dir:1,rev:true,h:[]},
   perm:{n:'Permanência média (meses)',s:'PERMANÊNCIA',f:'meses',v:null,m:3,dir:1,h:[]},
   leadsReg:{n:'Leads registrados por semana',s:'LEADS',f:'int',v:null,m:10,dir:1,h:[]},
   seguidores:{n:'Seguidores no Instagram',s:'SEGUIDORES',f:'int',v:null,m:2500,dir:1,h:[]},
   publicados:{n:'Peças publicadas por semana',s:'PEÇAS',f:'int',v:null,m:3,dir:1,h:[]}},
 /* variáveis usadas nos textos deste andar (a aba Agentes avisa quando falta alguma) */
 DATAVARS:["ads_gasto", "ads_parados", "ads_periodo", "alcance_desde", "cac_max", "casos_plat_silver", "ctr_anteriores", "ex_assinantes", "ltv_gold", "melhor_cpc", "melhor_ctr", "melhor_semana", "pecas_desde", "pecas_paradas", "perm_faixa", "perm_gold", "pipeline", "receita_jan", "receita_set", "robos", "robos_ativos", "robos_atualizado", "robos_qtd", "seguidores", "supabase_status", "wpp_restricao"],
 MEET:[
   {who:'rita',title:'Reunião · Retenção · agora (15 min)',part:['rita','luna','dara'],d:'A permanência média é de {{perm_gold}} e o LTV do GOLD fica perto de {{ltv_gold}}.',
    opts:['A · Priorizar o onboarding dos primeiros 30 dias (D0, D3, D7, D14, D30)','B · Priorizar a reativação dos {{ex_assinantes}} ex-assinantes'],reco:'Recomendação da Rita: A, porque segura quem já chega e não depende de WhatsApp.'},
   {who:'maestro',title:'Reunião · Conteúdo · agora (10 min)',part:['maestro','cleo','iris'],d:'Há {{pecas_paradas}} peças paradas e o alcance está zerado desde {{alcance_desde}}.',
    opts:['A · Publicar as peças paradas em 2 semanas, na ordem de maior conversão','B · Refazer o calendário do zero'],reco:'Recomendação do Maestro: A, é o ganho mais rápido e já está pronto.'}],
 CONNS:[
   {id:'gestao',n:'Sistema de gestão (Supabase)',d:'Assinantes, pipeline, conteúdo e financeiro. {{supabase_status}}',exp:'ativo'},
   {id:'iugu',n:'Iugu (mensalidades do OnTick)',d:'Fonte das cobranças, do MRR e do churn',pend:true},
   {id:'meta',n:'Meta Ads via Windsor',d:'Trace, Buck e Otto dependem desta conexão',exp:'token expira em 3 dias'},
   {id:'mql5',n:'Ranking MQL5',d:'Atlas lê posição e desempenho dos robôs'},{id:'gmail',n:'Gmail',d:'Avisos e briefing'},{id:'cal',n:'Google Calendar',d:'Reuniões dos agentes'},
   {id:'canva',n:'Canva',d:'Artes dos carrosséis'},{id:'n8n',n:'n8n',d:'Automações e filas'},{id:'vercel',n:'Vercel',d:'Hospedagem do app de gestão e do painel'}],
 ROUTE:[
   ['atlas',/\bea\b|mql5|ranking|drawdown|drift|backtest|cat[aá]logo|rob[oô]s/i,'Dados e Robôs'],
   ['rita',/reten|churn|cancel|upgrade|reativ|perman[eê]ncia|p[oó]s-venda/i,'Retenção'],
   ['luna',/lead|\bdm\b|whats|sdr|proposta|convers/i,'Vendas'],
   ['maestro',/post|carrossel|legenda|roteiro|reels|conte[uú]do|calend|pe[cç]as?\b/i,'Conteúdo'],
   ['cleo',/visual|arte|design|imagem/i,'Conteúdo (visual)'],
   ['buck',/verba|or[cç]amento|\bcac\b|\bltv\b|escala/i,'Tráfego (orçamento)'],
   ['trace',/an[uú]ncio|campanha|meta ads|\bcpl\b|\bctr\b|tr[aá]fego/i,'Tráfego'],
   ['dara',/dado|painel|funil|mrr|receita|iugu|ontick|supabase/i,'Dados'],
   ['alex',/token|automa|n8n|deploy|erro|conex/i,'Automação'],
   ['otto',/publicar|agendar|executar|\bapi\b/i,'Execução'],
   ['vic',/plano|estrat[eé]gia|faturamento|crescimento|meta\b/i,'Receita']],
 AVA:{gab:{hs:'short',sk:'#e9bf98',tie:'#f4b860'},bia:{hs:'bob',sk:'#f2caa6'},vic:{hs:'short',sk:'#e0ac80',tie:'#ffd37a'},maestro:{hs:'bun',sk:'#f2caa6'},cleo:{hs:'long',sk:'#c68a5e'},
   luna:{hs:'long',sk:'#d9a273'},rita:{hs:'long',sk:'#e9bf98'},trace:{hs:'short',sk:'#d9a273',gl:1},buck:{hs:'cap',sk:'#e0ac80'},atlas:{hs:'short',sk:'#e9bf98',gl:1},
   dara:{hs:'bun',sk:'#c68a5e',gl:1},alex:{hs:'cap',sk:'#d9a273'},otto:{hs:'cap',sk:'#f2caa6'},iris:{hs:'bob',sk:'#f2caa6'}},
 EMO:{gab:'👤',bia:'🛎️',vic:'🧭',maestro:'🎼',cleo:'🎬',luna:'💬',rita:'💚',trace:'🔎',buck:'💵',atlas:'📊',dara:'🧮',alex:'🔧',otto:'⚙️',iris:'🔍'},
 SLEMO:{gab:':bust_in_silhouette:',bia:':bellhop_bell:',vic:':compass:',maestro:':musical_score:',cleo:':clapper:',luna:':speech_balloon:',rita:':green_heart:',trace:':mag_right:',buck:':dollar:',atlas:':bar_chart:',dara:':abacus:',alex:':wrench:',otto:':gear:',iris:':mag:'},
 AGTAGS:{
   vic:['receita','funil','plano','leads','retencao','conteudo','campanha','prazo','prova'],
   maestro:['conteudo','post','carrossel','reels','leads','prova','compliance','calendario'],
   cleo:['conteudo','carrossel','reels','visual','compliance'],
   rita:['retencao','cliente','upgrade','reativacao','compliance','prova'],
   trace:['trafego','cpl','campanha','criativo','leads','compliance'],
   buck:['trafego','verba','cac','ltv','campanha'],
   dara:['dados','funil','receita','mrr','ltv','cac','leads','relatorio'],
   otto:['execucao','publicar','campanha','deploy','conexao'],
   luna:['leads','proposta','conversao','prova','compliance','funil'],
   atlas:['ea','ranking','drawdown','relatorio','prova','conteudo','robos'],
   bia:['pedido'],iris:['compliance'],alex:['token','automacao','deploy','conexao','trafego','supabase']},
 KW:[[/reten|churn|permanên/i,'retencao'],[/upgrade|platinum|gold/i,'upgrade'],[/reativ/i,'reativacao'],[/cac|ltv/i,'cac'],[/mrr|receita|faturamento|iugu/i,'receita'],[/funil|pipeline/i,'funil'],[/cat[aá]logo|rob[oô]s/i,'robos'],[/calend[aá]rio/i,'calendario'],[/painel|dados/i,'dados'],[/publicar|agendar/i,'publicar']],
 REJ:[
  {k:'promessa',ag:['luna','maestro','cleo','rita','trace'],t:'promessa de ganho no texto',lesson:'Não prometer ganho nem usar "garantido"; mostrar só dado real do ranking, com aviso de risco.'},
  {k:'aviso',ag:['luna','maestro','cleo','rita','trace'],t:'faltou o aviso de risco no rodapé',lesson:'Todo material de trading precisa de aviso de risco visível no rodapé ou no último slide.'},
  {k:'fonte',ag:['atlas','dara','trace','buck','vic'],t:'número sem fonte',lesson:'Todo número precisa citar a fonte (ranking MQL5, Meta Ads, Supabase) e a data.'},
  {k:'garantido',ag:['luna','maestro','cleo','rita','trace'],t:'a palavra "garantido" no texto',lesson:'Banir "garantido", "sem risco" e "lucro certo" em legendas e copy.'},
  {k:'impacto',ag:['buck','trace'],t:'faltou o impacto esperado em reais',lesson:'Todo ajuste de campanha precisa mostrar o impacto esperado em reais.'},
  {k:'preview',ag:['alex','otto'],t:'faltou o teste no preview',lesson:'Toda publicação passa pelo preview antes de ir ao ar.'},
  {k:'vetada',ag:['maestro','cleo','luna','rita','trace'],t:'termo vetado ("copytrade")',lesson:'Banir "copytrade" e demais termos vetados; usar "estratégias automatizadas via OnTick".'},
  {k:'whatsapp',ag:['luna','rita','otto','trace'],t:'destino ou disparo no WhatsApp sem liberação',lesson:'Sem destino ou disparo no WhatsApp na janela pós-restrição, sem confirmação do Gabriel.'}],
 METFX:{vic:[['receita',[60,160],0]],maestro:[['publicados',[.5,1],0]],cleo:[['publicados',[.3,.6],0]],luna:[['leadsReg',[1,2],0]],rita:[['perm',[.05,.15],0]],
    trace:[['leadsReg',[.5,1],0]],buck:[['receita',[20,50],0]],atlas:[['leadsReg',[.2,.5],0]],dara:[['leadsReg',[.2,.5],0]],alex:[],otto:[['publicados',[.3,.6],0]]},
 CHK:{
   vic:['Meta ligada a um indicador real','Prioridades por Pareto ou GUT','Sem prometer resultado'],
   maestro:['Sem termos vetados e sem promessa de lucro','Aviso de risco presente','CTA de conversão (ROBÔ)','Dado real com fonte e data'],
   cleo:['Aviso de risco legível','Texto de alto contraste','Sem termos vetados'],
   luna:['Sem promessa de resultado','Nenhum disparo no WhatsApp','Lead registrado com o mínimo de dados (LGPD)'],
   rita:['Opt-in e opção de sair','Sem disparo no WhatsApp','Dados mínimos (LGPD)','Aviso de risco quando citar resultado'],
   trace:['Dados vindos do Windsor','Comparado com os benchmarks','Sem destino WhatsApp'],
   buck:['Dentro do teto de CAC (LTV/3)','Verba só com confirmação dupla','Pagamento em cartão de crédito'],
   atlas:['Números com fonte e data','Nenhuma ação na conta de trading','Aviso de risco'],
   dara:['Só dados agregados (LGPD)','Fonte dos números citada','Previsto x realizado comparado'],
   alex:['Testado antes de ativar','Sem alterar credenciais','Dá para reverter'],
   otto:['Campanha criada pausada','Aprovada pela Íris e por você','Segurança de BM conferida']},
 CTX:{
   bia:'Recepção do 7º andar. Recebe os pedidos do Gabriel, identifica o setor (receita, conteúdo, vendas e retenção, tráfego, dados e robôs, automação) e encaminha ao agente responsável. Pergunta o mínimo quando o pedido estiver vago. Não executa tarefas sozinha.',
   vic:'Chefe de Receita da Robotizz e dono da meta de faturamento. Toda semana: lê o funil (leads, conversão, ticket e permanência), escolhe no máximo 3 ciclos PDCA de maior impacto (Pareto ou GUT), distribui a verba pelo teto de CAC (LTV/3), cobra o time e resume ao Gabriel com uma decisão clara. Metas provisórias a validar com o Gabriel: receita de R$ 3.000/mês, permanência de 3 meses, 10 leads registrados por semana e 3 peças publicadas por semana. Prioridade atual: 1) registrar leads, 2) retenção, 3) retomar o Instagram. '+BIZ+' ',
   maestro:'Conteúdo e calendário da Robotizz (Maestro Ontick). Antes de criar, considera público, concorrência e gargalos de conversão. Entrega calendário e roteiro completos, prontos para publicar, com conversão como objetivo: comentário "ROBÔ", DM ou clique no link da bio (seguidores são consequência). Usa os nomes das estratégias. Toda peça passa pela Íris. Primeira missão: destravar as {{pecas_paradas}} peças aguardando aprovação. '+COMP+' '+BIZ,
   cleo:'Direção visual e roteiro de carrossel e Reels da Robotizz. Recebe o roteiro do Maestro e descreve cada slide ou cena (fundo, texto, destaque, cor) pronto para o renderizador de carrossel. Fundo escuro com destaque verde, texto de alto contraste, aviso de risco legível no último slide. Reels de até 30 segundos com gancho nos 3 primeiros. '+COMP,
   luna:'SDR e conversão da Robotizz. Atende os leads do comentário "ROBÔ" e das DMs do Instagram: qualifica (tem conta na XP ou Rico? experiência? capital? objetivo?), responde dúvidas em linguagem simples e conduz ao OnTick. Responde em até 1 hora e registra todo lead no pipeline (Lead, WhatsApp, Call, Ativação, com a fonte), anotando só o necessário (LGPD). '+WPP+' '+COMP+' '+BIZ,
   rita:'Retenção e sucesso do cliente. Meta: aumentar a permanência (hoje {{perm_gold}} no GOLD). Plano dos primeiros 90 dias: onboarding (D0, D3, D7, D14, D30), explicação de drawdown em períodos negativos, check-in, reativação de ex-assinantes, upgrade GOLD para PLATINUM (maior margem) e indicação. Contato só com opt-in e dados mínimos (LGPD), sem disparo em massa. '+WPP+' '+COMP,
   trace:'Analista de tráfego pago (Meta Ads), com o Windsor como fonte. Benchmarks: CAC ≤ LTV/3 (métrica-mãe); CPM ≤ R$ 50 (R$ 50 a 70 aceitável, acima de 70 alerta); CTR acima de 2% ótimo e acima de 1% bom (abaixo de 1%, revisar o criativo); connect rate acima de 80%; frequência ≤ 2. CTR, CPC e CPM são diagnóstico: o alvo é custo por lead qualificado e a ativação no OnTick. Anúncios parados desde {{ads_parados}}; melhor semana ({{melhor_semana}}): CTR {{melhor_ctr}} e CPC {{melhor_cpc}}. '+WPP+' '+COMP,
   buck:'Orçamento e escala. Calcula LTV e CAC máximo por plano (GOLD: LTV ≈ {{ltv_gold}}, CAC máximo ≈ {{cac_max}}), propõe verba de teste pequena e escala conservadora, e pausa o que passar do teto. Com poucas conversões, otimiza por um evento mais alto do funil (lead). Nunca move nem gasta verba sem a confirmação dupla do Gabriel. Segurança de conta: pagamento em cartão de crédito. ',
   atlas:'Quant e robôs. Acompanha os {{robos}} do catálogo (mercados WIN, WDO e CCM), o ranking do MQL5 (Top 1 e Top 3 do Brasil), o drawdown e o drift. Mantém o catálogo atualizado (o número de clientes por robô está desatualizado desde {{robos_atualizado}}) e entrega prova auditável, com fonte e data, para o conteúdo. Nunca mexe em conta de trading. Aviso de risco sempre.',
   dara:'Dados e receita. Mantém o painel de funil e receita com dados reais: Supabase (clientes, pipeline, contas, conteúdo, insights) e Iugu (mensalidades do OnTick; integração pendente). Calcula MRR, churn, LTV e CAC máximo por plano e a conversão por fonte. LGPD: trabalha só com dados agregados e nunca expõe nome, telefone ou e-mail. ',
   alex:'Automação e infraestrutura. Cuida do n8n, dos tokens (Meta e Windsor), da Z-API, do Supabase e do rastreamento (pixel via GTM). Monitora o projeto Supabase e a coleta semanal do Windsor. Prioridades: manter as rotinas ativas, integrar o Iugu em modo somente leitura e aplicar os alertas de segurança do Supabase (advisors). Nunca altera credenciais sozinho.',
   otto:'Execução técnica por API oficial (Meta Ads e Instagram), sempre depois da aprovação do Gabriel e do portão de compliance da Íris. Cria campanha pausada e nunca ativa sozinho. Segurança de BM: perfil pessoal maduro, Instagram profissional ligado à página (nunca direto à BM), pagamento em cartão de crédito. Registra tudo o que executou. '+WPP,
   iris:'Compliance e qualidade. Portão obrigatório antes de qualquer peça sair: barra promessa de lucro, "copytrade" e termos vetados, exige aviso de risco, confere números, fontes e a proteção de dados (LGPD) e verifica se o destino WhatsApp está liberado. Devolve para retrabalho com o motivo exato. '+COMP
  },
 TPL:{
   vic:[{t:'Plano de crescimento da semana (PDCA)',rv:1,ap:A('amarelo','Aprovar o plano de crescimento da semana','Três ciclos PDCA priorizados: registrar leads, retenção e retomar o Instagram.')},{t:'Revisão semanal de funil e experimentos'}],
   maestro:[{t:'Destravar as peças paradas do calendário',rv:1,ap:A('amarelo','Publicar as peças que aguardam aprovação','Carrosséis e Reels, com CTA "ROBÔ" e aviso de risco, em 2 semanas.')},
            {t:'Roteiro do carrossel da semana (CTA ROBÔ)',rv:1,ap:A('amarelo','Publicar o carrossel da semana','7 slides com dado real do ranking, CTA "ROBÔ" e aviso de risco.')},
            {t:'Calendário editorial das próximas 2 semanas',rv:1}],
   cleo:[{t:'Direção visual do carrossel da semana',rv:1},{t:'Roteiro de Reels de 30s sobre drawdown',rv:1,ap:A('amarelo','Publicar o Reels sobre drawdown','Roteiro de 30s, linguagem simples, sem promessa de ganho.')}],
   luna:[{t:'Qualificar lead do Instagram (comentário ROBÔ)',rv:1,ap:A('amarelo','Enviar a mensagem de conversão ao lead quente','Lead que comentou "ROBÔ", com conta na XP. Mensagem com aviso de risco, sem WhatsApp.')},
         {t:'Registrar os leads do dia no pipeline'},{t:'Follow-up de leads sem resposta em 24h',rv:1}],
   rita:[{t:'Plano de retenção dos primeiros 90 dias',rv:1,ap:A('amarelo','Aprovar o plano de retenção dos primeiros 90 dias','Toques em D0, D3, D7, D14 e D30, com meta de permanência de 3 meses.')},
         {t:'Reativar os ex-assinantes do histórico',rv:1,ap:A('vermelho','Enviar a campanha de reativação aos ex-assinantes','Exige confirmação dupla: risco de bloqueio e LGPD. Só e-mail, com opção de sair.')},
         {t:'Plano de upgrade GOLD para PLATINUM',rv:1,ap:A('amarelo','Aprovar o plano de upgrade GOLD para PLATINUM','Aumenta o ticket médio, com explicação do risco.')}],
   trace:[{t:'Auditar as campanhas contra os benchmarks'},{t:'Replicar o criativo da melhor semana (teste pequeno)',rv:1}],
   buck:[{t:'Teto de CAC e verba do teste',rv:1,ap:A('vermelho','Aprovar a verba do teste: R$ 30/dia por 7 dias (R$ 210)','Mexe em dinheiro, então exige confirmação dupla. Teto de CAC de {{cac_max}}.')},{t:'Calcular LTV e CAC máximo por plano'}],
   atlas:[{t:'Atualizar o catálogo de robôs',rv:1,ap:A('amarelo','Atualizar status e clientes dos robôs no sistema de gestão','{{robos}}.')},
          {t:'Montar prova auditável do ranking do MQL5',rv:1},{t:'Checar o drift dos robôs ativos'}],
   dara:[{t:'Painel de funil e receita (Supabase e Iugu)',rv:1},{t:'Padronizar o registro de leads',rv:1,ap:A('amarelo','Padronizar o registro de leads (campos e origem)','Campos fixos e registro no mesmo dia, sem dados pessoais desnecessários.')},{t:'Calcular MRR, churn e LTV por plano'}],
   alex:[{t:'Conferir as rotinas do Supabase e do Windsor',rv:1,ap:A('amarelo','Configurar o alerta de projeto pausado e a coleta semanal','Garante que a coleta do Windsor não pare.')},
         {t:'Integrar o Iugu ao n8n (somente leitura)',rv:1,ap:A('amarelo','Criar a integração do Iugu (somente leitura)','Traz MRR, churn e inadimplência reais para o painel.')},
         {t:'Revisar os alertas de segurança do Supabase',rv:1,ap:A('amarelo','Revisar os alertas de segurança do Supabase','Reduz risco de acesso indevido aos dados dos clientes.')}],
   otto:[{t:'Agendar a publicação das peças aprovadas',rv:1,ap:A('amarelo','Agendar 3 publicações por semana no Instagram','Só peças aprovadas pela Íris e por você.',{acao:'instagram_agendar',label:'agendar 3 publicações por semana',params:{por_semana:3}})},
         {t:'Montar a campanha de teste pausada no Meta Ads',rv:1,ap:A('vermelho','Criar a campanha de teste (pausada)','Exige confirmação dupla. Criada pausada, sem destino WhatsApp.',{acao:'meta_campanha_pausada',label:'criar a campanha de teste PAUSADA',params:{objetivo:'lead',verba_dia:30,dias:7,destino_whatsapp:false,status:'PAUSED'}})}]
  },
 DV:{
   'Plano de crescimento da semana (PDCA)':D('Plano semanal de receita (PDCA)',[
     ['Diagnóstico (dados reais)','Receita lançada: {{receita_set}} em set (jan: {{receita_jan}}). Permanência média do GOLD: {{perm_gold}}. Pipeline {{pipeline}}. Instagram sem alcance desde {{alcance_desde}}. Anúncios parados desde {{ads_parados}}.'],
     ['Prioridades (Pareto)','1) Registrar todos os leads, com a origem. 2) Plano de retenção dos primeiros 90 dias. 3) Publicar as {{pecas_paradas}} peças paradas, com CTA ROBÔ.'],
     ['Metas provisórias (a validar com você)','Receita de R$ 3.000/mês, permanência de 3 meses, 10 leads registrados por semana e 3 peças publicadas por semana.'],
     ['Riscos','Janela pós-restrição do WhatsApp: sem destino WhatsApp em anúncio e sem disparo. Compliance CVM/Anbima em toda peça.']],
     'Alinha o time nos 3 ciclos de maior impacto nas próximas 2 semanas.','A Vic distribui as tarefas aos setores e acompanha a verificação em 7 dias.'),
   'Revisão semanal de funil e experimentos':D('Revisão semanal (PDCA)',[
     ['C · Verificar','Compara previsto e realizado de cada ciclo da semana, com dado real do Supabase e do Iugu.'],
     ['A · Agir','Padroniza o que bateu a meta; ajusta ou abandona o resto e registra a lição na memória.']],
     'Mantém o time aprendendo semana a semana.','A Vic registra o resultado na memória do time.'),
   'Destravar as peças paradas do calendário':D('Plano de publicação das peças paradas',[
     ['Situação','{{pecas_paradas}} peças (carrosséis e Reels) aguardam aprovação desde {{pecas_desde}}. Nenhuma foi publicada.'],
     ['Plano','Revisar cada peça com a Íris, trocar o CTA para comentar "ROBÔ", incluir o aviso de risco e publicar 3 por semana, durante 2 semanas.'],
     ['Checklist por peça','Sem termos vetados, sem promessa de lucro, dado real com fonte e data, CTA de conversão e aviso de risco.']],
     'Retoma o alcance (zerado desde {{alcance_desde}}) e gera os primeiros leads quentes.','O Otto agenda 3 publicações por semana.'),
   'Roteiro do carrossel da semana (CTA ROBÔ)':D('Carrossel de 7 slides + legenda',[
     ['Slide 1 · Gancho','Estratégia automatizada: o que olhar antes de ativar.'],
     ['Slide 2 · O problema','Muita gente ativa estratégia pela promessa, sem olhar o histórico e o risco.'],
     ['Slide 3 · Dado real','Ranking público do MQL5: Top 1 e Top 3 do Brasil. Fonte e data no rodapé.'],
     ['Slide 4 · Como ler','Drawdown, tempo de histórico e número de operações valem mais que o lucro isolado.'],
     ['Slide 5 · Gestão de risco','Risco controlado e limite de perda: automação que opera enquanto você cuida da sua vida.'],
     ['Slide 6 · Como ativar','Estratégias da Robotizz (Maxximus, Lavoazzie, Imbalance, Equilíbrio) via OnTick, para quem tem conta na XP ou Rico.'],
     ['Slide 7 · Chamada e aviso','Comente "ROBÔ" e eu te explico.\n'+RISCO],
     ['Legenda','Antes de ativar qualquer estratégia, olhe o histórico e o risco. Salve este post.\n\n'+RISCO]],
     'Meta: leads quentes por semana (comentário "ROBÔ" e DMs), medidos em 7 dias.','O Otto agenda a publicação no Instagram.'),
   'Calendário editorial das próximas 2 semanas':D('Calendário de 2 semanas',[
     ['Semana 1','Seg: carrossel (como ler o ranking). Qua: Reels (drawdown em 30s). Sex: carrossel (gestão de risco).'],
     ['Semana 2','Seg: carrossel (as 4 estratégias via OnTick). Qua: Reels (o que olhar antes de ativar). Sex: post de FAQ.'],
     ['Regra','Toda peça com CTA "ROBÔ", aviso de risco e revisão da Íris.']],
     'Garante 3 peças por semana.','O Maestro cadastra o calendário no sistema de gestão.'),
   'Direção visual do carrossel da semana':D('Direção visual',[
     ['Fundo e cor','Fundo escuro, destaque verde da marca, texto grande de alto contraste.'],
     ['Por slide','S1: gancho em até 6 palavras. S3: gráfico de drawdown com fonte e data. S7: "Comente ROBÔ" e aviso de risco legível.']],
     'Padroniza o visual e a legibilidade.','A Cleo envia o roteiro visual ao renderizador de carrossel.'),
   'Roteiro de Reels de 30s sobre drawdown':D('Roteiro de Reels de 30 segundos',[
     ['0 a 3 s · Gancho','"Você sabe o que é drawdown? Quase ninguém olha."'],
     ['3 a 12 s · Explicação','Drawdown é a maior queda entre um pico e o fundo seguinte. Mostra o risco que você corre.'],
     ['12 a 25 s · Dado real','Mostrar o drawdown no ranking do MQL5, com fonte e data.'],
     ['25 a 30 s · Chamada e aviso','"Comente ROBÔ para entender como ler isso." Texto na tela: '+RISCO]],
     'Meta: leads quentes medidos em 7 dias.','O Otto agenda a publicação.'),
   'Qualificar lead do Instagram (comentário ROBÔ)':D('Mensagem de conversão ao lead',[
     ['Perfil do lead (sem dados pessoais)','Comentou "ROBÔ" no carrossel. Tem conta na XP e cerca de 1 ano de experiência.'],
     ['Mensagem que a Luna vai enviar','Oi! Vi o seu comentário. As estratégias automatizadas da Robotizz rodam via OnTick, para quem tem conta na XP ou Rico. Posso te explicar como funciona e quais são os riscos?\n\n'+RISCO],
     ['Registro','Lead entra no pipeline: fonte Instagram, etapa Lead, prioridade alta.']],
     'Leva o lead quente para a etapa de WhatsApp ou call, sem disparo em massa.','A Luna envia a DM e registra o lead.'),
   'Registrar os leads do dia no pipeline':D('Registro de leads',[
     ['Padrão','Cada lead entra com fonte (Instagram, Meta Ads, Indicação), etapa e prioridade, só com o dado necessário (LGPD).']],
     'Torna conversão e CAC mensuráveis.','A Luna atualiza o pipeline.'),
   'Follow-up de leads sem resposta em 24h':D('Follow-up de leads',[
     ['Mensagem','Oi! Passando para ver se ficou alguma dúvida sobre as estratégias via OnTick. Se quiser, explico os riscos e como ativar.\n\n'+RISCO]],
     'Recupera leads que esfriaram.','A Luna envia o follow-up por DM.'),
   'Plano de retenção dos primeiros 90 dias':D('Plano de retenção (90 dias)',[
     ['Diagnóstico','Permanência média do GOLD: {{perm_gold}} ({{perm_faixa}}). Assinantes do histórico: {{ex_assinantes}}, todos inativos.'],
     ['Toques planejados','D0 boas-vindas e primeiro passo no OnTick. D3 como ler o painel. D7 o que é drawdown e como acompanhar. D14 check-in. D30 resultado do mês, com aviso de risco.'],
     ['Meta e verificação','Permanência de 3 meses. Medir a porcentagem de assinantes ativos no D30 e no D60.'],
     ['Canais','E-mail e DM, com opt-in. WhatsApp só depois da liberação do Gabriel.']],
     'Cada mês a mais de permanência no GOLD vale cerca de R$ 149 por cliente.','A Rita configura os toques e acompanha a verificação.'),
   'Reativar os ex-assinantes do histórico':D('Campanha de reativação (e-mail)',[
     ['Mensagem','Oi! Faz um tempo que você usou as estratégias da Robotizz. Quer saber o que mudou? Posso te explicar os riscos e como funciona hoje via OnTick.\n\n'+RISCO+'\nPara não receber mais, responda SAIR.'],
     ['Regras','Só e-mail, com opção de sair. Máximo de 1 contato por pessoa. Sem WhatsApp. Sem dados pessoais no texto.']],
     'Recupera parte dos {{ex_assinantes}} ex-assinantes.','A Rita envia os e-mails. Risco de bloqueio e de LGPD: exige confirmação dupla.'),
   'Plano de upgrade GOLD para PLATINUM':D('Plano de upgrade',[
     ['Lógica','O PLATINUM (R$ 379) tem maior margem. Oferecer a quem permaneceu 2 meses ou mais, explicando a diferença e o risco.'],
     ['Verificação','Taxa de upgrade em 30 dias.']],
     'Aumenta o ticket médio sem aumentar o CAC.','A Rita aplica o roteiro de upgrade.'),
   'Auditar as campanhas contra os benchmarks':D('Auditoria de tráfego',[
     ['Resumo','Anúncios parados desde {{ads_parados}}. {{ads_periodo}}: {{ads_gasto}}.'],
     ['Benchmarks','Semana de {{melhor_semana}}: CTR {{melhor_ctr}} e CPC {{melhor_cpc}}. Semanas anteriores: CTR {{ctr_anteriores}} (abaixo de 1%: criativo fraco).'],
     ['Recomendação','Replicar o que mudou na semana de {{melhor_semana}} em teste pequeno, com teto de CAC de {{cac_max}}.']],
     'Mostra onde estava o desperdício; não altera nada na conta.','Nada é alterado na conta de anúncios.'),
   'Replicar o criativo da melhor semana (teste pequeno)':D('Plano de teste de criativo',[
     ['Hipótese','O criativo da semana de {{melhor_semana}} (CTR {{melhor_ctr}}) repete o resultado com o mesmo público.'],
     ['Desenho do teste','1 campanha, 2 criativos, objetivo lead, sem destino WhatsApp, por 7 dias.'],
     ['Verificação','CTR acima de 1%, frequência até 2 e custo por lead abaixo de {{cac_max}}.']],
     'Gera dado para decidir a escala.','A Trace entrega o plano ao Buck e ao Otto.'),
   'Teto de CAC e verba do teste':D('Verba do teste (mexe em dinheiro)',[
     ['O que muda','Verba de teste de R$ 30/dia por 7 dias (total R$ 210), objetivo lead, sem destino WhatsApp.'],
     ['Teto','CAC máximo ≈ {{cac_max}} (LTV do GOLD ≈ {{ltv_gold}}, dividido por 3). Pausar se o custo por lead passar de {{cac_max}} ou se a frequência passar de 2 com queda.'],
     ['Risco','Pagamento em cartão de crédito. Sem escalar antes de medir.']],
     'Mede o CAC real em 7 dias, com risco de até R$ 210.','O Buck libera a verba ao Otto. Mexe em dinheiro, então exige confirmação dupla.'),
   'Calcular LTV e CAC máximo por plano':D('LTV e CAC máximo',[
     ['GOLD','Valor R$ 149, permanência {{perm_gold}}, LTV ≈ {{ltv_gold}}, CAC máximo ≈ {{cac_max}}.'],
     ['PLATINUM e SILVER','Poucos casos ({{casos_plat_silver}}): ainda sem base para um número confiável.']],
     'Define o teto de investimento por cliente.','O Buck atualiza o teto a cada mês.'),
   'Painel de funil e receita (Supabase e Iugu)':D('Painel de funil e receita',[
     ['O que mostra','Receita, MRR, permanência, churn, leads por fonte, conversão e CAC, tudo agregado (LGPD).'],
     ['Fontes','Supabase (já lido) e Iugu (integração pendente).']],
     'Dá o número real para cada ciclo PDCA.','A Dara publica o painel e atualiza toda semana.'),
   'Padronizar o registro de leads':D('Padrão de registro de leads',[
     ['Campos','Fonte, etapa, prioridade, data de entrada e resultado. Sem anotações pessoais.'],
     ['Regra','Todo lead que comentar ou mandar DM entra no mesmo dia.']],
     'Permite medir conversão e CAC por canal.','A Dara documenta o padrão e a Luna passa a usar.'),
   'Calcular MRR, churn e LTV por plano':D('MRR, churn e LTV',[
     ['Situação','O sistema de gestão tem {{ex_assinantes}} assinantes históricos, todos inativos; a base ativa real está no Iugu.'],
     ['Ação','Calcular MRR e churn reais assim que o Iugu estiver integrado.']],
     'Troca estimativas por números reais.','A Dara recalcula depois da integração.'),
   'Atualizar o catálogo de robôs':D('Atualização do catálogo',[
     ['Situação','{{robos}}. Clientes por robô desatualizado; última atualização em {{robos_atualizado}}.'],
     ['Ação','Conferir o status de cada robô e preencher a versão e o número de clientes.']],
     'Dá base real para conteúdo e retenção.','O Atlas atualiza o sistema de gestão.'),
   'Montar prova auditável do ranking do MQL5':D('Prova auditável',[
     ['Conteúdo','Posição no ranking (Top 1 e Top 3 do Brasil), drawdown e tempo de histórico, com fonte e data.'],
     ['Aviso','Resultados passados não garantem resultados futuros.']],
     'Alimenta o conteúdo com dado real.','O Atlas entrega o material ao Maestro e à Cleo.'),
   'Checar o drift dos robôs ativos':D('Checagem de drift',[
     ['Resultado','{{robos_ativos}} robôs ativos acompanhados contra a faixa normal de desempenho. Nenhuma ação na conta real sem você.']],
     'Evita surpresa de desempenho.','O Atlas avisa se algum robô sair da faixa.'),
   'Conferir as rotinas do Supabase e do Windsor':D('Rotinas do Supabase e do Windsor',[
     ['Situação','A coleta semanal do Windsor só grava com o projeto Supabase ativo.'],
     ['Ação','Alerta de projeto pausado e conferência da coleta de domingo (09:00).']],
     'Mantém os dados de Instagram e anúncios atualizados.','O Alex configura o alerta e confere a coleta.'),
   'Integrar o Iugu ao n8n (somente leitura)':D('Integração do Iugu',[
     ['O que faz','Traz faturas e assinaturas, já agregadas, para o Supabase (MRR, churn e inadimplência).'],
     ['Segurança','Token só na credencial do n8n, somente leitura, sem dados pessoais no destino.']],
     'Dá a receita e o churn reais do OnTick.','O Alex cria o fluxo no n8n.'),
   'Revisar os alertas de segurança do Supabase':D('Segurança do Supabase',[
     ['Ação','Aplicar as correções apontadas pelos alertas de segurança (advisors) do Supabase, uma por vez e com teste.']],
     'Reduz risco de acesso indevido aos dados dos clientes.','O Alex aplica nas configurações.'),
   'Agendar a publicação das peças aprovadas':D('Agenda de publicação',[
     ['Plano','3 publicações por semana no Instagram, em horários de maior alcance, só de peças aprovadas pela Íris e por você.']],
     'Retoma a frequência de postagem.','O Otto agenda pela API oficial.'),
   'Montar a campanha de teste pausada no Meta Ads':D('Campanha de teste (pausada)',[
     ['Configuração','Objetivo lead, sem destino WhatsApp, R$ 30/dia por 7 dias, criada pausada.'],
     ['Segurança','Instagram ligado à página, pagamento em cartão e ativação só com a sua confirmação dupla.']],
     'Prepara o teste sem gastar nada ainda.','O Otto cria a campanha pausada.')
  },
 /* só regras: os insights com números reais vêm do arquivo de dados (Dados da empresa) */
 seed:function(){
  var T=['compliance','conteudo','post','carrossel','reels','leads','campanha','trafego','prova','proposta','retencao','receita'];
  addMem({kind:'regra',author:'gab',pin:true,w:5,src:'seed',text:'Nunca prometer ganho ou retorno financeiro. Todo material de trading leva aviso de risco visível. Compliance CVM/Anbima em toda peça.',tags:T});
  addMem({kind:'regra',author:'gab',pin:true,w:5,src:'seed',text:'Vocabulário: nunca usar "copytrade", "lucro garantido", "renda passiva garantida", "fique rico" nem "sem risco". Usar "estratégias automatizadas via OnTick".',tags:T});
  addMem({kind:'regra',author:'gab',pin:true,w:5,src:'seed',text:'WhatsApp: a conta está em janela pós-restrição. Sem destino de anúncio no WhatsApp e sem disparo antes da confirmação do Gabriel.',tags:['leads','campanha','trafego','retencao','reativacao','whatsapp','execucao']});
  addMem({kind:'regra',author:'gab',pin:true,w:5,src:'seed',text:'Produto: estratégias automatizadas via OnTick, para quem tem conta na XP ou Rico. Conversão: comentário "ROBÔ", DM, link da bio e ativação. O objetivo é lead qualificado, não curtida.',tags:['conteudo','post','carrossel','reels','leads','campanha','proposta','funil']});
  addMem({kind:'regra',author:'gab',pin:true,w:5,src:'seed',text:'Dinheiro, verba, conta de trading e documento oficial só com aprovação do Gabriel.',tags:['verba','campanha','cac','ea','trafego','token','deploy','execucao']});
 }
});
})();
