#!/usr/bin/env node
// Executável do bot de DM do Instagram.
//
//   node scripts/bot.mjs menu                 menu para humanos (é o que os atalhos de clique duplo abrem)
//   node scripts/bot.mjs verificar [--json]   checa ambiente, Cloudflare, credenciais e o bot no ar
//   node scripts/bot.mjs aplicar   [--json]   lê credenciais.env, valida na Meta, publica e grava os segredos
//   node scripts/bot.mjs status    [--json]   status, métricas e alertas do bot (API /api/v1/status)
//   node scripts/bot.mjs publicar  [--json]   roda os testes e, se passarem, publica a versão nova
//   node scripts/bot.mjs testar               roda os testes automáticos
//
// Saída com --json: um único objeto JSON em stdout ({ ok, ... }) e código de saída 0 (ok) ou 1 (falhou).
import { existsSync } from "node:fs";
import { join } from "node:path";
import readline from "node:readline";
import {
  CHECK_LABELS,
  CRED_FILE,
  SECRET_NAMES,
  SKIP_CF,
  botUrl,
  checkBot,
  cloudflareLoggedIn,
  deploy,
  ensureKv,
  fillGenerated,
  getJson,
  isUp,
  metaInstructions,
  readCreds,
  root,
  run,
  secretNames,
  uploadSecrets,
  validateAppSecret,
  validateToken,
  writeCreds,
} from "./lib.mjs";

const args = process.argv.slice(2);
const cmd = args.find((a) => !a.startsWith("--")) ?? "menu";
const JSON_OUT = args.includes("--json");

// ---- saída: humana (colorida) ou JSON (para agentes) -----------------------
const report = { ok: true, comando: cmd, checagens: [], avisos: [] };
function check(id, ok, detalhe) {
  report.checagens.push({ id, ok: !!ok, detalhe: detalhe ?? null });
  if (!ok) report.ok = false;
  if (!JSON_OUT) console.log(ok ? `\x1b[32m  ✔ ${detalhe ?? id}\x1b[0m` : `\x1b[31m  ✘ ${detalhe ?? id}\x1b[0m`);
}
function say(m) {
  if (!JSON_OUT) console.log(m);
}
function warn(m) {
  report.avisos.push(m);
  if (!JSON_OUT) console.log(`\x1b[33m  ! ${m}\x1b[0m`);
}
function finish(extra = {}) {
  Object.assign(report, extra);
  if (JSON_OUT) console.log(JSON.stringify(report, null, 2));
  else console.log(report.ok ? "\n\x1b[32mTudo certo.\x1b[0m" : "\n\x1b[31mAlgo precisa de atenção (veja os ✘ acima).\x1b[0m");
  process.exitCode = report.ok ? 0 : 1;
}

