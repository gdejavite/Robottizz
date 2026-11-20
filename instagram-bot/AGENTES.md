# Manual do bot de DM do Instagram para AGENTES

Este arquivo é para agentes (torre de agentes, n8n, sessões do Claude) que vão **operar** o bot sem
mexer em código. Pessoas devem ler o [DEPLOY.md](./DEPLOY.md).

## 1. O que o bot faz

Comentário com palavra-chave → **private reply** (intro) → a pessoa responde no direct → o bot checa
se ela **segue** o perfil → se segue, **entrega**; se não, **pede o follow** (repete a cada mensagem,
nunca entrega sem follow).
Se a Meta bloquear a private reply (subcódigo **2534025**, teto de velocidade), entra o **plano B**:
grava para qual campanha a pessoa vai, responde **em público** (variação sorteada) e re-tenta a
private reply a cada 15 min por até 7 dias. Quem mandar a palavra no direct sem ter comentado também
é atendido.

- Produção: `https://instagram-comment-dm-bot.robotizz-directbot.workers.dev`
- Painel humano: `/admin` (Basic Auth, senha `ADMIN_PASSWORD`)
- API dos agentes: `/api/v1` (chave `AGENT_API_KEY`, diferente da senha do painel)

Para **validar credenciais, publicar ou alterar o código**, leia [CLAUDE.md](./CLAUDE.md)
(comandos `node scripts/bot.mjs verificar|aplicar|status|publicar --json`).

## 2. Autenticação

```
Authorization: Bearer <AGENT_API_KEY>
X-Agente: <nome do agente>          (opcional; vai para a auditoria)
Content-Type: application/json
```

No n8n, crie **uma** credencial *Header Auth* (nome `Authorization`, valor `Bearer <chave>`). A chave
é impressa pelo `npm run configurar`. Nunca coloque a chave em texto de tarefa, Slack ou memória.

## 3. Endpoints

| Método e rota | Para quê | Nível |
|---|---|---|
| `GET /api/v1/status` | Pausado?, campanhas, métricas, fila de retry, token e **alertas** | 🟢 sozinho |
| `GET /api/v1/health` | Testa o token ao vivo na Meta (devolve o @ da conta) | 🟢 sozinho |
| `GET /api/v1/metrics` | Contadores acumulados | 🟢 sozinho |
| `GET /api/v1/audit` | Últimas 100 mudanças feitas pela API (quem, o quê, quando) | 🟢 sozinho |
| `GET /api/v1/campaigns` · `GET /api/v1/campaigns/{id}` | Ler campanhas | 🟢 sozinho |
| `POST /api/v1/retry/run` | Rodar a fila de retry agora (o cron já roda a cada 15 min) | 🟢 sozinho |
| `POST /api/v1/token/refresh` | Renovar o token agora (o cron já renova toda segunda) | 🟢 sozinho |
| `POST /api/v1/campaigns` | Criar campanha. **Idempotente:** se já existe uma com o mesmo `nome`, atualiza em vez de duplicar | 🟡 aprovação do Gabriel + Íris |
| `PATCH /api/v1/campaigns/{id}` | Alterar textos, palavras, Reel, ativar/desativar, padrão | 🟡 aprovação do Gabriel + Íris |
| `PATCH /api/v1/campaigns` com `{"campanha": "<nome ou id>", ...}` | Mesmo que o anterior, achando a campanha pelo **nome** (ignora acento e maiúscula) | 🟡 aprovação do Gabriel + Íris |
| `DELETE /api/v1/campaigns/{id}` | Excluir campanha | 🟡 aprovação do Gabriel |
| `POST /api/v1/pause` · `POST /api/v1/resume` | Pausar / reativar TODA a automação | 🟡 aprovação do Gabriel |

Respostas: JSON com `ok: true|false`. Erro de validação → `400` com `error` em português;
erro da Meta → `502`; chave errada → `401`; API desligada (sem `AGENT_API_KEY`) → `503`.

### Campos de campanha (aceita português ou inglês)

| Português | Inglês | Observação |
|---|---|---|
| `nome` | `name` | |
| `palavras` | `keywords` | lista ou texto separado por vírgula; casa por **palavra inteira**, sem acento/maiúscula |
| `reel_url` | `reelUrl` | link do Reel **da própria conta**; o bot acha o `media_id` sozinho. `""` desvincula |
| `media_id` | `mediaId` | alternativa ao link |
| `intro` | `introMessage` | private reply: pedir para responder no direct |
| `pedido_follow` | `followMessage` | quando a pessoa não segue |
| `entrega` | `deliveryMessage` | o conteúdo |
| `aviso_publico` | `publicNotice` | lista ou uma variação por linha (plano B). Use **5 ou mais** variações |
| `ativa` | `active` | padrão `true` |
| `padrao` | `isDefault` | atende quem manda direct sem palavra; marcar uma desmarca as outras |

Desativar uma campanha (`ativa: false`) tira a marca de padrão dela; ao reativar, mande `padrao: true`
de novo se ela deve continuar como padrão.

