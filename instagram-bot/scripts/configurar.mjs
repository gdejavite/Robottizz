// Assistente de configuração: pede cada credencial, TESTA na hora e grava na Cloudflare.
// Rode:  npm run configurar
import readline from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { randomBytes, createHmac } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const IG = process.env.IG_HOST || "https://graph.instagram.com"; // IG_HOST só existe para testes
const SKIP_CF = process.env.CONFIG_SKIP_CLOUDFLARE === "1"; // só para testes
const V = "v23.0";
const URL_FILE = join(root, ".bot-url");

const ok = (m) => console.log(`\x1b[32m  ✔ ${m}\x1b[0m`);
const bad = (m) => console.log(`\x1b[31m  ✘ ${m}\x1b[0m`);
const info = (m) => console.log(`\x1b[36m${m}\x1b[0m`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
/** Remove espaços, quebras de linha e aspas que costumam vir junto ao colar. */
const clean = (v) => v.replace(/^["'`]+|["'`]+$/g, "").replace(/\s+/g, "");

function wrangler(args, { interactive = false } = {}) {
  const win = process.platform === "win32";
  const r = spawnSync(win ? "npx.cmd" : "npx", ["wrangler", ...args], {
    cwd: root,
    encoding: "utf8",
    shell: win,
    stdio: interactive ? "inherit" : "pipe",
  });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

async function getJson(url, init) {
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    let body = {};
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
    return { status: res.status, body, text };
  } catch (e) {
    return { status: 0, body: { error: { message: e.message } }, text: "" };
  }
}

const errMsg = (b) => b?.error?.message ?? b?.error ?? b?.raw ?? "erro desconhecido";

// ---------------------------------------------------------------------------
async function main() {
  console.log("\n==============================================");
  console.log(" Assistente de configuração do bot do Instagram");
  console.log("==============================================");
  console.log("Vou pedir as credenciais uma por vez e testar cada uma na hora.");
  console.log("Para sair a qualquer momento: Ctrl + C.");

  // 1) Login Cloudflare + banco KV
  if (!SKIP_CF) {
    info("\n[1/6] Conferindo login na Cloudflare...");
    const who = wrangler(["whoami"]);
    if (!who.ok || /not authenticated|not logged in/i.test(who.out)) {
      console.log("Vai abrir o navegador para você autorizar. Clique em Allow.");
      wrangler(["login"], { interactive: true });
    }
    ok("Logado na Cloudflare");
    const toml = readFileSync(join(root, "wrangler.toml"), "utf8");
    if (toml.includes("PREENCHIDO_PELO_NPM_RUN_SETUP")) {
      info("Configurando o banco KV...");
      const win = process.platform === "win32";
      spawnSync(win ? "node.exe" : "node", [join(root, "scripts", "setup.mjs")], { cwd: root, stdio: "inherit", shell: win });
    }
    ok("Banco KV configurado");
  }

  // 2) Endereço do bot
  info("\n[2/6] Endereço do bot");
  const saved = existsSync(URL_FILE) ? readFileSync(URL_FILE, "utf8").trim() : "";
  let botUrl = "";
  for (;;) {
    const a = await ask(
      saved
        ? `Endereço do bot (aperte Enter para usar ${saved}):`
        : "Cole o endereço do bot (ex.: https://instagram-comment-dm-bot.SEU-NOME.workers.dev):",
    );
    let u = (a || saved).replace(/\s+/g, "");
    if (!/^https?:\/\//.test(u)) u = `https://${u}`;
    try {
      u = new URL(u).origin;
    } catch {
      bad("Endereço inválido.");
      continue;
    }
    const r = await getJson(u + "/");
    if (r.status === 200 && /no ar/i.test(r.body.raw ?? r.text)) {
      ok(`Bot respondendo em ${u}`);
      botUrl = u;
      break;
    }
    bad(`O bot não respondeu em ${u} (status ${r.status}).`);
    if (!SKIP_CF) {
      const d = await ask("Quer que eu publique o bot agora? (s/n)");
      if (/^s/i.test(d)) {
        wrangler(["deploy"], { interactive: true });
        await sleep(5000);
      }
    }
  }
  writeFileSync(URL_FILE, botUrl + "\n");

  // 3) ACCESS_TOKEN
  info("\n[3/6] Token de acesso do Instagram (ACCESS_TOKEN)");
  console.log("Onde achar: developers.facebook.com > seu app > Instagram > API setup with Instagram login");
  console.log("> Generate access tokens > botão 'Generate token' ao lado da sua conta > copie o token inteiro.");
  let token = "";
  let username = "";
  for (;;) {
    token = clean(await ask("Cole o token (começa com IG):"));
    if (!token) continue;
    if (token.startsWith("EAA")) {
      bad("Esse token começa com EAA: é do 'login do Facebook' (o do seu outro sistema de publicações).");
      bad("Este bot usa o 'login do Instagram'. Gere o token na página 'API setup with Instagram login'.");
      continue;
    }
    const r = await getJson(`${IG}/${V}/me?fields=user_id,username`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 200 && r.body.username) {
      username = r.body.username;
      ok(`Token válido. Conta: @${username}`);
      break;
    }
    bad(`A Meta recusou o token: ${errMsg(r.body)}`);
    console.log("  Dica: gere um token novo e copie de novo, inteiro.");
  }

  // 4) APP_SECRET
  info("\n[4/6] Segredo do app (APP_SECRET)");
  console.log("Onde achar: na MESMA página (API setup with Instagram login), campo 'Instagram app secret' > Show.");
  console.log("Atenção: NÃO é o 'App secret' de Configurações > Básico (esse é outro).");
  let appSecret = "";
  for (;;) {
    appSecret = clean(await ask("Cole o Instagram app secret:"));
    if (!appSecret) continue;
    if (!/^[0-9a-f]{32}$/i.test(appSecret)) {
      bad("Isso não parece um app secret (normalmente são 32 letras/números, de 0-9 e a-f).");
      const c = await ask("Usar assim mesmo? (s/n)");
      if (!/^s/i.test(c)) continue;
    }
    // Teste com a Meta: trocar o token usando o segredo. Se o segredo estiver errado, a Meta recusa.
    const r = await getJson(
      `${IG}/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(appSecret)}&access_token=${encodeURIComponent(token)}`,
    );
    if (r.status === 200 && r.body.access_token) {
      ok("App secret confirmado pela Meta");
      token = r.body.access_token; // token de longa duração (60 dias)
      ok("Token convertido para longa duração (60 dias)");
      break;
    }
    const msg = String(errMsg(r.body));
    if (/secret/i.test(msg) || r.body?.error?.code === 101) {
      bad(`A Meta recusou o app secret: ${msg}`);
      continue;
    }
    ok("Formato OK (a Meta não permite confirmar o segredo com um token que já é de longa duração; o teste final confirma).");
    break;
  }

  // 5) Senhas
  info("\n[5/6] Senhas");
  const verifyToken = randomBytes(24).toString("hex");
  ok("VERIFY_TOKEN gerado automaticamente");
  let adminPassword = "";
  for (;;) {
    const a = await ask("Crie uma senha para o painel /admin (mínimo 8 caracteres) ou aperte Enter para eu gerar uma:");
    if (!a) {
      adminPassword = randomBytes(9).toString("base64url");
      break;
    }
    if (a.length >= 8) {
      adminPassword = a;
      break;
    }
    bad("Senha curta demais.");
  }
  ok("Senha do painel definida");

  // 6) Gravar e testar
  info("\n[6/6] Gravando na Cloudflare e testando o bot...");
  if (SKIP_CF) {
    // modo de teste: grava no .dev.vars do servidor local
    writeFileSync(
      join(root, ".dev.vars"),
      `VERIFY_TOKEN=${verifyToken}\nACCESS_TOKEN=${token}\nADMIN_PASSWORD=${adminPassword}\nAPP_SECRET=${appSecret}\n`,
    );
  } else {
    const dir = mkdtempSync(join(tmpdir(), "bot-"));
    const file = join(dir, "secrets.json");
    writeFileSync(
      file,
      JSON.stringify({ VERIFY_TOKEN: verifyToken, ACCESS_TOKEN: token, ADMIN_PASSWORD: adminPassword, APP_SECRET: appSecret }),
    );
    const r = wrangler(["secret", "bulk", file]);
    rmSync(dir, { recursive: true, force: true });
    if (!r.ok) {
      bad("Não consegui gravar os segredos:");
      console.log(r.out);
      process.exit(1);
    }
    ok("4 segredos gravados na Cloudflare");
  }

  const auth = "Basic " + Buffer.from(`admin:${adminPassword}`).toString("base64");
  const checks = {
    verify: false,
    admin: false,
    token: false,
    secret: false,
  };
  for (let attempt = 0; attempt < 8 && !Object.values(checks).every(Boolean); attempt++) {
    if (attempt) await sleep(5000);
    const v = await getJson(`${botUrl}/webhook?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=OK42`);
    checks.verify = v.status === 200 && (v.body.raw ?? v.text) === "OK42";
    const s = await getJson(`${botUrl}/admin/api/state`, { headers: { authorization: auth } });
    checks.admin = s.status === 200;
    if (checks.admin) {
      const h = await getJson(`${botUrl}/admin/api/health`, { method: "POST", headers: { authorization: auth, "x-admin": "1" } });
      checks.token = h.status === 200 && h.body.username === username;
    }
    const body = "{}";
    const sig = "sha256=" + createHmac("sha256", appSecret).update(body).digest("hex");
    const w = await getJson(`${botUrl}/webhook`, { method: "POST", headers: { "x-hub-signature-256": sig }, body });
    checks.secret = w.status === 200;
  }
  (checks.verify ? ok : bad)("VERIFY_TOKEN no bot");
  (checks.admin ? ok : bad)("ADMIN_PASSWORD no bot");
  (checks.token ? ok : bad)("ACCESS_TOKEN no bot");
  (checks.secret ? ok : bad)("APP_SECRET no bot");
  rl.close();

  if (!Object.values(checks).every(Boolean)) {
    bad("Algum teste falhou. Rode  npm run configurar  de novo e mande a tela para o Claude.");
    process.exit(1);
  }

  console.log("\n==============================================================");
  console.log(" TUDO CERTO! ✅  Agora configure o webhook na Meta:");
  console.log("==============================================================");
  console.log(" Página: seu app > Instagram > API setup with Instagram login > Configure webhooks\n");
  console.log(` Callback URL:  ${botUrl}/webhook`);
  console.log(` Verify token:  ${verifyToken}`);
  console.log("\n Clique em 'Verify and save' e ative (Subscribe) os campos:  comments  e  messages");
  console.log("\n--------------------------------------------------------------");
  console.log(" PAINEL DO BOT (guarde a senha num lugar seguro):");
  console.log(`   Endereço: ${botUrl}/admin`);
  console.log("   Usuário:  admin");
  console.log(`   Senha:    ${adminPassword}`);
  console.log("--------------------------------------------------------------\n");
}

main().catch((e) => {
  console.error("\nErro:", e.message);
  process.exit(1);
});