// ---- verificar ---------------------------------------------------------------
async function verificar() {
  say("\nVerificando o bot de DM do Instagram...\n");
  const major = Number(process.versions.node.split(".")[0]);
  check("node", major >= 18, `Node.js ${process.versions.node}${major >= 18 ? "" : " (precisa ser 18 ou maior)"}`);
  check("dependencias", existsSync(join(root, "node_modules", "wrangler")), existsSync(join(root, "node_modules", "wrangler")) ? "Dependências instaladas" : "Dependências NÃO instaladas: rode  npm install");

  const logged = cloudflareLoggedIn();
  check("cloudflare_login", logged, logged ? "Logado na Cloudflare" : "Sem login na Cloudflare: rode  npx wrangler login");
  if (logged && !SKIP_CF) {
    const names = secretNames();
    if (names) {
      const missing = SECRET_NAMES.filter((n) => !names.includes(n));
      check("segredos_gravados", !missing.length, missing.length ? `Segredos faltando na Cloudflare: ${missing.join(", ")}` : "Os 5 segredos existem na Cloudflare");
    } else warn("Não consegui listar os segredos do Worker.");
  }

  const url = botUrl();
  const up = await isUp(url);
  check("no_ar", up, up ? `Bot no ar em ${url}` : `Bot não respondeu em ${url}`);

  const creds = readCreds();
  if (!creds) {
    warn(`Sem ${CRED_FILE.split(/[\\/]/).pop()}: não dá para conferir os valores. Rode o assistente (menu, opção 1) ou crie o arquivo a partir de credenciais.exemplo.env.`);
    return finish({ url });
  }
  const tok = await validateToken(creds.ACCESS_TOKEN);
  check("meta_token", tok.ok, tok.ok ? `Token válido na Meta (@${tok.username})` : `Token: ${tok.error}`);
  if (tok.ok) {
    const sec = await validateAppSecret(creds.APP_SECRET, creds.ACCESS_TOKEN);
    check("meta_app_secret", sec.ok, sec.ok ? (sec.confirmado ? "App secret confirmado pela Meta" : "App secret com formato OK (a Meta só confirma na troca de token)") : sec.error);
  }
  if (up) {
    const res = await checkBot(url, creds, { expectUsername: tok.ok ? tok.username : undefined });
    for (const [k, v] of Object.entries(res)) if (k !== "no_ar") check(`bot_${k}`, v, `${CHECK_LABELS[k]}${v ? "" : " — não bate com o credenciais.env"}`);
    if (!res.agent_api_key) warn("Se a API dos agentes falhou com o resto OK, publique a versão nova: node scripts/bot.mjs publicar");
  }
  return finish({ url, conta: tok.ok ? tok.username : null });
}

// ---- aplicar (sem perguntas: para agentes) ----------------------------------
async function aplicar() {
  say("\nAplicando as credenciais do credenciais.env...\n");
  const creds = readCreds();
  if (!creds) {
    writeCreds({});
    check("arquivo", false, `Criei ${CRED_FILE}. Preencha ACCESS_TOKEN e APP_SECRET e rode de novo.`);
    return finish();
  }
  const tok = await validateToken(creds.ACCESS_TOKEN);
  check("meta_token", tok.ok, tok.ok ? `Token válido na Meta (@${tok.username})` : `Token: ${tok.error}`);
  if (!tok.ok) return finish();
  const sec = await validateAppSecret(creds.APP_SECRET, creds.ACCESS_TOKEN);
  check("meta_app_secret", sec.ok, sec.ok ? (sec.confirmado ? "App secret confirmado pela Meta" : "App secret aceito (confirmação final no bot)") : sec.error);
  if (!sec.ok) return finish();
  if (sec.longToken) {
    creds.ACCESS_TOKEN = sec.longToken;
    say("  ✔ Token convertido para longa duração (60 dias)");
  }
  const made = fillGenerated(creds);
  writeCreds(creds);
  if (made.length) say(`  ✔ Gerados e salvos no credenciais.env: ${made.join(", ")}`);

  if (!cloudflareLoggedIn()) {
    check("cloudflare_login", false, "Sem login na Cloudflare: rode  npx wrangler login  (abre o navegador) e repita.");
    return finish();
  }
  const kv = ensureKv();
  check("kv", kv.ok, kv.ok ? "Banco KV configurado" : `Banco KV: ${kv.out?.slice(-500)}`);
  if (!kv.ok) return finish();
  if (!args.includes("--sem-publicar")) {
    const d = deploy();
    check("publicado", d.ok, d.ok ? `Versão mais nova publicada${d.url ? `: ${d.url}` : ""}` : `Publicação falhou: ${d.out.slice(-800)}`);
    if (!d.ok) return finish();
  }
  const up = uploadSecrets(creds);
  check("segredos", up.ok, up.ok ? "5 segredos gravados na Cloudflare" : `Gravação falhou: ${up.out.slice(-800)}`);
  if (!up.ok) return finish();

  const url = botUrl();
  const res = await checkBot(url, creds, { expectUsername: tok.username, attempts: 8 });
  for (const [k, v] of Object.entries(res)) check(`bot_${k}`, v, CHECK_LABELS[k]);
  if (report.ok) say("\n" + metaInstructions(url, creds));
  return finish({ url, conta: tok.username, credenciais_geradas: made });
}

