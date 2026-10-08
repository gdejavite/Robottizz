# Fluxos do n8n para a Torre Gabriel

A Torre conversa com o n8n por **tabelas de dados** (Data Tables), usando o conector do n8n liberado na página. São três tabelas e três fluxos. Ligue cada opção na aba **Agentes → Bot do n8n, aprovação pelo Slack e execução real** só depois que o fluxo correspondente estiver ativo.

> Nada é executado sem aprovação. Ações de dinheiro ou de documento oficial (vermelho) pedem **duas confirmações**, na Torre e também no Slack.

## 1. Fila de avisos (já existia)

**Tabela `avisos`.** A Torre grava uma linha por aviso:

| coluna | exemplo |
|---|---|
| andar, empresa | Robotizz |
| agente, agente_id, funcao, icone | Buck, buck, Orçamento e escala, :dollar: |
| nivel | amarelo · vermelho · reuniao · travado · fyi |
| titulo, resumo, detalhes | texto do pedido |
| canal | ID do canal do Slack do andar |
| link | link da Torre |
| status | pendente |
| **ap_key** | chave da aprovação, ex.: `rob:mg8x2k:a1b2` (novo) |
| **botoes** | `true` quando a aprovação pelo Slack está ligada (novo) |

**Fluxo:** gatilho a cada 1 min → ler linhas com `status = pendente` → publicar no Slack (foto do agente pelo `agente_id`) → marcar `status = enviado`.
Se `botoes = true`, publique a mensagem com os botões abaixo, levando `ap_key` no `value` de cada botão.

## 2. Aprovação pelo Slack (novo)

**Tabela `decisoes`.** O n8n grava uma linha por clique:

| coluna | valores |
|---|---|
| ap_key | o `ap_key` que veio no aviso |
| decisao | `aprovar` · `aprovar2` · `recusar` · `a` · `b` · `agendar` |
| motivo | texto opcional (recusa ou ajuste) |

**Botões por tipo de aviso:**
- amarelo: ✅ Aprovar (`aprovar`) · ❌ Recusar (`recusar`)
- vermelho: ✅ Aprovar abre uma confirmação; só o segundo clique grava `aprovar2`. Com `aprovar` sozinho, a Torre não aprova e mostra "aguarda a segunda confirmação".
- reunião: Opção A (`a`) · Opção B (`b`) · Marcar 10h (`agendar`)

**Fluxo:** Webhook de interatividade do Slack → extrair `ap_key` e a ação → inserir em `decisoes` → atualizar a mensagem ("Decidido por Gabriel: Aprovado").

A Torre lê a tabela a cada 20 s (ou no botão "Ler decisões agora"), aplica a decisão no andar certo e registra no diário: "Você aprovou: … (decidido pelo Slack)". Cada decisão é aplicada uma única vez.

## 3. Execução real (novo)

**Tabela `execucoes`.** Ao aprovar uma ação marcada como executável, a Torre grava:

| coluna | exemplo |
|---|---|
| acao | `meta_campanha_pausada` · `instagram_agendar` |
| parametros | `{"objetivo":"lead","verba_dia":30,"dias":7,"destino_whatsapp":false,"status":"PAUSED"}` |
| andar, agente, titulo, ap_key | Robotizz, Otto, … |
| status | pendente |
| aprovado_em | data e hora ISO |

**Fluxo:** gatilho a cada 1 min → ler `status = pendente` → `Switch` por `acao`:
- `meta_campanha_pausada`: Meta Marketing API → criar campanha com `status: PAUSED` (nunca ACTIVE) → gravar o ID.
- `instagram_agendar`: agendar as peças aprovadas pela API oficial.

Em seguida, marque `status = feito` (ou `erro` com a mensagem) e avise no Slack.

Ações executáveis hoje (Otto, 7º andar): **criar a campanha de teste pausada** (vermelho, confirmação dupla) e **agendar 3 publicações por semana** (amarelo). Para tornar outra ação executável, acrescente `exec:{acao,label,params}` no modelo da tarefa (`TPL`) do andar.
