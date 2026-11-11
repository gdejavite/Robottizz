# DEPLOY — Bot de comentário → direct do Instagram

Guia para quem **não é programador**. Cada comando está explicado. Você vai copiar e colar
comandos no terminal; **nunca precisa editar código**. Tudo que muda depois (mensagens,
palavras-chave, posts, pausar) é feito no painel web `/admin`.

Tempo estimado: 30 a 40 minutos.

> Você já tem conta na Cloudflare e um app na Meta, então este guia pula a criação deles.

---

## Como o bot funciona (resumo de 1 minuto)

1. Alguém **comenta** a palavra-chave no seu Reel → o bot manda uma **private reply** (a "intro") pedindo para a pessoa responder no direct.
2. A pessoa **responde** → o bot checa se ela **segue** o perfil.
   - Não segue → manda a mensagem de **follow** (repete a cada nova mensagem, sem limite). **Nunca entrega sem o follow.**
   - Segue → manda a **entrega**.
3. **Plano B:** se a Meta bloquear a private reply (erro de subcódigo **2534025**, o "teto de velocidade"), o bot grava para qual campanha a pessoa vai, **responde em público** no comentário (sorteando uma variação do aviso) e **re-tenta a private reply a cada 15 minutos** por até 7 dias. Se a pessoa chamar no direct sem digitar nada, recebe o conteúdo do post dela.
4. **Direct sem comentar antes:** quem mandar a palavra-chave no direct é atendido do zero.

---

## Parte 1 — Preparar o computador (uma vez só)

### 1.1 Abrir o terminal
- **Windows:** tecla Windows → digite `PowerShell` → Enter.
- **Mac:** `Cmd + Espaço` → digite `Terminal` → Enter.

### 1.2 Conferir se o Node.js está instalado
```bash
node -v
```
*O que faz:* mostra a versão do Node.js. Precisa aparecer `v18` ou maior (ex.: `v22.1.0`).
Se der erro "comando não encontrado", instale a versão **LTS** em https://nodejs.org, **feche e abra o terminal de novo** e repita.

### 1.3 Entrar na pasta do bot
Se você ainda não tem o projeto no computador:
```bash
git clone https://github.com/gdejavite/robottizz.git
cd robottizz
git checkout claude/instagram-comment-dm-bot-p8obl0
```
*O que faz:* baixa o projeto e muda para a versão onde o bot foi construído.

Depois, em qualquer caso:
```bash
cd instagram-bot
```
*O que faz:* entra na pasta do bot. **Todos os comandos abaixo são rodados dentro dela.**

### 1.4 Instalar as ferramentas do projeto
```bash
npm install
```
*O que faz:* baixa as peças que o bot precisa (leva ~1 minuto). Avisos amarelos podem ser ignorados.

### 1.5 (Opcional, recomendado) Rodar os testes
```bash
npm test
```
*O que faz:* roda 98 testes automáticos que simulam o fluxo inteiro, inclusive o plano B do erro 2534025. Deve terminar com `98 passed`.

---

## Parte 2 — Cloudflare

### 2.1 Entrar na sua conta
```bash
npx wrangler login
```
*O que faz:* abre o navegador para você autorizar o acesso à sua conta Cloudflare. Clique em **Allow**.

### 2.2 Criar o banco de dados (KV) automaticamente
```bash
npm run setup
```
*O que faz:* cria (ou reaproveita) o banco **KV** chamado `instagram-bot-dados` e escreve o id dele no arquivo `wrangler.toml` sozinho. Termina com `Pronto! Banco ... configurado.`

### 2.3 Gerar duas senhas aleatórias
Rode **duas vezes** e **anote** cada resultado (um será o `VERIFY_TOKEN`, outro a `ADMIN_PASSWORD`):
```bash
npm run gerar-token
```
*O que faz:* imprime uma senha aleatória forte, tipo `872f99ce0e79...`. Cada execução gera uma diferente.

### 2.4 Juntar as informações da Meta
No painel da Meta (developers.facebook.com → seu app → **Instagram** → **API setup with Instagram login**; o nome do menu pode variar um pouco):

| Segredo | De onde vem |
|---|---|
| `ACCESS_TOKEN` | Na seção **Generate access tokens**, clique em **Generate token** ao lado da sua conta profissional do Instagram e copie. Esse token já é de longa duração. |
| `APP_SECRET` | Na mesma página, o **Instagram app secret** (clique em **Show**). ⚠️ É o segredo **do Instagram**, que **pode ser diferente** do "App secret" de Configurações → Básico. A assinatura do webhook usa o do Instagram. Se o bot receber erro 401 nos webhooks, teste com o outro. |
| `VERIFY_TOKEN` | A primeira senha que você gerou no passo 2.3. Você mesmo "inventa" este valor. |
| `ADMIN_PASSWORD` | A segunda senha do passo 2.3. É a senha do painel `/admin`. |