// ---- status ------------------------------------------------------------------
async function status() {
  const creds = readCreds();
  if (!creds?.AGENT_API_KEY) {
    check("chave", false, "Sem AGENT_API_KEY no credenciais.env (rode o assistente ou o aplicar).");
    return finish();
  }
  const url = botUrl();
  const r = await getJson(`${url}/api/v1/status`, { headers: { authorization: `Bearer ${creds.AGENT_API_KEY}`, "x-agente": "cli" } });
  check("api", r.status === 200, r.status === 200 ? "API dos agentes respondeu" : `API respondeu ${r.status}: ${r.body?.error ?? "sem resposta"}`);
  if (r.status !== 200) return finish();
  const s = r.body;
  if (!JSON_OUT) {
    const c = s.metricas ?? {};
    console.log(`\n  Automação: ${s.pausado ? "⏸ PAUSADA" : "● ativa"}   ·   fila de retry: ${s.fila_retry}`);
    console.log(`  Campanhas: ${s.campanhas.map((x) => `${x.nome}${x.ativa ? "" : " (desativada)"}${x.padrao ? " [padrão]" : ""}`).join(" · ") || "nenhuma"}`);
    console.log(`  Comentários ${c.comments ?? 0} · DMs ${c.dms ?? 0} · follows convertidos ${c.followsConverted ?? 0} · entregas ${c.deliveries ?? 0} · plano B ${c.planB ?? 0}`);
  }
  for (const a of s.alertas) {
    if (a.nivel === "info") warn(a.mensagem);
    else check(`alerta_${a.codigo}`, false, `[${a.nivel}] ${a.mensagem}`);
  }
  if (!s.alertas.length) say("  ✔ Nenhum alerta");
  return finish({ url, status: s });
}

// ---- publicar / testar ----------------------------------------------------------
function testar() {
  const t = run("npx", ["vitest", "run"], { interactive: !JSON_OUT });
  check("testes", t.ok, t.ok ? "Testes automáticos passaram" : "Testes FALHARAM: nada foi publicado");
  return t.ok;
}
async function publicar() {
  if (!testar()) return finish();
  const kv = ensureKv();
  if (!kv.ok) return check("kv", false, "Banco KV não configurado"), finish();
  const d = deploy();
  check("publicado", d.ok, d.ok ? `Publicado${d.url ? `: ${d.url}` : ""}` : `Publicação falhou: ${d.out.slice(-800)}`);
  return finish({ url: d.url ?? botUrl() });
}

// ---- menu (humanos) -----------------------------------------------------------
async function menu() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((r) => rl.question(q, r));
  for (;;) {
    console.log(`
==================================================
  BOT DE DM DO INSTAGRAM  ·  ${botUrl()}
==================================================
  1) Configurar credenciais (assistente, pergunta uma por uma)
  2) Verificar tudo (ambiente, credenciais e bot no ar)
  3) Ver status, métricas e alertas
  4) Publicar a versão nova (roda os testes antes)
  5) Abrir o endereço do painel
  0) Sair`);
    const o = (await ask("\nEscolha uma opção: ")).trim();
    report.ok = true;
    report.checagens = [];
    report.avisos = [];
    if (o === "1") {
      rl.pause();
      run("node", [join(root, "scripts", "configurar.mjs")], { interactive: true });
      rl.resume();
    } else if (o === "2") await verificar();
    else if (o === "3") await status();
    else if (o === "4") await publicar();
    else if (o === "5") console.log(`\n  Painel: ${botUrl()}/admin  (usuário: admin)`);
    else if (o === "0" || o === "") break;
    await ask("\n(Enter para voltar ao menu)");
  }
  rl.close();
}

const COMMANDS = { verificar, aplicar, status, publicar, testar: () => (testar(), finish()), menu };
if (!COMMANDS[cmd]) {
  console.error(`Comando desconhecido: ${cmd}. Use: menu, verificar, aplicar, status, publicar, testar.`);
  process.exit(2);
}
await COMMANDS[cmd]();
