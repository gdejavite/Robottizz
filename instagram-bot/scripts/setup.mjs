// Prepara o banco (Cloudflare KV) e preenche o wrangler.toml sozinho.
// Rode uma vez:  npm run setup
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tomlPath = join(root, "wrangler.toml");
const NAME = "instagram-bot-dados";

function wrangler(args) {
  return execFileSync("npx", ["wrangler", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
  });
}

function parseJsonArray(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) return [];
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
}

function findNamespace() {
  const list = parseJsonArray(wrangler(["kv", "namespace", "list"]));
  return list.find((n) => typeof n.title === "string" && n.title.endsWith(NAME));
}

try {
  console.log("1/3 Conferindo seu login na Cloudflare...");
  try {
    wrangler(["whoami"]);
  } catch {
    console.error("\nVocê ainda não está logado. Rode:  npx wrangler login   e depois repita:  npm run setup");
    process.exit(1);
  }

  console.log("2/3 Procurando/criando o banco KV...");
  let ns = findNamespace();
  if (!ns) {
    wrangler(["kv", "namespace", "create", NAME]);
    ns = findNamespace();
  }
  if (!ns?.id) throw new Error("Não consegui obter o id do KV. Rode: npx wrangler kv namespace list");

  console.log("3/3 Gravando o id no wrangler.toml...");
  const toml = readFileSync(tomlPath, "utf8");
  const next = toml.replace(/(\[\[kv_namespaces\]\][^\[]*?\bid\s*=\s*")[^"]*(")/s, `$1${ns.id}$2`);
  if (next === toml && !toml.includes(ns.id)) throw new Error("Não achei a linha id = ... no wrangler.toml");
  writeFileSync(tomlPath, next);
  console.log(`\nPronto! Banco "${ns.title}" (${ns.id}) configurado. Próximo passo: veja o DEPLOY.md.`);
} catch (e) {
  console.error("\nErro:", e.stderr?.toString() || e.message);
  process.exit(1);
}
