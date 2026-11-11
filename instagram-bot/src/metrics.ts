import type { Env, MetricsData } from "./types";

/** Métricas ficam em buffer e vão ao KV a cada 25 interações ou 5 minutos. */
export const FLUSH_EVERY = 25;
export const FLUSH_MS = 5 * 60 * 1000;

let buffer: Record<string, number> = {};
let pending = 0; // interações (comentário/mensagem tratados) desde o último flush
let dirty = false; // há contadores novos no buffer
let lastFlush = Date.now();

/** Soma 1 em um contador (só em memória). */
export function inc(name: string, n = 1): void {
  buffer[name] = (buffer[name] ?? 0) + n;
  dirty = true;
}

/** Marca UMA interação (um comentário ou uma mensagem processada). A cada 25, o buffer vai ao KV. */
export function touch(): void {
  pending += 1;
}

export function resetMetricsBuffer(): void {
  buffer = {};
  pending = 0;
  dirty = false;
  lastFlush = Date.now();
}

export async function flushMetrics(env: Env, force = false): Promise<void> {
  const now = Date.now();
  const due = pending >= FLUSH_EVERY || now - lastFlush >= FLUSH_MS;
  if (!force && !due) return;
  if (!dirty) {
    lastFlush = now;
    pending = 0;
    return;
  }
  lastFlush = now;
  const delta = buffer;
  buffer = {};
  pending = 0;
  dirty = false;
  try {
    const cur = (await env.KV.get<MetricsData>("metrics", "json")) ?? { since: now, updatedAt: now, counters: {} };
    for (const [k, v] of Object.entries(delta)) cur.counters[k] = (cur.counters[k] ?? 0) + v;
    cur.updatedAt = now;
    await env.KV.put("metrics", JSON.stringify(cur));
  } catch (e) {
    // devolve ao buffer para tentar de novo depois
    for (const [k, v] of Object.entries(delta)) buffer[k] = (buffer[k] ?? 0) + v;
    dirty = true;
    throw e;
  }
}

export async function readMetrics(env: Env): Promise<MetricsData> {
  const now = Date.now();
  const cur = (await env.KV.get<MetricsData>("metrics", "json")) ?? { since: now, updatedAt: now, counters: {} };
  // soma o que ainda está no buffer desta instância para o painel não parecer atrasado
  const counters = { ...cur.counters };
  for (const [k, v] of Object.entries(buffer)) counters[k] = (counters[k] ?? 0) + v;
  return { ...cur, counters };
}
