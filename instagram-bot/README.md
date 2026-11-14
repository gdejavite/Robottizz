# Bot de comentário → direct (Instagram)

Cloudflare Workers (TypeScript) + Cloudflare KV, usando a **Instagram API with Instagram Login** (Graph API v23.0+).

- **Guia de instalação passo a passo (em português): [DEPLOY.md](./DEPLOY.md)**
- Painel de controle (sem redeploy): `https://SEU-WORKER.workers.dev/admin`
- **Para agentes (torre, n8n, Claude): [AGENTES.md](./AGENTES.md)**, API em `/api/v1` com a chave `AGENT_API_KEY`

## Estrutura

| Arquivo | O que faz |
|---|---|
| `src/index.ts` | Entrada: webhook, painel e crons |
| `src/flow.ts` | Fluxo: comentário → private reply → follow → entrega, e o plano B (2534025) |
| `src/retry.ts` | Fila de retry das private replies (cron de 15 min, validade de 7 dias) |
| `src/match.ts` | Palavra-chave por limite de palavra e roteamento por post/campanha |
| `src/meta.ts` | Cliente da API do Instagram e classificação de erros |
| `src/webhook.ts` | Validação do `X-Hub-Signature-256` e verificação do webhook |
| `src/admin.ts`, `src/panel.ts` | Painel `/admin` com Basic Auth |
| `src/api.ts` | API dos agentes `/api/v1` (status, alertas, campanhas, pausa, token, retry) |
| `src/config.ts`, `src/metrics.ts`, `src/state.ts`, `src/token.ts` | Config em cache (5 s), métricas em buffer, estado por pessoa, renovação do token |
| `test/` | 119 testes automáticos (`npm test`) |

Segredos (fora do código): `VERIFY_TOKEN`, `ACCESS_TOKEN`, `ADMIN_PASSWORD`, `APP_SECRET` e, para a torre de agentes, `AGENT_API_KEY`. O `npm run configurar` gera e grava todos.

## Comandos

```bash
npm install      # instala dependências
npm test         # roda os testes
npm run setup    # cria o KV e preenche o wrangler.toml
npm run configurar  # pede, testa e grava todas as credenciais
npm run deploy   # publica na Cloudflare
```
