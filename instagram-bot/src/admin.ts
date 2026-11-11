import type { Config, Env, MetricsData, TokenRecord, TokenStatus } from "./types";
import { emptyConfig, getGraphCtx, loadConfig, resetConfigCache, sanitizeConfig, saveConfig } from "./config";
import { GraphError, getMe, listMedia, subscribeWebhooks } from "./meta";
import { flushMetrics, readMetrics } from "./metrics";
import { queueSize } from "./retry";
import { safeEqual } from "./util";
import { panelHtml } from "./panel";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function authorized(request: Request, env: Env): Promise<Response | null> {
  if (!env.ADMIN_PASSWORD) {
    return new Response("ADMIN_PASSWORD não configurada. Veja o DEPLOY.md.", { status: 503 });
  }
  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const password = decoded.slice(decoded.indexOf(":") + 1);
      if (await safeEqual(password, env.ADMIN_PASSWORD)) return null;
    } catch {
      /* cai no 401 */
    }
  }
  return new Response("Autenticação necessária", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Painel do bot", charset="UTF-8"' },
  });
}

/** Extrai o código do post de um link de Reel/post do Instagram. */
export function parseShortcode(link: string): string | null {
  const m = link.match(/instagram\.com\/(?:[\w.]+\/)?(?:reels?|p|tv)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : null;
}

async function resolveMedia(env: Env, link: string): Promise<{ mediaId: string; permalink: string }> {
  const code = parseShortcode(link);
  if (!code) throw new Error("Não entendi esse link. Cole o link completo do Reel, ex.: https://www.instagram.com/reel/ABC123/");
  const g = await getGraphCtx(env);
  let after: string | undefined;
  for (let page = 0; page < 20; page++) {
    const res = await listMedia(g, after);
    for (const m of res.data ?? []) {
      if (m.shortcode === code || (typeof m.permalink === "string" && m.permalink.includes(`/${code}`))) {
        return { mediaId: String(m.id), permalink: m.permalink ?? link };
      }
    }
    after = res.paging?.cursors?.after;
    if (!after || !res.paging?.next) break;
  }
  throw new Error("Não achei esse post na conta conectada. Confira se o link é de um post/Reel do SEU perfil.");
}

export async function handleAdmin(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const denied = await authorized(request, env);
  if (denied) return denied;

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/admin" && request.method === "GET") {
    const nonce = btoa(crypto.randomUUID());
    return new Response(panelHtml(nonce), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "content-security-policy": `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
      },
    });
  }

  if (!path.startsWith("/admin/api/")) return new Response("Not found", { status: 404 });

  // Anti-CSRF: o navegador manda a senha sozinho, então exigimos um cabeçalho que só o nosso painel envia.
  if (request.method !== "GET" && request.headers.get("x-admin") !== "1") {
    return json({ error: "Requisição bloqueada (cabeçalho ausente)." }, 403);
  }

  try {
    if (path === "/admin/api/state" && request.method === "GET") {
      await flushMetrics(env, true).catch(() => undefined);
      const [config, metrics, queue, tokenStatus, token] = await Promise.all([
        env.KV.get<Config>("config", "json").then((c) => c ?? emptyConfig()),
        readMetrics(env),
        queueSize(env),
        env.KV.get<TokenStatus>("tokenstatus", "json"),
        env.KV.get<TokenRecord>("token", "json"),
      ]);
      const out: { config: Config; metrics: MetricsData; queue: number; tokenStatus: TokenStatus | null; tokenRefreshedAt: number | null } = {
        config,
        metrics,
        queue,
        tokenStatus,
        tokenRefreshedAt: token && token.base === env.ACCESS_TOKEN ? token.refreshedAt : null,
      };
      return json(out);
    }

    if (path === "/admin/api/config" && request.method === "PUT") {
      const body = await request.json().catch(() => null);
      const config = sanitizeConfig(body);
      await saveConfig(env, config);
      return json({ ok: true, config });
    }

    if (path === "/admin/api/pause" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as { paused?: boolean };
      resetConfigCache();
      const cfg = await loadConfig(env);
      const next: Config = { ...cfg, paused: !!body.paused };
      await saveConfig(env, next);
      return json({ ok: true, paused: next.paused });
    }

    if (path === "/admin/api/media" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as { url?: string };
      return json({ ok: true, ...(await resolveMedia(env, String(body.url ?? ""))) });
    }

    if (path === "/admin/api/health" && request.method === "POST") {
      const g = await getGraphCtx(env);
      const me = await getMe(g);
      return json({ ok: true, username: me.username, userId: me.user_id });
    }

    if (path === "/admin/api/subscribe" && request.method === "POST") {
      const g = await getGraphCtx(env);
      await subscribeWebhooks(g);
      return json({ ok: true });
    }
  } catch (e) {
    const status = e instanceof GraphError ? 502 : 400;
    return json({ error: (e as Error).message }, status);
  }

  void ctx;
  return json({ error: "Rota não encontrada." }, 404);
}
