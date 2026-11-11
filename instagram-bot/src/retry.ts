import type { Env, RetryItem } from "./types";
import { getGraphCtx, loadConfig } from "./config";
import { GraphError, sendPrivateReply } from "./meta";
import { fillTemplate } from "./match";
import { getState } from "./state";
import { inc, touch } from "./metrics";
import { log } from "./util";

/** A private reply vale por 7 dias a partir do comentário. */
export const PRIVATE_REPLY_WINDOW_MS = 7 * 24 * 3600 * 1000;
const MAX_PER_RUN = 30; // respeita o limite de subrequisições do Workers

/** Espera até a próxima tentativa: 15 min nas primeiras, depois 1h, depois 4h. */
export function nextDelayMs(attempts: number): number {
  if (attempts < 4) return 15 * 60 * 1000;
  if (attempts < 8) return 60 * 60 * 1000;
  return 4 * 60 * 60 * 1000;
}

function ttlSeconds(item: RetryItem, now: number): number {
  return Math.max(60, Math.floor((item.createdAt + PRIVATE_REPLY_WINDOW_MS - now) / 1000));
}

async function store(env: Env, item: RetryItem, now: number): Promise<void> {
  await env.KV.put(`q:${item.commentId}`, JSON.stringify(item), {
    expirationTtl: ttlSeconds(item, now),
    metadata: { next: now + nextDelayMs(item.attempts) },
  });
}

/** Coloca o comentário na fila para re-tentar a private reply (nunca para comentários-filhos). */
export async function enqueueRetry(env: Env, item: Omit<RetryItem, "attempts" | "createdAt">): Promise<void> {
  const now = Date.now();
  await store(env, { ...item, attempts: 1, createdAt: now }, now);
}

export async function queueSize(env: Env): Promise<number> {
  let n = 0;
  let cursor: string | undefined;
  do {
    const page = await env.KV.list({ prefix: "q:", cursor });
    n += page.keys.length;
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return n;
}

/** Roda a cada 15 minutos. Retorna quantos itens foram tentados. */
export async function processRetryQueue(env: Env): Promise<number> {
  const now = Date.now();
  const cfg = await loadConfig(env);
  if (cfg.paused) return 0;

  const due: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.KV.list<{ next?: number }>({ prefix: "q:", cursor });
    for (const k of page.keys) if ((k.metadata?.next ?? 0) <= now) due.push(k.name);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && due.length < MAX_PER_RUN);

  let tried = 0;
  const g = due.length ? await getGraphCtx(env) : null;
  for (const key of due.slice(0, MAX_PER_RUN)) {
    const item = await env.KV.get<RetryItem>(key, "json");
    if (!item) continue;
    if (now - item.createdAt >= PRIVATE_REPLY_WINDOW_MS) {
      await env.KV.delete(key);
      inc("retryExpired");
      continue;
    }
    const campaign = cfg.campaigns.find((c) => c.id === item.campaignId);
    if (!campaign || !campaign.active) {
      await env.KV.delete(key);
      continue;
    }
    // Se a pessoa já chamou no direct e recebeu o conteúdo, a intro não faz mais sentido.
    const state = await getState(env, item.igsid);
    if (state?.d?.[campaign.id] || state?.f?.includes(campaign.id)) {
      await env.KV.delete(key);
      inc("retrySkipped");
      continue;
    }
    tried++;
    touch();
    try {
      await sendPrivateReply(g!, item.commentId, fillTemplate(campaign.introMessage, item.username));
      await env.KV.delete(key);
      inc("dms");
      inc("introSent");
      inc("retryOk");
    } catch (e) {
      const err = e as GraphError;
      if (err instanceof GraphError && err.kind === "permanent") {
        await env.KV.delete(key);
        inc("retryDropped");
        log("retry_dropped", { commentId: item.commentId, error: err.message });
      } else {
        item.attempts += 1;
        await store(env, item, now);
        log("retry_later", { commentId: item.commentId, attempts: item.attempts, error: (e as Error).message });
      }
    }
  }
  return tried;
}
