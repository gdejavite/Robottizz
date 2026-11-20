// Núcleo compartilhado pelos comandos do bot (bot.mjs) e pelo assistente (configurar.mjs).
// Tudo que valida credenciais, publica ou testa o bot fica AQUI, num lugar só.
import { spawnSync } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const IG = process.env.IG_HOST || "https://graph.instagram.com"; // IG_HOST só existe para testes
export const SKIP_CF = process.env.CONFIG_SKIP_CLOUDFLARE === "1"; // só para testes
export const GRAPH_VERSION = "v23.0";
export const DEFAULT_URL = "https://instagram-comment-dm-bot.robotizz-directbot.workers.dev";
export const URL_FILE = join(root, ".bot-url");
/** Arquivo LOCAL com as credenciais (ignorado pelo Git e fora do pacote .zip). */
export const CRED_FILE = process.env.BOT_CRED_FILE || join(root, "credenciais.env");
export const SECRET_NAMES = ["VERIFY_TOKEN", "ACCESS_TOKEN", "ADMIN_PASSWORD", "APP_SECRET", "AGENT_API_KEY"];

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const genSecret = (bytes = 24) => randomBytes(bytes).toString("hex");
/** Remove espaços, quebras de linha e aspas que costumam vir junto ao colar. */
export const clean = (v) => String(v ?? "").replace(/^["'`]+|["'`]+$/g, "").replace(/\s+/g, "");
export const errMsg = (b) => b?.error?.message ?? b?.error ?? b?.raw ?? "erro desconhecido";

// ---------------------------------------------------------------------------
// Execução de comandos
// ---------------------------------------------------------------------------
export function run(cmd, args, { interactive = false } = {}) {
  const win = process.platform === "win32";
  const bin = win && (cmd === "npx" || cmd === "npm") ? `${cmd}.cmd` : cmd;
  const r = spawnSync(bin, args, { cwd: root, encoding: "utf8", shell: win, stdio: interactive ? "inherit" : "pipe" });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}
export const wrangler = (args, opts) => run("npx", ["wrangler", ...args], opts);

export async function getJson(url, init) {
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

function parseJsonArray(text) {
  const s = text.indexOf("[");
  const e = text.lastIndexOf("]");
  if (s < 0 || e < 0) return null;
  try {
    return JSON.parse(text.slice(s, e + 1));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Arquivo de credenciais (KEY=valor, com comentários)
// ---------------------------------------------------------------------------
export function readCreds(file = CRED_FILE) {
  if (!existsSync(file)) return null;
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = clean(m[2]);
  }
  return out;
}

export function writeCreds(creds, file = CRED_FILE) {
  const v = (k) => creds[k] ?? "";
  writeFileSync(
    file,
    `# CREDENCIAIS DO BOT DE DM — arquivo LOCAL e SECRETO. Nunca envie, nunca commite.
# (já está no .gitignore e fica fora do pacote .zip)
# Preencha os dois primeiros e rode:  node scripts/bot.mjs aplicar
# Os três últimos são gerados sozinhos se ficarem em branco.

# Meta > seu app > Instagram > API setup with Instagram login > Generate token (começa com IG)
ACCESS_TOKEN=${v("ACCESS_TOKEN")}
# Mesma página > Instagram app secret (32 caracteres)
APP_SECRET=${v("APP_SECRET")}

# Cole na Meta em "Configure webhooks" > Verify token
VERIFY_TOKEN=${v("VERIFY_TOKEN")}
# Senha do painel /admin (usuário: admin)
ADMIN_PASSWORD=${v("ADMIN_PASSWORD")}
# Chave da API dos agentes (n8n / torre): header  Authorization: Bearer <chave>
AGENT_API_KEY=${v("AGENT_API_KEY")}
`,
  );
}

/** Completa o que estiver faltando com valores aleatórios. Devolve os nomes gerados. */
export function fillGenerated(creds) {
  const made = [];
  if (!creds.VERIFY_TOKEN) (creds.VERIFY_TOKEN = genSecret(24)), made.push("VERIFY_TOKEN");
  if (!creds.ADMIN_PASSWORD) (creds.ADMIN_PASSWORD = randomBytes(9).toString("base64url")), made.push("ADMIN_PASSWORD");
  if (!creds.AGENT_API_KEY) (creds.AGENT_API_KEY = genSecret(32)), made.push("AGENT_API_KEY");
  return made;
}

// ---------------------------------------------------------------------------
// Endereço do bot
// ---------------------------------------------------------------------------
export function botUrl() {
  const saved = existsSync(URL_FILE) ? readFileSync(URL_FILE, "utf8").trim() : "";
  return process.env.BOT_URL || saved || DEFAULT_URL;
}
export function normalizeUrl(u) {
  let x = String(u).replace(/\s+/g, "");
  if (!/^https?:\/\//.test(x)) x = `https://${x}`;
  return new URL(x).origin;
}
export async function isUp(url) {
  const r = await getJson(url + "/");
  return r.status === 200 && /no ar/i.test(r.body.raw ?? r.text);
}

// ---------------------------------------------------------------------------
// Validações na Meta
// ---------------------------------------------------------------------------
/** { ok, username } | { ok:false, motivo, error } */
export async function validateToken(token) {
  if (!token) return { ok: false, motivo: "vazio", error: "ACCESS_TOKEN vazio" };
  if (token.startsWith("EAA")) {
    return {
      ok: false,
      motivo: "token_do_facebook",
      error: "Token começa com EAA: é do 'login do Facebook'. Este bot usa o 'login do Instagram' (token começa com IG).",
    };
  }
  const r = await getJson(`${IG}/${GRAPH_VERSION}/me?fields=user_id,username`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 200 && r.body.username) return { ok: true, username: r.body.username, userId: r.body.user_id };
  return { ok: false, motivo: "recusado_pela_meta", error: String(errMsg(r.body)) };
}

/**
 * Confere o app secret trocando o token por um de longa duração.
 * { ok:true, confirmado:true, longToken } | { ok:true, confirmado:false } | { ok:false, error }
 */
export async function validateAppSecret(secret, token) {
  if (!secret) return { ok: false, error: "APP_SECRET vazio" };
  const r = await getJson(
    `${IG}/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(secret)}&access_token=${encodeURIComponent(token)}`,
  );
  if (r.status === 200 && r.body.access_token) return { ok: true, confirmado: true, longToken: r.body.access_token };
  const msg = String(errMsg(r.body));
  if (/secret/i.test(msg) || r.body?.error?.code === 101) return { ok: false, error: `A Meta recusou o app secret: ${msg}` };
  // Token que já é de longa duração não pode ser trocado de novo: não dá para confirmar aqui.
  return { ok: true, confirmado: false, formatoSuspeito: !/^[0-9a-f]{32}$/i.test(secret) };
}

// ---------------------------------------------------------------------------
// Cloudflare
// ---------------------------------------------------------------------------
export function cloudflareLoggedIn() {
  if (SKIP_CF) return true;
  const w = wrangler(["whoami"]);
  return w.ok && !/not authenticated|not logged in/i.test(w.out);
}

export function ensureKv() {
  if (SKIP_CF) return { ok: true };
  const toml = readFileSync(join(root, "wrangler.toml"), "utf8");
  if (!toml.includes("PREENCHIDO_PELO_NPM_RUN_SETUP")) return { ok: true };
  const r = run("node", [join(root, "scripts", "setup.mjs")]);
  return { ok: r.ok, out: r.out };
}

export function deploy() {
  if (SKIP_CF) return { ok: true, url: null, out: "" };
  const d = wrangler(["deploy"]);
  const url = d.out.match(/https:\/\/[\w.-]+\.workers\.dev/)?.[0] ?? null;
  if (d.ok && url) writeFileSync(URL_FILE, url + "\n");
  return { ok: d.ok, url, out: d.out };
}

/** Nomes dos segredos gravados no Worker (os valores nunca podem ser lidos de volta). */
export function secretNames() {
  if (SKIP_CF) return null;
  const r = wrangler(["secret", "list"]);
  if (!r.ok) return null;
  return (parseJsonArray(r.out) ?? []).map((s) => s.name);
}

export function uploadSecrets(creds) {
  const values = Object.fromEntries(SECRET_NAMES.map((k) => [k, creds[k]]));
  if (SKIP_CF) {
    writeFileSync(join(root, ".dev.vars"), SECRET_NAMES.map((k) => `${k}=${values[k]}`).join("\n") + "\n");
    return { ok: true, out: "" };
  }
  const dir = mkdtempSync(join(tmpdir(), "bot-"));
  const file = join(dir, "secrets.json");
  try {
    writeFileSync(file, JSON.stringify(values));
    return wrangler(["secret", "bulk", file]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Conferência ponta a ponta no bot publicado
// ---------------------------------------------------------------------------
/** Testa no bot NO AR se cada segredo gravado bate com o valor local. */
export async function checkBot(url, creds, { expectUsername, attempts = 1, waitMs = 5000 } = {}) {
  const auth = "Basic " + Buffer.from(`admin:${creds.ADMIN_PASSWORD ?? ""}`).toString("base64");
  const res = { no_ar: false, verify_token: false, admin_password: false, access_token: false, app_secret: false, agent_api_key: false };
  for (let i = 0; i < attempts; i++) {
    if (i) await sleep(waitMs);
    res.no_ar = await isUp(url);
    const v = await getJson(`${url}/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(creds.VERIFY_TOKEN ?? "")}&hub.challenge=OK42`);
    res.verify_token = v.status === 200 && (v.body.raw ?? v.text) === "OK42";
    const s = await getJson(`${url}/admin/api/state`, { headers: { authorization: auth } });
    res.admin_password = s.status === 200;
    const h = await getJson(`${url}/api/v1/health`, { headers: { authorization: `Bearer ${creds.AGENT_API_KEY ?? ""}` } });
    res.agent_api_key = h.status !== 401 && h.status !== 503 && h.status !== 0 && h.status !== 404;
    res.access_token = h.status === 200 && (!expectUsername || h.body.conta === expectUsername);
    const body = "{}";
    const sig = "sha256=" + createHmac("sha256", creds.APP_SECRET ?? "").update(body).digest("hex");
    const w = await getJson(`${url}/webhook`, { method: "POST", headers: { "x-hub-signature-256": sig }, body });
    res.app_secret = w.status === 200;
    if (Object.values(res).every(Boolean)) break;
  }
  return res;
}

export const CHECK_LABELS = {
  no_ar: "Bot no ar",
  verify_token: "VERIFY_TOKEN no bot",
  admin_password: "ADMIN_PASSWORD no bot",
  access_token: "ACCESS_TOKEN no bot (token válido na Meta)",
  app_secret: "APP_SECRET no bot (assinatura do webhook)",
  agent_api_key: "AGENT_API_KEY no bot (API dos agentes)",
};

export function metaInstructions(url, creds) {
  return [
    "Na Meta: seu app > Instagram > API setup with Instagram login > Configure webhooks",
    `  Callback URL:  ${url}/webhook`,
    `  Verify token:  ${creds.VERIFY_TOKEN}`,
    "  Clique em 'Verify and save' e ative (Subscribe):  comments  e  messages",
    "",
    `Painel: ${url}/admin   (usuário: admin · senha: ADMIN_PASSWORD do credenciais.env)`,
    `API dos agentes: ${url}/api/v1   (Authorization: Bearer AGENT_API_KEY do credenciais.env)`,
  ].join("\n");
}
