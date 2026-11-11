import { afterEach, describe, expect, it } from "vitest";
import worker from "../src/index";
import { advance, campaign, commentPayload, setup, teardown } from "./helpers";
import { MIN } from "./helpers";
import { flushMetrics } from "../src/metrics";

afterEach(teardown);

async function sign(body: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return "sha256=" + Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function ctxStub() {
  const pending: Promise<unknown>[] = [];
  return { ctx: { waitUntil: (p: Promise<unknown>) => void pending.push(p), passThroughOnException() {} } as unknown as ExecutionContext, done: () => Promise.all(pending) };
}

describe("webhook: verificação (GET)", () => {
  it("devolve o challenge com o VERIFY_TOKEN certo", async () => {
    const t = setup();
    const { ctx } = ctxStub();
    const res = await worker.fetch(new Request("https://x.dev/webhook?hub.mode=subscribe&hub.verify_token=verify-123&hub.challenge=777"), t.env, ctx);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("777");
  });
  it("recusa token errado", async () => {
    const t = setup();
    const { ctx } = ctxStub();
    const res = await worker.fetch(new Request("https://x.dev/webhook?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=777"), t.env, ctx);
    expect(res.status).toBe(403);
  });
});

describe("webhook: assinatura X-Hub-Signature-256", () => {
  const body = JSON.stringify(commentPayload({ id: "cm1", from: "100", text: "quero" }));

  it("aceita assinatura válida (App Secret), responde 200 e processa", async () => {
    const t = setup({ campaigns: [campaign({ isDefault: true })] });
    const { ctx, done } = ctxStub();
    const res = await worker.fetch(
      new Request("https://x.dev/webhook", { method: "POST", body, headers: { "x-hub-signature-256": await sign(body, "app-secret") } }),
      t.env,
      ctx,
    );
    expect(res.status).toBe(200);
    await done();
    expect(t.graph.privateReplies).toHaveLength(1);
  });

  it("rejeita assinatura inválida, ausente ou feita com outro segredo — e não processa nada", async () => {
    const t = setup({ campaigns: [campaign({ isDefault: true })] });
    const { ctx, done } = ctxStub();
    for (const headers of [{} as Record<string, string>, { "x-hub-signature-256": "sha256=deadbeef" }, { "x-hub-signature-256": await sign(body, "outro-segredo") }, { "x-hub-signature-256": "abc" }]) {
      const res = await worker.fetch(new Request("https://x.dev/webhook", { method: "POST", body, headers }), t.env, ctx);
      expect(res.status).toBe(401);
    }
    await done();
    expect(t.graph.calls).toHaveLength(0);
  });

  it("corpo alterado depois de assinado é rejeitado", async () => {
    const t = setup({ campaigns: [campaign({ isDefault: true })] });
    const { ctx } = ctxStub();
    const sig = await sign(body, "app-secret");
    const res = await worker.fetch(new Request("https://x.dev/webhook", { method: "POST", body: body.replace("100", "999"), headers: { "x-hub-signature-256": sig } }), t.env, ctx);
    expect(res.status).toBe(401);
  });
});

describe("crons", () => {
  it("*/15: processa a fila de retry", async () => {
    const t = setup({ campaigns: [campaign({ id: "c1", isDefault: true })] });
    t.graph.blockPrivateReplies = true;
    const { ctx, done } = ctxStub();
    const body = JSON.stringify(commentPayload({ id: "cm1", from: "100", text: "quero" }));
    await worker.fetch(new Request("https://x.dev/webhook", { method: "POST", body, headers: { "x-hub-signature-256": await sign(body, "app-secret") } }), t.env, ctx);
    await done();
    expect(t.kv.keysWithPrefix("q:")).toHaveLength(1);

    t.graph.blockPrivateReplies = false;
    advance(16 * MIN);
    await worker.scheduled({ cron: "*/15 * * * *", scheduledTime: Date.now(), noRetry() {} } as ScheduledController, t.env, ctx);
    await done();
    expect(t.kv.keysWithPrefix("q:")).toHaveLength(0);
    expect(t.graph.privateReplies.at(-1)!.body.recipient.comment_id).toBe("cm1");
  });

  it("semanal: renova o token (ig_refresh_token) e salva o novo no KV; o bot passa a usá-lo", async () => {
    const t = setup({ campaigns: [campaign({ isDefault: true })] });
    const { ctx, done } = ctxStub();
    await worker.scheduled({ cron: "0 7 * * 1", scheduledTime: Date.now(), noRetry() {} } as ScheduledController, t.env, ctx);
    await done();
    const call = t.graph.calls[0];
    expect(call.path).toBe("/refresh_access_token");
    expect(call.query.get("grant_type")).toBe("ig_refresh_token");
    expect(call.query.get("access_token")).toBe("ACCESS_ORIGINAL");
    expect(t.kv.json("token")).toMatchObject({ token: "NOVO_TOKEN", base: "ACCESS_ORIGINAL" });
    expect(t.kv.json("tokenstatus").ok).toBe(true);

    // a partir daqui as chamadas usam o token novo
    const { resetConfigCache } = await import("../src/config");
    resetConfigCache();
    const { processWebhookPayload } = await import("../src/webhook");
    await processWebhookPayload(t.env, commentPayload({ id: "cm1", from: "100", text: "quero" }));
    expect(t.graph.privateReplies[0].auth).toBe("Bearer NOVO_TOKEN");
  });

  it("semanal: se falhar, mantém o token antigo e registra o erro (tenta na semana seguinte)", async () => {
    const t = setup();
    t.graph.refresh = { ok: false };
    const { ctx, done } = ctxStub();
    await worker.scheduled({ cron: "0 7 * * 1", scheduledTime: Date.now(), noRetry() {} } as ScheduledController, t.env, ctx);
    await done();
    expect(t.kv.json("token")).toBeNull();
    expect(t.kv.json("tokenstatus")).toMatchObject({ ok: false });
  });

  it("trocar o secret ACCESS_TOKEN (token novo gerado na Meta) vale mais que o token antigo guardado no KV", async () => {
    const t = setup({ campaigns: [campaign({ isDefault: true })] });
    t.kv.store.set("token", { value: JSON.stringify({ token: "VELHO_RENOVADO", base: "ACCESS_ANTIGO", refreshedAt: 1 }) });
    const { processWebhookPayload } = await import("../src/webhook");
    await processWebhookPayload(t.env, commentPayload({ id: "cm1", from: "100", text: "quero" }));
    expect(t.graph.privateReplies[0].auth).toBe("Bearer ACCESS_ORIGINAL");
  });

  it("a fila não é varrida para nada além do necessário (flush das métricas no cron)", async () => {
    const t = setup();
    await flushMetrics(t.env, true);
    expect(t.kv.puts).toHaveLength(0);
  });
});
