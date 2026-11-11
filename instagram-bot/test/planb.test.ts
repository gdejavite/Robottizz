import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MIN, advance, campaign, commentPayload, deliver, dmPayload, setup, teardown, type TestCtx } from "./helpers";
import { processRetryQueue, PRIVATE_REPLY_WINDOW_MS } from "../src/retry";
import { flushMetrics } from "../src/metrics";

let t: TestCtx;
afterEach(() => {
  vi.restoreAllMocks();
  teardown();
});

const VARIATIONS = ["Aviso A {usuario}", "Aviso B {usuario}", "Aviso C {usuario}"];

function twoPosts() {
  return setup({
    campaigns: [
      campaign({
        id: "A",
        mediaId: "M1",
        keywords: ["quero"],
        deliveryMessage: "ENTREGA DO POST A",
        introMessage: "INTRO A",
        publicNotice: VARIATIONS.join("\n"),
      }),
      campaign({
        id: "B",
        mediaId: "M2",
        keywords: ["quero"],
        deliveryMessage: "ENTREGA DO POST B",
        introMessage: "INTRO B",
        publicNotice: VARIATIONS.join("\n"),
      }),
    ],
  });
}

describe("PLANO B: Meta devolve o subcódigo 2534025", () => {
  beforeEach(() => {
    t = twoPosts();
    t.graph.blockPrivateReplies = true;
  });

  it("a) grava o estado apontando para a campanha CERTA (a do post do comentário)", async () => {
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero", media: "M2" }));
    expect(t.kv.json("u:100").c).toBe("B");
    await deliver(t.env, commentPayload({ id: "cm2", from: "101", text: "quero", media: "M1" }));
    expect(t.kv.json("u:101").c).toBe("A");
  });

  it("b) responde PUBLICAMENTE no próprio comentário, DEPOIS de tentar a private reply", async () => {
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero", media: "M1", username: "bia" }));
    const order = t.graph.calls.map((c) => (c.body?.recipient?.comment_id ? "private" : c.path.endsWith("/replies") ? "public" : "other"));
    expect(order).toEqual(["private", "public"]); // private reply SEMPRE antes de qualquer comentário público
    const pub = t.graph.publicReplies[0];
    expect(pub.path).toBe("/cm1/replies");
    expect(pub.body.message).toMatch(/^Aviso [ABC] @bia$/);
  });

  it("c) sorteia o aviso entre as variações (uma por linha) — não repete sempre a mesma frase", async () => {
    const picks = [0, 0.4, 0.9];
    let i = 0;
    vi.spyOn(Math, "random").mockImplementation(() => picks[i++ % picks.length]);
    for (let n = 1; n <= 3; n++) {
      await deliver(t.env, commentPayload({ id: `cm${n}`, from: `10${n}`, text: "quero", media: "M1", username: `u${n}` }));
    }
    const texts = t.graph.publicReplies.map((c) => c.body.message);
    expect(texts).toEqual(["Aviso A @u1", "Aviso B @u2", "Aviso C @u3"]);
  });

  it("d) joga o caso na fila do KV para re-tentar por cron", async () => {
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero", media: "M2", username: "caio" }));
    const item = t.kv.json("q:cm1");
    expect(item).toMatchObject({ commentId: "cm1", igsid: "100", campaignId: "B", username: "caio", attempts: 1 });
    expect(t.kv.store.get("q:cm1")!.expirationTtl).toBeLessThanOrEqual(7 * 24 * 3600); // vale 7 dias
    expect(t.kv.store.get("q:cm1")!.metadata.next).toBe(Date.now() + 15 * MIN);
  });

  it("direct SEM digitar nada (pessoa seguidora) recebe o conteúdo do POST DELA", async () => {
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero", media: "M2" }));
    t.graph.following.add("100");
    advance(2 * MIN);
    await deliver(t.env, dmPayload({ from: "100" })); // sem texto
    expect(t.graph.dms.map((d) => d.body.message.text)).toEqual(["ENTREGA DO POST B"]);
    advance(2 * MIN);
    await deliver(t.env, dmPayload({ from: "101", text: "oi" })); // quem não comentou: nada (várias campanhas, sem padrão)
    expect(t.graph.dms).toHaveLength(1);
  });

  it("direct digitando a palavra de um post com estado do outro respeita o estado", async () => {
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero", media: "M1" }));
    t.graph.following.add("100");
    advance(MIN);
    await deliver(t.env, dmPayload({ from: "100", text: "quero" }));
    expect(t.graph.dms.map((d) => d.body.message.text)).toEqual(["ENTREGA DO POST A"]);
  });

  it("a resposta pública SÓ acontece quando a private reply falha", async () => {
    t.graph.blockPrivateReplies = false;
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero", media: "M1" }));
    expect(t.graph.privateReplies).toHaveLength(1);
    expect(t.graph.publicReplies).toHaveLength(0);
  });

  it("falha na resposta pública não derruba o plano B (estado e fila já estão salvos)", async () => {
    t.graph.failPublicReply = true;
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero", media: "M1" }));
    expect(t.kv.json("u:100").c).toBe("A");
    expect(t.kv.keysWithPrefix("q:")).toEqual(["q:cm1"]);
  });

  it("sem variações cadastradas, o plano B grava estado e fila mas não comenta", async () => {
    const cfg = JSON.parse(t.kv.store.get("config")!.value);
    cfg.campaigns[0].publicNotice = "";
    t.kv.store.set("config", { value: JSON.stringify(cfg) });
    const { resetConfigCache } = await import("../src/config");
    resetConfigCache();
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero", media: "M1" }));
    expect(t.graph.publicReplies).toHaveLength(0);
    expect(t.kv.keysWithPrefix("q:")).toEqual(["q:cm1"]);
  });

  it("métricas do plano B", async () => {
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero", media: "M1" }));
    const m = t.kv.json("metrics").counters;
    expect(m.planB).toBe(1);
    expect(m.publicReplies).toBe(1);
    expect(m.introSent ?? 0).toBe(0);
  });
});

