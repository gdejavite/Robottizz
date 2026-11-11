import { vi } from "vitest";
import type { Campaign, Config, Env } from "../src/types";
import { newCampaign, resetConfigCache } from "../src/config";
import { resetMetricsBuffer, flushMetrics } from "../src/metrics";
import { resetSeen } from "../src/util";
import { processWebhookPayload } from "../src/webhook";

// ---------------------------------------------------------------------------
// KV falso (em memória), com contadores para testar custo
// ---------------------------------------------------------------------------
export class FakeKV {
  store = new Map<string, { value: string; metadata?: any; expirationTtl?: number }>();
  gets: string[] = [];
  puts: string[] = [];
  deletes: string[] = [];

  async get(key: string, type?: any): Promise<any> {
    this.gets.push(key);
    const e = this.store.get(key);
    if (!e) return null;
    return type === "json" || type?.type === "json" ? JSON.parse(e.value) : e.value;
  }
  async put(key: string, value: string, opts?: { metadata?: any; expirationTtl?: number }) {
    this.puts.push(key);
    this.store.set(key, { value, metadata: opts?.metadata, expirationTtl: opts?.expirationTtl });
  }
  async delete(key: string) {
    this.deletes.push(key);
    this.store.delete(key);
  }
  async list(opts?: { prefix?: string }) {
    const keys = [...this.store.entries()]
      .filter(([k]) => k.startsWith(opts?.prefix ?? ""))
      .map(([name, e]) => ({ name, metadata: e.metadata }));
    return { keys, list_complete: true, cursor: undefined };
  }
  json<T = any>(key: string): T | null {
    const e = this.store.get(key);
    return e ? JSON.parse(e.value) : null;
  }
  resetCounters() {
    this.gets = [];
    this.puts = [];
    this.deletes = [];
  }
  keysWithPrefix(prefix: string) {
    return [...this.store.keys()].filter((k) => k.startsWith(prefix));
  }
}

// ---------------------------------------------------------------------------
// Graph API falsa
// ---------------------------------------------------------------------------
export interface Call {
  method: string;
  path: string; // sem o host e sem a versão
  query: URLSearchParams;
  body: any;
  auth: string | null;
  url: string;
}

export class FakeGraph {
  calls: Call[] = [];
  following = new Set<string>();
  /** Quando true, TODA private reply volta com o subcódigo 2534025. */
  blockPrivateReplies = false;
  /** Quando true, devolve erro temporário (HTTP 500) nas private replies. */
  privateReplyServerError = false;
  /** Erro permanente nas private replies (ex.: comentário apagado). */
  privateReplyPermanentError = false;
  followCheckFails = false;
  failPublicReply = false;
  media = [
    { id: "9001", shortcode: "AAA111", permalink: "https://www.instagram.com/reel/AAA111/" },
    { id: "9002", shortcode: "BBB222", permalink: "https://www.instagram.com/reel/BBB222/" },
  ];
  refresh: { ok: boolean; token?: string } = { ok: true, token: "NOVO_TOKEN" };

  fetch = async (input: any, init: RequestInit = {}): Promise<Response> => {
    const u = new URL(typeof input === "string" ? input : input.url);
    const path = u.pathname.replace(/^\/v[\d.]+/, "");
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    const headers = new Headers(init.headers);
    const call: Call = {
      method: (init.method ?? "GET").toUpperCase(),
      path,
      query: u.searchParams,
      body,
      auth: headers.get("authorization"),
      url: u.toString(),
    };
    this.calls.push(call);
    const reply = (status: number, data: unknown) =>
      new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
    const err = (status: number, message: string, code: number, subcode?: number) =>
      reply(status, { error: { message, type: "OAuthException", code, error_subcode: subcode } });

    if (u.hostname !== "graph.instagram.com") return err(400, "host inesperado (só graph.instagram.com)", 1);

    if (path === "/refresh_access_token") {
      return this.refresh.ok
        ? reply(200, { access_token: this.refresh.token, token_type: "bearer", expires_in: 5184000 })
        : err(400, "token expirado", 190);
    }
    if (call.method === "POST" && path === "/me/messages") {
      if (body.recipient?.comment_id) {
        if (this.blockPrivateReplies) return err(400, "invalid for a private reply", 100, 2534025);
        if (this.privateReplyServerError) return err(500, "erro interno", 2);
        if (this.privateReplyPermanentError) return err(400, "comentário não existe", 100, 33);
        return reply(200, { recipient_id: "R", message_id: "M" });
      }
      return reply(200, { recipient_id: body.recipient?.id, message_id: "M" });
    }
    if (call.method === "POST" && /\/replies$/.test(path)) {
      return this.failPublicReply ? err(400, "falhou", 100) : reply(200, { id: "PUB" });
    }
    if (call.method === "POST" && path === "/me/subscribed_apps") return reply(200, { success: true });
    if (path === "/me/media") return reply(200, { data: this.media, paging: {} });
    if (path === "/me") return reply(200, { user_id: "IG1", username: "minhaloja" });
    const m = path.match(/^\/(\d+)$/);
    if (call.method === "GET" && m) {
      if (this.followCheckFails) return err(500, "instável", 2);
      return reply(200, {
        name: `Nome ${m[1]}`,
        username: `user${m[1]}`,
        is_user_follow_business: this.following.has(m[1]),
      });
    }
    return err(404, `rota desconhecida ${path}`, 1);
  };

