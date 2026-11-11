/** Anti-duplicata em memória (por isolate): evita reprocessar o mesmo evento/pessoa. */
const seen = new Map<string, number>();

/** true na PRIMEIRA vez que a chave aparece dentro do prazo. */
export function firstTime(key: string, ttlMs: number, now = Date.now()): boolean {
  const exp = seen.get(key);
  if (exp !== undefined && exp > now) return false;
  seen.set(key, now + ttlMs);
  if (seen.size > 5000) {
    for (const [k, v] of seen) if (v <= now) seen.delete(k);
    if (seen.size > 20000) seen.clear();
  }
  return true;
}

export function forgetSeen(key: string): void {
  seen.delete(key);
}

export function resetSeen(): void {
  seen.clear();
}

export function log(event: string, data: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ event, ...data }));
}

/** Comparação em tempo constante (strings de qualquer tamanho). */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
