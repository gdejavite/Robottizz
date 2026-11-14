/**
 * API para agentes (torre de agentes, n8n, scripts): /api/v1/*
 * Autenticação: header  Authorization: Bearer <AGENT_API_KEY>
 * Sem AGENT_API_KEY configurada, a API fica desligada (503).
 */
import type { Campaign, Config, Env, TokenRecord, TokenStatus } from "./types";
import {
  DEFAULT_DELIVERY,
  DEFAULT_FOLLOW,
  DEFAULT_INTRO,
  DEFAULT_NOTICE,
  getGraphCtx,
  loadConfig,
  resetConfigCache,
  sanitizeConfig,
  saveConfig,
} from "./config";
import { GraphError, getMe } from "./meta";
import { flushMetrics, readMetrics } from "./metrics";
import { processRetryQueue, queueSize } from "./retry";
import { refreshAccessToken } from "./token";
import { resolveMedia } from "./admin";
import { safeEqual } from "./util";

const DAY = 24 * 3600 * 1000;
export const QUEUE_ALERT = 50;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
const fail = (error: string, status = 400) => json({ ok: false, error }, status);

export interface Alert {
  codigo: string;
  nivel: "vermelho" | "amarelo" | "info";
  mensagem: string;
  agente: string;
}

/** Alertas para os agentes agirem (monitoramento). */
export async function computeAlerts(env: Env, cfg: Config, queue: number): Promise<Alert[]> {
  const [status, token] = await Promise.all([
    env.KV.get<TokenStatus>("tokenstatus", "json"),
    env.KV.get<TokenRecord>("token", "json"),
  ]);
  const alerts: Alert[] = [];
  if (status && !status.ok) {
    alerts.push({
      codigo: "token_renovacao_falhou",
      nivel: "vermelho",
      agente: "alex",
      mensagem: `A renovação semanal do token falhou: ${status.error ?? "erro"}. Gere um token novo na Meta e grave com npm run configurar.`,
    });
  }
  const valid = token && token.base === env.ACCESS_TOKEN ? token : null;
  if (valid && Date.now() - valid.refreshedAt > 45 * DAY) {
    alerts.push({
      codigo: "token_perto_de_expirar",
      nivel: "vermelho",
      agente: "alex",
      mensagem: "O token não é renovado há mais de 45 dias (ele expira em 60). Rode a renovação ou gere um novo.",
    });
  }
  if (cfg.paused) {
    alerts.push({ codigo: "automacao_pausada", nivel: "amarelo", agente: "otto", mensagem: "A automação está pausada: ninguém recebe direct." });
  }
  if (!cfg.campaigns.some((c) => c.active)) {
    alerts.push({ codigo: "sem_campanha_ativa", nivel: "amarelo", agente: "luna", mensagem: "Nenhuma campanha ativa: comentários não disparam direct." });
  }
  if (queue >= QUEUE_ALERT) {
    alerts.push({
      codigo: "plano_b_em_massa",
      nivel: "amarelo",
      agente: "luna",
      mensagem: `${queue} private replies na fila de retry: a Meta está limitando (erro 2534025). O bot está avisando em público e re-tentando a cada 15 min.`,
    });
  }
  return alerts;
}

/** Aceita nomes em inglês (iguais ao painel) ou em português (usados pelos agentes). */
function pickInput(b: any): Partial<Campaign> & { reelUrl?: string } {
  const out: any = {};
  const map: Record<string, string> = {
    name: "name", nome: "name",
    keywords: "keywords", palavras: "keywords", palavras_chave: "keywords",
    active: "active", ativa: "active",
    isDefault: "isDefault", padrao: "isDefault",
    mediaId: "mediaId", media_id: "mediaId",
    introMessage: "introMessage", intro: "introMessage",
    followMessage: "followMessage", follow: "followMessage", pedido_follow: "followMessage",
    deliveryMessage: "deliveryMessage", entrega: "deliveryMessage",
    publicNotice: "publicNotice", aviso_publico: "publicNotice",
    reelUrl: "reelUrl", reel_url: "reelUrl", link_reel: "reelUrl", mediaUrl: "reelUrl",
  };
  for (const [k, v] of Object.entries(b ?? {})) if (map[k]) out[map[k]] = v;
  if (typeof out.keywords === "string") out.keywords = out.keywords.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean);
  if (Array.isArray(out.publicNotice)) out.publicNotice = out.publicNotice.join("\n");
  return out;
}

