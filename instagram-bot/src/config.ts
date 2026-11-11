import type { Campaign, Config, Env, TokenRecord } from "./types";
import type { GraphCtx } from "./meta";
import { DEFAULT_GRAPH_VERSION } from "./meta";

/** Cache da configuração: milhares de comentários no mesmo segundo = 1 leitura do KV. */
export const CONFIG_CACHE_MS = 5000;

export const DEFAULT_INTRO =
  "Oi {usuario}! 🎉 Que bom que você comentou! Responda essa mensagem com qualquer coisa (pode ser só um \"oi\") que eu já te envio o material.";
export const DEFAULT_FOLLOW =
  "Quase lá! 🙌 Pra liberar o material, você precisa seguir o meu perfil. Segue lá e me manda outra mensagem aqui que eu libero na hora!";
export const DEFAULT_DELIVERY =
  "Aqui está! 🎁 Escreva aqui o link ou o texto que você quer entregar.";
export const DEFAULT_NOTICE = [
  "{usuario} me chama no direct e escreve a palavra do post que eu te envio! 📩",
  "{usuario} o direct está te esperando, é só mandar a palavra do post lá! 💬",
  "Opa {usuario}! Manda a palavra-chave no meu direct que eu te mando o material 🚀",
].join("\n");

export function emptyConfig(): Config {
  return { paused: false, campaigns: [] };
}

export function newCampaign(partial: Partial<Campaign> = {}): Campaign {
  return {
    id: crypto.randomUUID().slice(0, 8),
    name: "Nova campanha",
    active: true,
    isDefault: false,
    keywords: [],
    mediaId: "",
    mediaUrl: "",
    introMessage: DEFAULT_INTRO,
    followMessage: DEFAULT_FOLLOW,
    deliveryMessage: DEFAULT_DELIVERY,
    publicNotice: DEFAULT_NOTICE,
    ...partial,
  };
}

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");

/** Valida e limpa a configuração vinda do painel. Lança Error com mensagem em português. */
export function sanitizeConfig(input: any): Config {
  if (!input || typeof input !== "object") throw new Error("Configuração inválida.");
  const raw: any[] = Array.isArray(input.campaigns) ? input.campaigns : [];
  if (raw.length > 50) throw new Error("Máximo de 50 campanhas.");
  const ids = new Set<string>();
  let defaultTaken = false;
  const campaigns: Campaign[] = raw.map((c, i) => {
    let id = str(c?.id, 40).replace(/[^\w-]/g, "");
    if (!id || ids.has(id)) id = crypto.randomUUID().slice(0, 8);
    ids.add(id);
    const keywords = (Array.isArray(c?.keywords) ? c.keywords : [])
      .map((k: unknown) => str(k, 60).trim())
      .filter(Boolean)
      .slice(0, 30);
    const name = str(c?.name, 80).trim() || `Campanha ${i + 1}`;
    const active = c?.active !== false;
    let isDefault = !!c?.isDefault && active && !defaultTaken;
    if (isDefault) defaultTaken = true;
    const out: Campaign = {
      id,
      name,
      active,
      isDefault,
      keywords,
      mediaId: str(c?.mediaId, 60).replace(/[^\d_]/g, ""),
      mediaUrl: str(c?.mediaUrl, 300).trim(),
      introMessage: str(c?.introMessage, 1000).trim(),
      followMessage: str(c?.followMessage, 1000).trim(),
      deliveryMessage: str(c?.deliveryMessage, 1000).trim(),
      publicNotice: str(c?.publicNotice, 4000).trim(),
    };
    if (active && !keywords.length) throw new Error(`A campanha "${name}" precisa de pelo menos uma palavra-chave (ou desative a campanha).`);
    if (active && (!out.introMessage || !out.followMessage || !out.deliveryMessage)) {
      throw new Error(`A campanha "${name}" precisa das mensagens de intro, follow e entrega preenchidas.`);
    }
    return out;
  });
  return { paused: !!input.paused, campaigns };
}

// ---------------------------------------------------------------------------
// Cache em memória (por isolate)
// ---------------------------------------------------------------------------
interface Snapshot {
  kv: KVNamespace;
  at: number;
  config: Config;
  token: TokenRecord | null;
}

let snapshot: Snapshot | null = null;
let inflight: Promise<Snapshot> | null = null;

export function resetConfigCache(): void {
  snapshot = null;
  inflight = null;
}

async function loadSnapshot(env: Env): Promise<Snapshot> {
  const [config, token] = await Promise.all([
    env.KV.get<Config>("config", "json"),
    env.KV.get<TokenRecord>("token", "json"),
  ]);
  return { kv: env.KV, at: Date.now(), config: config ?? emptyConfig(), token };
}

async function getSnapshot(env: Env): Promise<Snapshot> {
  const now = Date.now();
  if (snapshot && snapshot.kv === env.KV && now - snapshot.at < CONFIG_CACHE_MS) return snapshot;
  if (!inflight) {
    inflight = loadSnapshot(env)
      .then((s) => (snapshot = s))
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export async function loadConfig(env: Env): Promise<Config> {
  return (await getSnapshot(env)).config;
}

/** Token em uso: o renovado no KV (se for do ACCESS_TOKEN atual) ou o secret. */
export async function getGraphCtx(env: Env): Promise<GraphCtx> {
  const s = await getSnapshot(env);
  const token = s.token && s.token.base === env.ACCESS_TOKEN ? s.token.token : env.ACCESS_TOKEN;
  return { token, version: env.GRAPH_VERSION || DEFAULT_GRAPH_VERSION };
}

/** Salva a configuração (painel) e já vale neste isolate. */
export async function saveConfig(env: Env, config: Config): Promise<void> {
  await env.KV.put("config", JSON.stringify(config));
  snapshot = {
    kv: env.KV,
    at: Date.now(),
    config,
    token: snapshot?.kv === env.KV ? snapshot.token : null,
  };
}