`{usuario}` em qualquer mensagem vira `@nome_da_pessoa`. Campos de mensagem omitidos na criação
recebem textos padrão.

### Exemplo: criar a campanha do Reel da semana

```bash
curl -X POST "$BOT/api/v1/campaigns" \
  -H "Authorization: Bearer $AGENT_API_KEY" -H "X-Agente: otto" -H "Content-Type: application/json" \
  -d '{
    "nome": "Reel drawdown (ROBÔ)",
    "palavras": ["robô", "robo"],
    "reel_url": "https://www.instagram.com/reel/XXXXXXXX/",
    "intro": "Oi {usuario}! Vi seu comentário. Me responde aqui com um \"oi\" que eu te mando o material.",
    "pedido_follow": "Quase lá! Segue o perfil e me manda outra mensagem que eu libero na hora.",
    "entrega": "Aqui está: https://exemplo.com/material\n\nAviso: resultados passados não garantem resultados futuros. Operar no mercado financeiro envolve risco de perda.",
    "aviso_publico": [
      "{usuario} te chamei no direct! Se não chegou, me manda ROBÔ por lá 📩",
      "{usuario} manda ROBÔ no meu direct que eu te envio 💬",
      "Opa {usuario}! O direct tá liberado, manda ROBÔ lá 🚀",
      "{usuario} me chama no direct com a palavra ROBÔ 👊",
      "{usuario} responde ROBÔ no direct que chega rapidinho ✅"
    ]
  }'
```

## 4. Quem faz o quê (7º andar · Robotizz)

| Agente | Responsabilidade no bot | Rotina |
|---|---|---|
| **Alex** (automação) | Saúde do bot e do token. Lê `status` e `health`, trata alertas de token | a cada 1 h (n8n) |
| **Luna** (conversão) | Dona das campanhas: palavra-chave, Reel e textos de intro/follow/entrega | a cada Reel novo |
| **Maestro** (conteúdo) | Escreve as variações do aviso público e o CTA "Comente ROBÔ" do Reel | a cada Reel novo |
| **Íris** (compliance) | Revisa TODO texto antes de ir para o bot (checklist abaixo) | antes de criar/alterar |
| **Otto** (execução) | Executa a chamada da API depois das aprovações | sob demanda |
| **Dara** (dados) | Copia `metrics` para o Supabase uma vez por dia e monta o funil | diário |

### Checklist da Íris para textos do bot (Robotizz)
- Sem promessa de lucro, "garantido", "sem risco", "copytrade" ou termos vetados.
- **Entrega** que cite resultado, desempenho ou robô leva o aviso de risco completo.
- Nenhum link ou menção a WhatsApp enquanto durar a janela pós-restrição.
- Aviso público curto, sem link, com **5 ou mais** variações diferentes entre si.
- Intro pede para **responder no direct**; não entrega conteúdo na intro.

## 5. O que fazer com cada alerta (`status.alertas`)

| `codigo` | Nível | Agente | Ação |
|---|---|---|---|
| `token_renovacao_falhou` | 🔴 | Alex | Rodar `POST /token/refresh`. Se falhar de novo, avisar o Gabriel: gerar token novo na Meta e rodar `npm run configurar` (só humano) |
| `token_perto_de_expirar` | 🔴 | Alex | Mesmo procedimento acima, já |
| `automacao_pausada` | 🟡 | Otto | Perguntar ao Gabriel se deve reativar (`POST /resume`) |
| `sem_campanha_ativa` | 🟡 | Luna | Propor campanha para o Reel atual (vai para aprovação) |
| `plano_b_em_massa` | 🟡 | Luna | Normal em viral. Conferir se o aviso público tem 5+ variações e se a **campanha padrão** está certa (quem chama no direct sem palavra recebe a padrão). Não pausar |

`health` com erro `190`/"Invalid OAuth access token" = token inválido → mesmo procedimento de
`token_renovacao_falhou`.

## 6. Só humanos podem fazer (agentes NÃO tentam)

- Qualquer coisa no painel da Meta (developers.facebook.com): gerar token, app secret, webhook,
  permissões, testadores, App Review, modo Live.
- Gravar ou trocar segredos na Cloudflare (`npm run configurar`, `wrangler secret`).
- Publicar uma versão nova do código (`npm run deploy`).
- Ligar "Permitir acesso às mensagens" no app do Instagram.

## 7. Regras da Meta que o bot já respeita (não tente contornar)

- 1 private reply por comentário, válida por 7 dias. Resposta a comentário (comentário-filho) nunca recebe.
- DM só em reação a uma mensagem da pessoa (janela de 24 h). **Não existe "disparo" de DM** por este bot.
- A private reply sempre vai antes de qualquer resposta pública.
- Anti-flood: 1 intro por pessoa por campanha; a mesma palavra em menos de 1 h não reenvia a entrega.

## 8. Custos

Plano gratuito da Cloudflare: 1.000 gravações/dia no KV. Cada comentário em plano B grava ~2 itens.
Se `fila_retry` ficar alta por vários dias seguidos, recomendar ao Gabriel o Workers Paid (US$ 5/mês).