describe("CRON de 15 minutos: re-tentativa da private reply", () => {
  beforeEach(() => {
    t = twoPosts();
    t.graph.blockPrivateReplies = true;
  });

  it("não re-tenta antes da hora; passados 15 min e liberada a Meta, a intro certa é entregue e sai da fila", async () => {
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero", media: "M2", username: "dani" }));
    t.graph.calls.length = 0;
    advance(5 * MIN);
    expect(await processRetryQueue(t.env)).toBe(0);
    expect(t.graph.calls).toHaveLength(0);

    t.graph.blockPrivateReplies = false;
    advance(11 * MIN);
    expect(await processRetryQueue(t.env)).toBe(1);
    expect(t.graph.privateReplies).toHaveLength(1);
    expect(t.graph.privateReplies[0].body).toEqual({ recipient: { comment_id: "cm1" }, message: { text: "INTRO B" } });
    expect(t.graph.publicReplies).toHaveLength(0); // retry nunca comenta em público
    expect(t.kv.keysWithPrefix("q:")).toHaveLength(0);
  });

  it("se a Meta ainda bloqueia, mantém na fila e aumenta as tentativas (sem comentar de novo)", async () => {
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero", media: "M1" }));
    t.graph.calls.length = 0;
    advance(16 * MIN);
    await processRetryQueue(t.env);
    expect(t.graph.privateReplies).toHaveLength(1);
    expect(t.graph.publicReplies).toHaveLength(0);
    expect(t.kv.json("q:cm1").attempts).toBe(2);
    expect(t.kv.store.get("q:cm1")!.metadata.next).toBe(Date.now() + 15 * MIN);
  });

  it("depois de 7 dias descarta o item (a private reply expirou)", async () => {
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero", media: "M1" }));
    advance(PRIVATE_REPLY_WINDOW_MS + MIN);
    t.graph.calls.length = 0;
    await processRetryQueue(t.env);
    expect(t.graph.privateReplies).toHaveLength(0);
    expect(t.kv.keysWithPrefix("q:")).toHaveLength(0);
  });

  it("se a pessoa já chamou no direct e recebeu o conteúdo, a intro atrasada não é enviada", async () => {
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero", media: "M1" }));
    t.graph.following.add("100");
    advance(MIN);
    await deliver(t.env, dmPayload({ from: "100" }));
    expect(t.graph.dms).toHaveLength(1);
    t.graph.blockPrivateReplies = false;
    t.graph.calls.length = 0;
    advance(20 * MIN);
    await processRetryQueue(t.env);
    expect(t.graph.privateReplies).toHaveLength(0);
    expect(t.kv.keysWithPrefix("q:")).toHaveLength(0);
  });

  it("erro permanente no retry (comentário apagado) remove o item", async () => {
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero", media: "M1" }));
    t.graph.blockPrivateReplies = false;
    t.graph.privateReplyPermanentError = true;
    advance(16 * MIN);
    await processRetryQueue(t.env);
    expect(t.kv.keysWithPrefix("q:")).toHaveLength(0);
  });

  it("campanha pausada/desativada: o cron não envia nada", async () => {
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero", media: "M1" }));
    const cfg = JSON.parse(t.kv.store.get("config")!.value);
    cfg.paused = true;
    t.kv.store.set("config", { value: JSON.stringify(cfg) });
    t.graph.blockPrivateReplies = false;
    t.graph.calls.length = 0;
    advance(20 * MIN);
    await processRetryQueue(t.env);
    expect(t.graph.calls).toHaveLength(0);
    expect(t.kv.keysWithPrefix("q:")).toHaveLength(1);
  });

  it("a recuperação aparece nas métricas (DM enviada + retryOk)", async () => {
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero", media: "M1" }));
    t.graph.blockPrivateReplies = false;
    advance(16 * MIN);
    await processRetryQueue(t.env);
    await flushMetrics(t.env, true);
    const m = t.kv.json("metrics").counters;
    expect(m.retryOk).toBe(1);
    expect(m.dms).toBe(1);
  });
});
