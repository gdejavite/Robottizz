import type { Env } from "./types";
import { handleVerification, processWebhookPayload, verifySignature } from "./webhook";
import { handleAdmin } from "./admin";
import { processRetryQueue } from "./retry";
import { refreshAccessToken } from "./token";
import { flushMetrics } from "./metrics";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/webhook") {
      if (request.method === "GET") return handleVerification(url, env);
      if (request.method === "POST") {
        const raw = await request.text();
        const ok = await verifySignature(raw, request.headers.get("x-hub-signature-256"), env.APP_SECRET);
        if (!ok) return new Response("Invalid signature", { status: 401 });
        let payload: unknown;
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        // Responde 200 na hora (a Meta exige rapidez) e processa em segundo plano.
        ctx.waitUntil(
          processWebhookPayload(env, payload)
            .then(() => flushMetrics(env))
            .catch((e) => console.log(JSON.stringify({ event: "webhook_error", error: (e as Error).message }))),
        );
        return new Response("EVENT_RECEIVED", { status: 200 });
      }
      return new Response("Method not allowed", { status: 405 });
    }

    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      return handleAdmin(request, env, ctx);
    }

    return new Response("Bot do Instagram no ar ✅", { status: 200 });
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    if (controller.cron === "0 7 * * 1") {
      ctx.waitUntil(refreshAccessToken(env));
    } else {
      ctx.waitUntil(
        processRetryQueue(env)
          .then(() => flushMetrics(env, true))
          .catch((e) => console.log(JSON.stringify({ event: "cron_error", error: (e as Error).message }))),
      );
    }
  },
} satisfies ExportedHandler<Env>;