Permissões do app (precisam estar ativas): `instagram_business_basic`, `instagram_business_manage_messages`, `instagram_business_manage_comments`.

### 2.5 Guardar os 4 segredos na Cloudflare
Rode **um comando por vez**. Depois de cada um, o terminal pede o valor: **cole o valor e aperte Enter** (por segurança, o que você cola não aparece na tela).

```bash
npx wrangler secret put VERIFY_TOKEN
npx wrangler secret put ACCESS_TOKEN
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put APP_SECRET
```
*O que faz:* guarda cada segredo criptografado na Cloudflare. Eles **não ficam no código** nem no GitHub.

Se aparecer *"There doesn't seem to be a Worker called ... Do you want to create it?"*, responda `y` (sim).

### 2.6 Publicar o bot
```bash
npm run deploy
```
*O que faz:* envia o bot para a Cloudflare e liga os dois crons (a cada 15 min a fila de retry; toda segunda o renovar do token).

No final aparece uma linha parecida com:
```
https://instagram-comment-dm-bot.SEU-USUARIO.workers.dev
```
**Copie esse endereço**: é a base de tudo.

### 2.7 Conferir se está no ar
Abra no navegador `https://SEU-ENDERECO.workers.dev/` → deve aparecer **"Bot do Instagram no ar ✅"**.

---

## Parte 3 — Ligar o webhook na Meta

1. Na página **API setup with Instagram login** → seção **Configure webhooks**:
   - **Callback URL:** `https://SEU-ENDERECO.workers.dev/webhook`
   - **Verify token:** o mesmo `VERIFY_TOKEN` do passo 2.3
   - Clique em **Verify and save**. Deve confirmar na hora.
2. Marque (**Subscribe**) os campos **`comments`** e **`messages`**.
3. Abra o painel: `https://SEU-ENDERECO.workers.dev/admin`
   - Usuário: pode ser qualquer coisa (ex.: `admin`). Senha: a `ADMIN_PASSWORD`.
   - Clique em **Testar conexão com o Instagram** → deve mostrar `Conectado como @seuperfil ✅`.
   - Clique em **Inscrever webhooks (comentários e mensagens)** → garante que sua conta está inscrita nos eventos.

---

## Parte 4 — Criar a primeira campanha (no painel, sem código)

1. Em `/admin`, clique **+ Nova campanha**.
2. Preencha:
   - **Nome:** `Guia de receitas`
   - **Palavras-chave:** `receita, quero` (separe por vírgula; casa só a palavra inteira)
   - **Link do Reel:** cole o link (ex.: `https://www.instagram.com/reel/AbC123/`) e clique **Vincular ao post**. Sem link, a campanha vale para qualquer post.
   - **Campanha padrão:** marque se quiser que quem mandar direct *sem palavra nenhuma* seja atendido por ela. (Se você tiver só uma campanha ativa, ela já vale como padrão.)
   - As **4 mensagens**:
     1. **Intro** — pedindo para responder no direct. Ex.: `Oi {usuario}! Responde aqui com um "oi" que eu te mando a receita 🍰`
     2. **Pedido de follow.** Ex.: `Quase lá! Segue meu perfil e me manda outra mensagem que eu libero na hora 🙌`
     3. **Entrega** — o link/texto. Ex.: `Aqui está: https://seusite.com/receita 🎁`
     4. **Aviso público** — **uma variação por linha** (o bot sorteia uma por comentário):
        ```
        {usuario} me chama no direct e escreve RECEITA que eu te envio! 📩
        {usuario} o direct está te esperando, manda a palavra lá! 💬
        Opa {usuario}! Manda a palavra-chave no meu direct que eu te mando 🚀
        ```
        Quanto mais variações, melhor (evita virar padrão de spam).
3. Clique **Salvar alterações**. Vale em segundos.

`{usuario}` vira `@nome` da pessoa. Pode usar em qualquer uma das 4 mensagens.

Outros botões do painel: **Pausar automação** (desliga tudo na hora; os retries também esperam) e as **métricas** (comentários recebidos, DMs enviadas, follows convertidos, entregas, plano B etc.).

---

## Parte 5 — Testar de ponta a ponta

Use **outra conta do Instagram** (de um amigo ou uma conta de teste).