async function audit(env: Env, acao: string, detalhe: Record<string, unknown>, agente: string): Promise<void> {
  const entry = { em: new Date().toISOString(), acao, agente, ...detalhe };
  console.log(JSON.stringify({ event: "api_change", ...entry }));
  try {
    const cur = (await env.KV.get<any[]>("audit", "json")) ?? [];
    cur.unshift(entry);
    await env.KV.put("audit", JSON.stringify(cur.slice(0, 100)));
  } catch {
    /* auditoria não pode derrubar a ação */
  }
}

async function freshConfig(env: Env): Promise<Config> {
  resetConfigCache();
  return loadConfig(env);
}

async function save(env: Env, cfg: Config): Promise<Config> {
  const clean = sanitizeConfig(cfg);
  await saveConfig(env, clean);
  return clean;
}

function findCampaign(cfg: Config, ref: string): Campaign | null {
  if (!ref) return null;
  const norm = (x: string) => x.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
  return cfg.campaigns.find((c) => c.id === ref) ?? cfg.campaigns.find((c) => norm(c.name) === norm(ref)) ?? null;
}

async function patchCampaign(env: Env, cfg: Config, id: string, body: unknown, agente: string): Promise<Response> {
  const idx = cfg.campaigns.findIndex((c) => c.id === id);
  const input = pickInput(body);
  const next: any = { ...cfg.campaigns[idx] };
  for (const [k, v] of Object.entries(input)) if (k !== "reelUrl") next[k] = v;
  if (input.reelUrl !== undefined) {
    if (input.reelUrl) {
      const media = await resolveMedia(env, String(input.reelUrl));
      next.mediaId = media.mediaId;
      next.mediaUrl = media.permalink;
    } else {
      next.mediaId = "";
      next.mediaUrl = "";
    }
  }
  if (next.isDefault) cfg.campaigns.forEach((c) => (c.isDefault = false));
  cfg.campaigns[idx] = next;
  const saved = await save(env, cfg);
  await audit(env, "campanha_alterada", { campanha: next.id, campos: Object.keys(input) }, agente);
  return json({ ok: true, campanha: saved.campaigns[idx] });
}

