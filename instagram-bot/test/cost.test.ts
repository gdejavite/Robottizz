import { afterEach, describe, expect, it } from "vitest";
import { MIN, advance, campaign, commentPayload, deliver, setup, teardown } from "./helpers";
import { FLUSH_EVERY, flushMetrics, inc, touch } from "../src/metrics";
import { processWebhookPayload } from "../src/webhook";
import { CONFIG_CACHE_MS, loadConfig } from "../src/config";
import { vi } from "vitest";

afterEach(teardown);

describe("custo: leituras e escritas no KV", () => {
  it("pico de 1000 comentários no mesmo segundo = 1 leitura de config (cache de ~5s)", async () => {
    const t = setup({ campaigns: [campaign({ isDefault: true })] });
    const payloads = Array.from({ length: 1000 }, (_, i) =>
      commentPayload({ id: `cm${i}`, from: `${1000 + i}`, text: "quero" }),
    );
    await Promise.all(payloads.map((p) => processWebhookPayload(t.env, p)));
    expect(t.graph.privateReplies).toHaveLength(1000);
    expect(t.kv.gets.filter((k) => k === "config")).toHaveLength(1);
    expect(t.kv.gets.filter((k) => k === "token")).toHaveLength(1);
  });

  it("a config só é lida de novo depois que o cache de 5s expira", async () => {
    const t = setup({ campaigns: [campaign()] });
    await loadConfig(t.env);
    vi.setSystemTime(Date.now() + CONFIG_CACHE_MS - 1);
    await loadConfig(t.env);
    expect(t.kv.gets.filter((k) => k === "config")).toHaveLength(1);
    vi.setSystemTime(Date.now() + 2);
    await loadConfig(t.env);
    expect(t.kv.gets.filter((k) => k === "config")).toHaveLength(2);
  });

  it("caso comum (campanha padrão, private reply OK): NADA é gravado no KV por comentário", async () => {
    const t = setup({ campaigns: [campaign({ isDefault: true })] });
    for (let i = 0; i < 10; i++) {
      await processWebhookPayload(t.env, commentPayload({ id: `cm${i}`, from: `${i}`, text: "quero" }));
    }
    expect(t.graph.privateReplies).toHaveLength(10);
    expect(t.kv.puts).toHaveLength(0);
    expect(t.kv.gets.filter((k) => k.startsWith("u:"))).toHaveLength(0);
  });

  it("com várias campanhas, só grava estado quando o roteamento depende dele", async () => {
    const t = setup({
      campaigns: [
        campaign({ id: "A", isDefault: true, mediaId: "M1", keywords: ["quero"] }),
        campaign({ id: "B", mediaId: "M2", keywords: ["quero"] }),
      ],
    });
    await processWebhookPayload(t.env, commentPayload({ id: "c1", from: "1", text: "quero", media: "M1" }));
    expect(t.kv.puts).toHaveLength(0); // A é a padrão: o direct dela cai em A sem estado
    await processWebhookPayload(t.env, commentPayload({ id: "c2", from: "2", text: "quero", media: "M2" }));
    expect(t.kv.puts).toEqual(["u:2"]); // B não é a padrão: precisa lembrar
  });

  it("uma gravação de estado por pessoa entregue", async () => {
    const t = setup({ campaigns: [campaign({ isDefault: true })] });
    t.graph.following.add("5");
    const { dmPayload } = await import("./helpers");
    await processWebhookPayload(t.env, dmPayload({ from: "5", text: "oi" }));
    expect(t.kv.puts).toEqual(["u:5"]);
  });
});

describe("custo: métricas em buffer", () => {
  it(`só escreve no KV a cada ${FLUSH_EVERY} interações`, async () => {
    const t = setup({ campaigns: [campaign({ isDefault: true })] });
    for (let i = 0; i < FLUSH_EVERY - 1; i++) {
      await processWebhookPayload(t.env, commentPayload({ id: `cm${i}`, from: `${i}`, text: "quero" }));
      await flushMetrics(t.env);
    }
    expect(t.kv.puts.filter((k) => k === "metrics")).toHaveLength(0);
    await processWebhookPayload(t.env, commentPayload({ id: "cmX", from: "999", text: "quero" }));
    await flushMetrics(t.env);
    expect(t.kv.puts.filter((k) => k === "metrics")).toHaveLength(1);
    const c = t.kv.json("metrics").counters;
    expect(c.comments).toBe(FLUSH_EVERY);
    expect(c.dms).toBe(FLUSH_EVERY);
  });

  it("ou a cada 5 minutos, mesmo com poucas interações", async () => {
    const t = setup({ campaigns: [campaign({ isDefault: true })] });
    await processWebhookPayload(t.env, commentPayload({ id: "cm1", from: "1", text: "quero" }));
    await flushMetrics(t.env);
    expect(t.kv.puts.filter((k) => k === "metrics")).toHaveLength(0);
    advance(5 * MIN + 1);
    await flushMetrics(t.env);
    expect(t.kv.puts.filter((k) => k === "metrics")).toHaveLength(1);
  });

  it("os números acumulam entre flushes", async () => {
    const t = setup();
    inc("comments", 3);
    touch();
    await flushMetrics(t.env, true);
    inc("comments", 2);
    touch();
    await flushMetrics(t.env, true);
    expect(t.kv.json("metrics").counters.comments).toBe(5);
  });

  it("sem nada novo no buffer, não escreve", async () => {
    const t = setup();
    await flushMetrics(t.env, true);
    expect(t.kv.puts).toHaveLength(0);
  });
});
