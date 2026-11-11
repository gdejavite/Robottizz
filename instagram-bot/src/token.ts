import type { Env, TokenRecord, TokenStatus } from "./types";
import { getGraphCtx, resetConfigCache } from "./config";
import { refreshLongLivedToken } from "./meta";
import { log } from "./util";

/** Cron semanal: renova o token (ig_refresh_token) e guarda o novo no KV. Falhou? Tenta na semana seguinte. */
export async function refreshAccessToken(env: Env): Promise<boolean> {
  const now = Date.now();
  try {
    const g = await getGraphCtx(env);
    const res = await refreshLongLivedToken(g.token);
    const rec: TokenRecord = { token: res.access_token, base: env.ACCESS_TOKEN, refreshedAt: now };
    await env.KV.put("token", JSON.stringify(rec));
    const status: TokenStatus = { lastAttemptAt: now, ok: true };
    await env.KV.put("tokenstatus", JSON.stringify(status));
    resetConfigCache();
    log("token_refreshed");
    return true;
  } catch (e) {
    const status: TokenStatus = { lastAttemptAt: now, ok: false, error: (e as Error).message };
    try {
      await env.KV.put("tokenstatus", JSON.stringify(status));
    } catch {
      /* ignora */
    }
    log("token_refresh_failed", { error: (e as Error).message });
    return false;
  }
}