export async function handleApi(request: Request, env: Env): Promise<Response> {
  if (!env.AGENT_API_KEY) return fail("API de agentes desligada: configure o secret AGENT_API_KEY.", 503);
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ") || !(await safeEqual(auth.slice(7).trim(), env.AGENT_API_KEY))) {
    return fail("Chave inválida.", 401);
  }
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  const method = request.method;
  const agente = (request.headers.get("x-agente") ?? "agente").slice(0, 40);
  const body = method === "GET" || method === "DELETE" ? {} : await request.json().catch(() => ({}));

  try {
    if (path === "/api/v1/status" && method === "GET") {
      await flushMetrics(env, true).catch(() => undefined);
      const cfg = await freshConfig(env);
      const [metrics, queue, tokenStatus, token] = await Promise.all([
        readMetrics(env),
        queueSize(env),
        env.KV.get<TokenStatus>("tokenstatus", "json"),
        env.KV.get<TokenRecord>("token", "json"),
      ]);
      return json({
        ok: true,
        pausado: cfg.paused,
        campanhas: cfg.campaigns.map((c) => ({ id: c.id, nome: c.name, ativa: c.active, padrao: c.isDefault, palavras: c.keywords, media_id: c.mediaId })),
        metricas: metrics.counters,
        metricas_desde: new Date(metrics.since).toISOString(),
        fila_retry: queue,
        token: {
          ultima_renovacao: tokenStatus ? { em: new Date(tokenStatus.lastAttemptAt).toISOString(), ok: tokenStatus.ok, erro: tokenStatus.error ?? null } : null,
          renovado_em: token && token.base === env.ACCESS_TOKEN ? new Date(token.refreshedAt).toISOString() : null,
        },
        alertas: await computeAlerts(env, cfg, queue),
      });
    }

    if (path === "/api/v1/health" && method === "GET") {
      const me = await getMe(await getGraphCtx(env));
      return json({ ok: true, conta: me.username, user_id: me.user_id });
    }

    if (path === "/api/v1/metrics" && method === "GET") {
      await flushMetrics(env, true).catch(() => undefined);
      const m = await readMetrics(env);
      return json({ ok: true, desde: new Date(m.since).toISOString(), atualizado_em: new Date(m.updatedAt).toISOString(), contadores: m.counters });
    }

    if (path === "/api/v1/audit" && method === "GET") {
      return json({ ok: true, registros: (await env.KV.get("audit", "json")) ?? [] });
    }

    if (path === "/api/v1/campaigns" && method === "GET") {
      return json({ ok: true, campanhas: (await freshConfig(env)).campaigns });
    }

    // Alterar pela identificação (id ou nome) no corpo: { "campanha": "ROBÔ (todos os posts)", ...campos }
    if (path === "/api/v1/campaigns" && method === "PATCH") {
      const ref = String((body as any).campanha ?? (body as any).id ?? "").trim();
      const cfg = await freshConfig(env);
      const found = findCampaign(cfg, ref);
      if (!found) return fail(`Campanha "${ref}" não encontrada.`, 404);
      return patchCampaign(env, cfg, found.id, body, agente);
    }

    if (path === "/api/v1/campaigns" && method === "POST") {
      const input = pickInput(body);
      const cfg = await freshConfig(env);
      // Idempotente: se já existe campanha com o mesmo nome, atualiza em vez de duplicar.
      const same = input.name ? findCampaign(cfg, String(input.name)) : null;
      if (same) return patchCampaign(env, cfg, same.id, body, agente);
      const campaign: Campaign = {
        id: crypto.randomUUID().slice(0, 8),
        name: String(input.name ?? "Campanha"),
        active: input.active !== false,
        isDefault: !!input.isDefault,
        keywords: (input.keywords as string[]) ?? [],
        mediaId: String(input.mediaId ?? ""),
        mediaUrl: "",
        introMessage: input.introMessage ?? DEFAULT_INTRO,
        followMessage: input.followMessage ?? DEFAULT_FOLLOW,
        deliveryMessage: input.deliveryMessage ?? DEFAULT_DELIVERY,
        publicNotice: input.publicNotice ?? DEFAULT_NOTICE,
      };
      if (input.reelUrl) {
        const media = await resolveMedia(env, String(input.reelUrl));
        campaign.mediaId = media.mediaId;
        campaign.mediaUrl = media.permalink;
      }
      if (campaign.isDefault) cfg.campaigns.forEach((c) => (c.isDefault = false));
      const saved = await save(env, { ...cfg, campaigns: [...cfg.campaigns, campaign] });
      const created = saved.campaigns[saved.campaigns.length - 1];
      await audit(env, "campanha_criada", { campanha: created.id, nome: created.name }, agente);
      return json({ ok: true, campanha: created }, 201);
    }

    const m = path.match(/^\/api\/v1\/campaigns\/([\w-]+)$/);
    if (m) {
      const cfg = await freshConfig(env);
      const idx = cfg.campaigns.findIndex((c) => c.id === m[1]);
      if (idx < 0) return fail("Campanha não encontrada.", 404);
      if (method === "GET") return json({ ok: true, campanha: cfg.campaigns[idx] });
      if (method === "DELETE") {
        const [gone] = cfg.campaigns.splice(idx, 1);
        await save(env, cfg);
        await audit(env, "campanha_excluida", { campanha: gone.id, nome: gone.name }, agente);
        return json({ ok: true });
      }
      if (method === "PATCH") return patchCampaign(env, cfg, m[1], body, agente);
    }

    if ((path === "/api/v1/pause" || path === "/api/v1/resume") && method === "POST") {
      const cfg = await freshConfig(env);
      cfg.paused = path.endsWith("pause");
      await saveConfig(env, cfg);
      await audit(env, cfg.paused ? "automacao_pausada" : "automacao_reativada", {}, agente);
      return json({ ok: true, pausado: cfg.paused });
    }

    if (path === "/api/v1/token/refresh" && method === "POST") {
      const ok = await refreshAccessToken(env);
      await audit(env, "token_renovacao", { ok }, agente);
      const status = await env.KV.get<TokenStatus>("tokenstatus", "json");
      return ok ? json({ ok: true }) : fail(`Renovação falhou: ${status?.error ?? "erro"}`, 502);
    }

    if (path === "/api/v1/retry/run" && method === "POST") {
      const tentadas = await processRetryQueue(env);
      await flushMetrics(env, true).catch(() => undefined);
      return json({ ok: true, tentadas, fila_restante: await queueSize(env) });
    }
  } catch (e) {
    return fail((e as Error).message, e instanceof GraphError ? 502 : 400);
  }
  return fail("Rota não encontrada. Veja AGENTES.md.", 404);
}
