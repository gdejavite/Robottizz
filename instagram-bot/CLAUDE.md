# CLAUDE.md — instruções para agentes que MANTÊM este bot

Você é um agente (da torre de agentes ou uma sessão do Claude) cuidando do **bot de comentário →
direct do Instagram**. O dono do projeto (Gabriel) **não é programador**: explique em português
simples, nunca peça para ele editar código, e tudo que ele muda no dia a dia fica no painel `/admin`.

- Para **operar** o bot (campanhas, pausa, alertas) use a API: leia [AGENTES.md](./AGENTES.md).
- Para **instalar do zero** (pessoa): [DEPLOY.md](./DEPLOY.md).
- Este arquivo é para **validar credenciais, publicar e alterar o código**.

## Comandos (rode dentro desta pasta)

| Comando | Para quê |
|---|---|
| `node scripts/bot.mjs verificar --json` | Checa Node, dependências, login na Cloudflare, segredos gravados, bot no ar e, se existir `credenciais.env`, valida o token e o app secret **na Meta** e confere cada segredo **no bot publicado** |
| `node scripts/bot.mjs aplicar --json` | Sem perguntas: lê `credenciais.env`, valida na Meta, gera o que faltar, publica a versão nova, grava os 5 segredos e confere tudo no ar |
| `node scripts/bot.mjs status --json` | Status, métricas e alertas (via `/api/v1/status`) |
| `node scripts/bot.mjs publicar --json` | Roda os testes e só publica se todos passarem |
| `npm test` · `npm run typecheck` | Testes automáticos (Vitest) e checagem de tipos |
| `node scripts/bot.mjs menu` | Menu para humanos (os atalhos `INICIAR-WINDOWS.bat` / `INICIAR-MAC.command` abrem este) |

Com `--json` a saída é um objeto `{ ok, checagens: [{id, ok, detalhe}], avisos, ... }` e o código de
saída é 0 (ok) ou 1. Leia `checagens` com `ok: false` e siga o `detalhe`.

## Credenciais

- Ficam no arquivo **local** `credenciais.env` (modelo: `credenciais.exemplo.env`). Ele é secreto:
  está no `.gitignore`, fica fora do `.zip` e **nunca** vai para chat, Slack, memória, commit ou log.
- Na Cloudflare os valores **não podem ser lidos de volta**; o `credenciais.env` é a cópia de referência.
  Se ele sumir, o caminho é gerar tudo de novo (`aplicar` com só `ACCESS_TOKEN` e `APP_SECRET`).
- Rodar o `aplicar` com campos em branco gera `VERIFY_TOKEN`/`ADMIN_PASSWORD`/`AGENT_API_KEY` **novos**:
  depois disso é preciso atualizar o Verify token na Meta e a credencial do n8n. Avise o Gabriel.
- Só o Gabriel consegue: gerar token e app secret na Meta, configurar o webhook na Meta, login na
  Cloudflare (`npx wrangler login` abre o navegador).

Diagnóstico rápido pelo `verificar`:

| Checagem com falha | Causa | O que fazer |
|---|---|---|
| `meta_token` com "EAA" | token do login do Facebook | Gabriel gera token na página "API setup with Instagram login" |
| `meta_token` "Invalid OAuth" | token inválido/expirado | token novo → `credenciais.env` → `aplicar` |
| `meta_app_secret` | segredo errado (às vezes é o "App secret" de Configurações → Básico, que é outro) | corrigir no arquivo → `aplicar` |
| `bot_*` falha, Meta OK | valor gravado na Cloudflare diferente do arquivo | `aplicar` |
| `bot_agent_api_key` falha, resto OK | versão antiga no ar (sem a API) | `publicar` |
| `cloudflare_login` | sem login | Gabriel roda `npx wrangler login` |

## Mapa do código

| Arquivo | Responsabilidade |
|---|---|
| `src/index.ts` | Rotas (`/webhook`, `/admin`, `/api/v1`) e crons |
| `src/flow.ts` | Fluxo comentário → private reply → follow → entrega, e o plano B (2534025) |
| `src/match.ts` | Palavra-chave por limite de palavra e roteamento por post/campanha |
| `src/retry.ts` | Fila de retry (cron de 15 min, 7 dias) |
| `src/meta.ts` | Cliente da Graph API (graph.instagram.com) e classificação de erros |
| `src/webhook.ts` | Assinatura `X-Hub-Signature-256` e handshake |
| `src/api.ts` | API dos agentes (`/api/v1`) |
| `src/admin.ts`, `src/panel.ts` | Painel `/admin` |
| `src/config.ts`, `metrics.ts`, `state.ts`, `token.ts` | Config com cache de 5 s, métricas em buffer, estado por pessoa, renovação do token |
| `scripts/lib.mjs` | **Única** fonte da lógica de validar/publicar/conferir (usada por `bot.mjs` e `configurar.mjs`) |
| `test/` | Testes; `test/helpers.ts` tem o KV falso e a Graph API falsa |

## Regras que NUNCA podem ser quebradas (cada uma tem teste)

1. Só **Instagram API with Instagram Login** (`graph.instagram.com`, v23.0+). Nunca `graph.facebook.com`.
2. A **private reply vem antes** de qualquer resposta pública ou curtida.
3. Resposta **pública só quando a private reply falha com 2534025**; erro temporário vai para a fila sem
   comentar em público; erro permanente é descartado.
4. **Comentário-filho** (com `parent_id`) nunca recebe private reply nem entra na fila.
5. **Nunca entregar sem follow** (`is_user_follow_business === true`); se a checagem falhar, não entrega.
6. DM só **em reação a mensagem da pessoa** (janela de 24 h). Não criar nenhum "disparo".
7. Palavra-chave casa por **limite de palavra**, nunca por substring.
8. Anti-flood: 1 intro por pessoa por campanha; mesma palavra < 1 h após a entrega não reenvia.
9. Validar a assinatura do webhook com o `APP_SECRET`.
10. Custo: nada gravado no KV por comentário no caso comum; config em cache de ~5 s; métricas a cada
    25 interações ou 5 min.
11. Segredos nunca no código nem no `wrangler.toml`.

## Como fazer uma mudança

1. Leia o arquivo que vai mudar e o teste correspondente em `test/`.
2. Faça a mudança e **acrescente ou ajuste o teste** que prova o novo comportamento.
3. `npm run typecheck` e `npm test`: tudo tem que passar. Nunca apague ou pule um teste para passar.
4. `node scripts/bot.mjs publicar --json` (só publica se os testes passarem).
5. `node scripts/bot.mjs verificar --json` para conferir o bot no ar.
6. Atualize `AGENTES.md` se mudou a API e `DEPLOY.md` se mudou algum passo do Gabriel.
7. Mudanças de texto de campanha **não** são mudança de código: use o painel ou a API.

Para robotizz: textos de campanha passam pela revisão da Íris (sem promessa de ganho, aviso de risco
na entrega, sem WhatsApp). Veja o checklist em `AGENTES.md`.