  // helpers de leitura
  get privateReplies() {
    return this.calls.filter((c) => c.method === "POST" && c.path === "/me/messages" && c.body.recipient.comment_id);
  }
  get dms() {
    return this.calls.filter((c) => c.method === "POST" && c.path === "/me/messages" && c.body.recipient.id);
  }
  get publicReplies() {
    return this.calls.filter((c) => c.method === "POST" && /\/replies$/.test(c.path));
  }
  get followChecks() {
    return this.calls.filter((c) => c.method === "GET" && /^\/\d+$/.test(c.path));
  }
}

// ---------------------------------------------------------------------------
// Ambiente de teste
// ---------------------------------------------------------------------------
export const ACCOUNT_ID = "IG1";

export interface TestCtx {
  env: Env;
  kv: FakeKV;
  graph: FakeGraph;
}

export function setup(config?: Partial<Config>): TestCtx {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));
  resetConfigCache();
  resetSeen();
  resetMetricsBuffer();
  const kv = new FakeKV();
  const graph = new FakeGraph();
  vi.stubGlobal("fetch", graph.fetch);
  const env = {
    KV: kv as unknown as KVNamespace,
    VERIFY_TOKEN: "verify-123",
    ACCESS_TOKEN: "ACCESS_ORIGINAL",
    ADMIN_PASSWORD: "senha-forte",
    APP_SECRET: "app-secret",
    GRAPH_VERSION: "v23.0",
  } as Env;
  if (config) kv.store.set("config", { value: JSON.stringify({ paused: false, campaigns: [], ...config }) });
  return { env, kv, graph };
}

export function teardown() {
  vi.useRealTimers();
  vi.unstubAllGlobals();
}

export function campaign(partial: Partial<Campaign> = {}): Campaign {
  return newCampaign({
    id: "c1",
    name: "Campanha 1",
    keywords: ["quero"],
    introMessage: "INTRO {usuario}",
    followMessage: "SEGUE ai",
    deliveryMessage: "ENTREGA 1",
    publicNotice: "Aviso A\nAviso B\nAviso C",
    ...partial,
  });
}

export function commentPayload(o: {
  id: string;
  from: string;
  text: string;
  media?: string;
  parent?: string;
  username?: string;
}) {
  return {
    object: "instagram",
    entry: [
      {
        id: ACCOUNT_ID,
        time: Date.now(),
        changes: [
          {
            field: "comments",
            value: {
              id: o.id,
              text: o.text,
              from: { id: o.from, username: o.username ?? `user${o.from}` },
              media: { id: o.media ?? "9001", media_product_type: "REELS" },
              ...(o.parent ? { parent_id: o.parent } : {}),
            },
          },
        ],
      },
    ],
  };
}

let mid = 0;
export function dmPayload(o: { from: string; text?: string; echo?: boolean }) {
  return {
    object: "instagram",
    entry: [
      {
        id: ACCOUNT_ID,
        time: Date.now(),
        messaging: [
          {
            sender: { id: o.from },
            recipient: { id: ACCOUNT_ID },
            timestamp: Date.now(),
            message: { mid: `mid${++mid}`, ...(o.text !== undefined ? { text: o.text } : {}), ...(o.echo ? { is_echo: true } : {}) },
          },
        ],
      },
    ],
  };
}

/** Entrega o evento como a Meta faria e força o flush das métricas. */
export async function deliver(env: Env, payload: unknown) {
  await processWebhookPayload(env, payload);
  await flushMetrics(env, true);
}

export function advance(ms: number) {
  vi.setSystemTime(Date.now() + ms);
  resetConfigCache(); // o cache de 5s expira com o tempo; aqui garantimos releitura
}

export const MIN = 60_000;
export const HOUR = 60 * MIN;