> ⚠️ Enquanto o app da Meta estiver em modo **Desenvolvimento**, só funcionam contas com função no app (Administrador, Desenvolvedor, Testador). Para atender qualquer pessoa, o app precisa estar em modo **Live** com **Acesso Avançado** nas permissões acima (revisão da Meta).

1. Na conta de teste, **comente** a palavra-chave no Reel → deve chegar a **intro** no direct (aba de solicitações, se não seguir você).
2. **Responda** a intro (sem seguir o perfil) → chega o **pedido de follow**. Responda de novo → chega de novo.
3. **Siga** o perfil e mande outra mensagem → chega a **entrega**.
4. Mande a **palavra-chave de novo** em menos de 1 hora → **não** reenvia (anti-flood).

Para ver o que o bot está fazendo em tempo real:
```bash
npx wrangler tail
```
*O que faz:* mostra os logs ao vivo (Ctrl+C para sair). Eventos principais: `plan_b` (Meta bloqueou, plano B acionado), `private_reply_transient` (instabilidade, vai para a fila), `private_reply_permanent` (comentário apagado etc.), `retry_dropped`, `follow_check_failed`, `token_refreshed`, `token_refresh_failed`.

---

## Atualizações e manutenção

| Quero... | Faça |
|---|---|
| Mudar mensagens, palavras, post, pausar | `/admin` (nada de terminal) |
| Atualizar o bot para uma versão nova | `git pull` e depois `npm install` e `npm run deploy` |
| Trocar o token manualmente | `npx wrangler secret put ACCESS_TOKEN` (cole o novo). O token novo passa a valer e o renovado antigo é descartado. |
| Trocar a senha do painel | `npx wrangler secret put ADMIN_PASSWORD` |

O token é **renovado sozinho toda segunda** (07:00 UTC). Se falhar, tenta na semana seguinte e o painel mostra o aviso na seção **Conexão**. Tokens de longa duração valem ~60 dias, então uma falha isolada não derruba o bot.

---

## Se algo der errado

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Meta diz "não foi possível validar a URL" | `VERIFY_TOKEN` diferente | Rode de novo `npx wrangler secret put VERIFY_TOKEN` com o mesmo valor colocado na Meta |
| Eventos chegam e nada acontece; `wrangler tail` mostra 401 | `APP_SECRET` errado | Use o **Instagram app secret** (passo 2.4), regrave com `secret put APP_SECRET` |
| Painel diz "Falha na conexão" | Token inválido/expirado | Gere outro token na Meta e rode `secret put ACCESS_TOKEN` |
| Ninguém recebe a intro, aparece `plan_b` | Teto de velocidade da Meta (subcódigo 2534025) | Normal em viral. O bot avisa em público e re-tenta a cada 15 min |
| `npm run setup` pede login | Não rodou o passo 2.1 | `npx wrangler login` e repita |
| Mensagens editadas "não pegaram" | Propagação do KV | Até ~1 minuto no pior caso. Normalmente segundos |
| 503 em `/admin` | `ADMIN_PASSWORD` não configurada | Passo 2.5 |

---

## Custo e limites (plano gratuito da Cloudflare)

O plano gratuito cobre uso normal. Para viral, saiba os limites:

- **Workers:** 100.000 requisições/dia.
- **KV:** 100.000 leituras/dia e **1.000 gravações/dia**.
- O bot foi feito para gastar pouco: config em cache de ~5 s, **nenhuma gravação por comentário no caso comum**, métricas gravadas a cada 25 interações ou 5 min.
- ⚠️ **O plano B grava ~2 itens por comentário** (estado da pessoa + fila de retry). Com mais de ~500 comentários bloqueados por dia você passa de 1.000 gravações. Se o seu viral for desse tamanho, assine o **Workers Paid (US$ 5/mês)**, que sobe o limite para 1 milhão de gravações.

## Limitações conhecidas (para você saber)

- **Resposta pública vs. retry:** a Meta costuma tornar um comentário inelegível para private reply depois que ele recebe resposta pública. O bot segue o que foi pedido (avisar em público **e** re-tentar), mas **se a Meta recusar os retries, a pessoa ainda é atendida quando chamar no direct** (o estado já aponta para a campanha certa). O painel mostra "Recuperadas pelo retry" para você medir se o retry realmente funciona na sua conta.
- **Métricas aproximadas:** ficam em buffer; um reinício do servidor pode perder alguns poucos contadores.
- **Anti-flood de intro** é em memória do servidor (sem gravar no KV por comentário): em picos muito grandes pode, raramente, passar uma intro duplicada.
