import type { Env } from "./types";
import { handleComment, handleMessage } from "./flow";
import { safeEqual } from "./util";

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Valida o X-Hub-Signature-256 com o App Secret (HMAC-SHA256 do corpo bruto). */
export async function verifySignature(rawBody: string, header: string | null, appSecret: string): Promise<boolean> {
  if (!header || !appSecret || !header.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const expected = toHex(await crypto.subtle.sign("HMAC", key, enc.encode(rawBody)));
  return safeEqual(header.slice(7).toLowerCase(), expected);
}

/** GET /webhook: handshake de verificação da Meta. */
export function handleVerification(url: URL, env: Env): Response {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && env.VERIFY_TOKEN && token === env.VERIFY_TOKEN && challenge !== null) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

/** Distribui os eventos: comentários e mensagens. */
export async function processWebhookPayload(env: Env, payload: any): Promise<void> {
  if (!payload || payload.object !== "instagram" || !Array.isArray(payload.entry)) return;
  for (const entry of payload.entry) {
    const accountId = String(entry?.id ?? "");
    for (const change of entry?.changes ?? []) {
      try {
        if (change?.field === "comments") await handleComment(env, accountId, change.value);
        else if (change?.field === "messages" && change.value?.sender)
          await handleMessage(env, accountId, change.value);
      } catch (e) {
        console.log(JSON.stringify({ event: "handler_error", error: (e as Error).message }));
      }
    }
    for (const ev of entry?.messaging ?? []) {
      try {
        await handleMessage(env, accountId, ev);
      } catch (e) {
        console.log(JSON.stringify({ event: "handler_error", error: (e as Error).message }));
      }
    }
  }
}
