// Assistente de configuração (para humanos): pede cada credencial, TESTA na hora e grava na Cloudflare.
// Rode:  npm run configurar   (ou pelo menu: node scripts/bot.mjs menu, opção 1)
// A versão sem perguntas, para agentes, é:  node scripts/bot.mjs aplicar
import readline from "node:readline";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  CHECK_LABELS,
  CRED_FILE,
  SKIP_CF,
  URL_FILE,
  botUrl,
  checkBot,
  clean,
  cloudflareLoggedIn,
  deploy,
  ensureKv,
  fillGenerated,
  isUp,
  metaInstructions,
  normalizeUrl,
  readCreds,
  uploadSecrets,
  validateAppSecret,
  validateToken,
  wrangler,
  writeCreds,
} from "./lib.mjs";

const ok = (m) => console.log(`\x1b[32m  ✔ ${m}\x1b[0m`);
const bad = (m) => console.log(`\x1b[31m  ✘ ${m}\x1b[0m`);
const info = (m) => console.log(`\x1b[36m${m}\x1b[0m`);

// Leitura de respostas que funciona digitando OU colando várias linhas de uma vez.
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
const lines = [];
const waiting = [];
let closed = false;
rl.on("line", (l) => (waiting.length ? waiting.shift()(l) : lines.push(l)));
rl.on("close", () => {
  closed = true;
  while (waiting.length) waiting.shift()(null);
});
async function ask(q) {
  process.stdout.write(`\n${q}\n> `);
  const line = lines.length ? lines.shift() : closed ? null : await new Promise((r) => waiting.push(r));
  if (line === null) {
    console.log("\nEntrada encerrada. Rode  npm run configurar  de novo.");
    process.exit(1);
  }
  return line.trim();
}

async function main() {
  console.log("\n==============================================");
  console.log(" Assistente de configuração do bot do Instagram");
  console.log("==============================================");
  console.log("Vou pedir as credenciais uma por vez e testar cada uma na hora.");
  console.log("Para sair a qualquer momento: Ctrl + C.");

  // 1) Cloudflare: login, banco KV e versão mais nova no ar
  if (!SKIP_CF) {
    info("\n[1/6] Cloudflare");
    if (!cloudflareLoggedIn()) {
      console.log("Vai abrir o navegador para você autorizar. Clique em Allow.");
      wrangler(["login"], { interactive: true });
    }
    ok("Logado na Cloudflare");
    const kv = ensureKv();
    if (!kv.ok) {
      bad("Não consegui configurar o banco KV:");
      console.log(kv.out);
      process.exit(1);
    }
    ok("Banco KV configurado");
    info("Publicando a versão mais nova do bot (inclui a API dos agentes)...");
    const d = deploy();
    if (!d.ok) {
      bad("A publicação falhou:");
      console.log(d.out.slice(-1500));
      process.exit(1);
    }
    ok("Bot publicado" + (d.url ? `: ${d.url}` : ""));
  }

  // 2) Endereço do bot
  info("\n[2/6] Endereço do bot");
  const saved = botUrl();
  let url = "";
  for (;;) {
    const a = await ask(`Endereço do bot (aperte Enter para usar ${saved}):`);
    try {
      url = normalizeUrl(a || saved);
    } catch {
      bad("Endereço inválido.");
      continue;
    }
    if (await isUp(url)) {
      ok(`Bot respondendo em ${url}`);
      break;
    }
    bad(`O bot não respondeu em ${url}.`);
  }
  writeFileSync(URL_FILE, url + "\n");

  // 3) ACCESS_TOKEN
  info("\n[3/6] Token de acesso do Instagram (ACCESS_TOKEN)");
  console.log("Onde achar: developers.facebook.com > seu app > Instagram > API setup with Instagram login");
  console.log("> Generate access tokens > botão 'Generate token' ao lado da sua conta > copie o token inteiro.");
  let token = "";
  let username = "";
  for (;;) {
    token = clean(await ask("Cole o token (começa com IG):"));
    if (!token) continue;
    const t = await validateToken(token);
    if (t.ok) {
      username = t.username;
      ok(`Token válido. Conta: @${username}`);
      break;
    }
    bad(t.error);
    if (t.motivo === "recusado_pela_meta") console.log("  Dica: gere um token novo e copie de novo, inteiro.");
  }

  // 4) APP_SECRET
  info("\n[4/6] Segredo do app (APP_SECRET)");
  console.log("Onde achar: na MESMA página (API setup with Instagram login), campo 'Instagram app secret' > Show.");
  console.log("Atenção: NÃO é o 'App secret' de Configurações > Básico (esse é outro).");
  let appSecret = "";
  for (;;) {
    appSecret = clean(await ask("Cole o Instagram app secret:"));
    if (!appSecret) continue;
    const s = await validateAppSecret(appSecret, token);
    if (!s.ok) {
      bad(s.error);
      continue;
    }
    if (s.confirmado) {
      ok("App secret confirmado pela Meta");
      token = s.longToken;
      ok("Token convertido para longa duração (60 dias)");
      break;
    }
    if (s.formatoSuspeito) {
      bad("Isso não parece um app secret (normalmente são 32 letras/números, de 0-9 e a-f).");
      if (!/^s/i.test(await ask("Usar assim mesmo? (s/n)"))) continue;
    }
    ok("Formato OK (a Meta não permite confirmar o segredo com um token que já é de longa duração; o teste final confirma).");
    break;
  }

  // 5) Senhas
  info("\n[5/6] Senhas");
  const creds = { ACCESS_TOKEN: token, APP_SECRET: appSecret };
  const a = await ask("Crie uma senha para o painel /admin (mínimo 8 caracteres) ou aperte Enter para eu gerar uma:");
  if (a && a.length >= 8) creds.ADMIN_PASSWORD = a;
  else if (a) bad("Senha curta demais: vou gerar uma.");
  fillGenerated(creds);
  ok("VERIFY_TOKEN, senha do painel e AGENT_API_KEY prontos");

  // 6) Gravar e testar
  info("\n[6/6] Gravando na Cloudflare e testando o bot...");
  const up = uploadSecrets(creds);
  if (!up.ok) {
    bad("Não consegui gravar os segredos:");
    console.log(up.out);
    process.exit(1);
  }
  ok("5 segredos gravados na Cloudflare");
  writeCreds(creds);
  ok(`Cópia local salva em ${CRED_FILE} (secreta; serve para o seu agente revalidar depois)`);

  const res = await checkBot(url, creds, { expectUsername: username, attempts: 8 });
  for (const [k, v] of Object.entries(res)) (v ? ok : bad)(CHECK_LABELS[k]);
  rl.close();
  if (!Object.values(res).every(Boolean)) {
    bad("Algum teste falhou. Rode de novo e, se continuar, mande a tela para o Claude.");
    process.exit(1);
  }

  console.log("\n==============================================================");
  console.log(" TUDO CERTO! ✅");
  console.log("==============================================================");
  console.log(metaInstructions(url, creds));
  console.log(`\n Senha do painel:  ${creds.ADMIN_PASSWORD}`);
  console.log(" Rodar este assistente de novo gera VERIFY_TOKEN e AGENT_API_KEY NOVOS");
  console.log(" (atualize a Meta e o n8n). Para só revalidar: node scripts/bot.mjs verificar\n");
}

main().catch((e) => {
  console.error("\nErro:", e.message);
  process.exit(1);
});
