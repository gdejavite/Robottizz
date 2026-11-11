import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ACCOUNT_ID,
  HOUR,
  MIN,
  advance,
  campaign,
  commentPayload,
  deliver,
  dmPayload,
  setup,
  teardown,
  type TestCtx,
} from "./helpers";
import { resetConfigCache } from "../src/config";

let t: TestCtx;
afterEach(teardown);

describe("fluxo principal: comentário -> intro -> follow -> entrega", () => {
  beforeEach(() => {
    t = setup({ campaigns: [campaign({ id: "c1", isDefault: true })] });
  });

  it("comentário com a palavra manda UMA private reply e NÃO comenta em público", async () => {
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "Eu quero!", username: "ana" }));
    expect(t.graph.privateReplies).toHaveLength(1);
    const pr = t.graph.privateReplies[0];
    expect(pr.body).toEqual({ recipient: { comment_id: "cm1" }, message: { text: "INTRO @ana" } });
    expect(pr.auth).toBe("Bearer ACCESS_ORIGINAL");
    expect(t.graph.publicReplies).toHaveLength(0);
    expect(t.graph.dms).toHaveLength(0);
  });

  it("usa só a Instagram API with Instagram Login (graph.instagram.com, v23+)", async () => {
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero" }));
    expect(t.graph.calls.length).toBeGreaterThan(0);
    for (const c of t.graph.calls) {
      expect(new URL(c.url).hostname).toBe("graph.instagram.com");
      expect(c.url).toContain("/v23.0/");
    }
  });

  it("comentário sem a palavra (ou com a palavra dentro de outra) não faz nada", async () => {
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "que lindo!" }));
    await deliver(t.env, commentPayload({ id: "cm2", from: "101", text: "queroo demais" }));
    expect(t.graph.calls).toHaveLength(0);
  });

  it("quem NÃO segue recebe o pedido de follow, a cada mensagem, sem limite — e nunca a entrega", async () => {
    for (let i = 0; i < 6; i++) {
      await deliver(t.env, dmPayload({ from: "100", text: "pronto?" }));
      advance(10_000);
    }
    expect(t.graph.followChecks).toHaveLength(6);
    expect(t.graph.dms).toHaveLength(6);
    for (const d of t.graph.dms) expect(d.body.message.text).toBe("SEGUE ai");
    expect(t.graph.dms.some((d) => d.body.message.text === "ENTREGA 1")).toBe(false);
  });

  it("consulta is_user_follow_business no endpoint de informações do usuário", async () => {
    await deliver(t.env, dmPayload({ from: "100", text: "oi" }));
    const check = t.graph.followChecks[0];
    expect(check.path).toBe("/100");
    expect(check.query.get("fields")).toContain("is_user_follow_business");
  });

  it("quem segue recebe a entrega e fica marcado como entregue", async () => {
    t.graph.following.add("100");
    await deliver(t.env, dmPayload({ from: "100", text: "oi" }));
    expect(t.graph.dms).toHaveLength(1);
    expect(t.graph.dms[0].body).toEqual({ recipient: { id: "100" }, message: { text: "ENTREGA 1" } });
    const st = t.kv.json("u:100");
    expect(st.d.c1).toBeGreaterThan(0);
  });

  it("jornada completa: não segue -> pede follow -> passa a seguir -> entrega -> follow convertido", async () => {
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero" }));
    await deliver(t.env, dmPayload({ from: "100", text: "oi" }));
    expect(t.graph.dms.map((d) => d.body.message.text)).toEqual(["SEGUE ai"]);
    t.graph.following.add("100");
    advance(30_000);
    await deliver(t.env, dmPayload({ from: "100", text: "segui!" }));
    expect(t.graph.dms.map((d) => d.body.message.text)).toEqual(["SEGUE ai", "ENTREGA 1"]);
    const m = t.kv.json("metrics").counters;
    expect(m.comments).toBe(1);
    expect(m.introSent).toBe(1);
    expect(m.followAsked).toBe(1);
    expect(m.deliveries).toBe(1);
    expect(m.followsConverted).toBe(1);
    expect(m.dms).toBe(3); // intro + follow + entrega
  });

  it("se não conseguir checar o follow, NÃO entrega (falha fechada)", async () => {
    t.graph.following.add("100");
    t.graph.followCheckFails = true;
    await deliver(t.env, dmPayload({ from: "100", text: "oi" }));
    expect(t.graph.dms).toHaveLength(0);
  });

  it("ignora eco das próprias mensagens, mensagens da própria conta e comentários próprios", async () => {
    await deliver(t.env, dmPayload({ from: "100", text: "x", echo: true }));
    await deliver(t.env, dmPayload({ from: ACCOUNT_ID, text: "x" }));
    await deliver(t.env, commentPayload({ id: "cm9", from: ACCOUNT_ID, text: "quero" }));
    expect(t.graph.calls).toHaveLength(0);
  });

  it("mensagem sem texto (figurinha/foto) também é atendida", async () => {
    t.graph.following.add("100");
    await deliver(t.env, dmPayload({ from: "100" }));
    expect(t.graph.dms[0].body.message.text).toBe("ENTREGA 1");
  });
});

describe("regras da Meta", () => {
  beforeEach(() => {
    t = setup({ campaigns: [campaign({ id: "c1", isDefault: true })] });
  });

  it("resposta a comentário (comentário-filho) é ignorada e nunca entra na fila", async () => {
    await deliver(t.env, commentPayload({ id: "cm2", from: "100", text: "quero", parent: "cm1" }));
    expect(t.graph.calls).toHaveLength(0);
    expect(t.kv.keysWithPrefix("q:")).toHaveLength(0);

    t.graph.blockPrivateReplies = true;
    await deliver(t.env, commentPayload({ id: "cm3", from: "101", text: "quero", parent: "cm1" }));
    expect(t.graph.calls).toHaveLength(0);
    expect(t.kv.keysWithPrefix("q:")).toHaveLength(0);
  });

  it("DM só é enviada em reação a uma mensagem do usuário (nunca por conta própria)", async () => {
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero" }));
    expect(t.graph.dms).toHaveLength(0); // o comentário só dispara a private reply
  });

  it("uma private reply por comentário: o mesmo webhook entregue 2x não duplica", async () => {
    const p = commentPayload({ id: "cm1", from: "100", text: "quero" });
    await deliver(t.env, p);
    await deliver(t.env, p);
    expect(t.graph.privateReplies).toHaveLength(1);
  });

  it("erro permanente (comentário apagado) não vai para a fila nem comenta em público", async () => {
    t.graph.privateReplyPermanentError = true;
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero" }));
    expect(t.graph.publicReplies).toHaveLength(0);
    expect(t.kv.keysWithPrefix("q:")).toHaveLength(0);
  });

  it("erro temporário (HTTP 500) vai para a fila SEM comentário público", async () => {
    t.graph.privateReplyServerError = true;
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero" }));
    expect(t.graph.publicReplies).toHaveLength(0);
    expect(t.kv.keysWithPrefix("q:")).toEqual(["q:cm1"]);
  });

  it("automação pausada: ignora comentários e mensagens", async () => {
    t.kv.store.set("config", { value: JSON.stringify({ paused: true, campaigns: [campaign({ isDefault: true })] }) });
    resetConfigCache();
    t.graph.following.add("100");
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero" }));
    await deliver(t.env, dmPayload({ from: "100", text: "quero" }));
    expect(t.graph.calls).toHaveLength(0);
  });
});

describe("anti-flood", () => {
  beforeEach(() => {
    t = setup({ campaigns: [campaign({ id: "c1", isDefault: true })] });
  });

  it("a mesma pessoa comentando 4 vezes recebe UMA intro", async () => {
    for (let i = 1; i <= 4; i++) {
      await deliver(t.env, commentPayload({ id: `cm${i}`, from: "100", text: "quero" }));
    }
    expect(t.graph.privateReplies).toHaveLength(1);
  });

  it("pessoas diferentes recebem cada uma a sua intro", async () => {
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero" }));
    await deliver(t.env, commentPayload({ id: "cm2", from: "101", text: "quero" }));
    expect(t.graph.privateReplies).toHaveLength(2);
  });

  it("mesma palavra no direct menos de 1h depois da entrega: não reenvia o conteúdo", async () => {
    t.graph.following.add("100");
    await deliver(t.env, dmPayload({ from: "100", text: "quero" }));
    expect(t.graph.dms).toHaveLength(1);
    advance(30 * MIN);
    await deliver(t.env, dmPayload({ from: "100", text: "quero" }));
    expect(t.graph.dms).toHaveLength(1);
  });

  it("depois de 1h, se ela digitar a palavra de novo, o conteúdo é reenviado", async () => {
    t.graph.following.add("100");
    await deliver(t.env, dmPayload({ from: "100", text: "quero" }));
    advance(HOUR + MIN);
    await deliver(t.env, dmPayload({ from: "100", text: "quero" }));
    expect(t.graph.dms).toHaveLength(2);
  });

  it("depois de entregue, conversa solta (sem a palavra) não dispara a entrega de novo", async () => {
    t.graph.following.add("100");
    await deliver(t.env, dmPayload({ from: "100", text: "quero" }));
    advance(5 * HOUR);
    await deliver(t.env, dmPayload({ from: "100", text: "obrigado!" }));
    expect(t.graph.dms).toHaveLength(1);
  });

  it("várias mensagens coladas da mesma pessoa não duplicam a entrega", async () => {
    t.graph.following.add("100");
    await Promise.all([
      deliver(t.env, dmPayload({ from: "100", text: "oi" })),
      deliver(t.env, dmPayload({ from: "100", text: "oi" })),
      deliver(t.env, dmPayload({ from: "100", text: "oi" })),
    ]);
    expect(t.graph.dms).toHaveLength(1);
  });
});

describe("FALLBACK DM-first", () => {
  beforeEach(() => {
    t = setup({
      campaigns: [
        campaign({ id: "A", keywords: ["guia"], deliveryMessage: "ENTREGA A" }),
        campaign({ id: "B", keywords: ["receita"], deliveryMessage: "ENTREGA B" }),
      ],
    });
  });

  it("quem manda a palavra no direct sem nunca ter comentado é atendido do zero", async () => {
    t.graph.following.add("200");
    await deliver(t.env, dmPayload({ from: "200", text: "Quero a RECEITA por favor" }));
    expect(t.graph.privateReplies).toHaveLength(0);
    expect(t.graph.dms.map((d) => d.body.message.text)).toEqual(["ENTREGA B"]);
  });

  it("não seguidor DM-first: pede follow e guarda a campanha; ao seguir e mandar 'pronto' recebe o conteúdo certo", async () => {
    await deliver(t.env, dmPayload({ from: "200", text: "guia" }));
    expect(t.graph.dms.map((d) => d.body.message.text)).toEqual(["SEGUE ai"]);
    t.graph.following.add("200");
    advance(20_000);
    await deliver(t.env, dmPayload({ from: "200", text: "pronto, já segui" }));
    expect(t.graph.dms.map((d) => d.body.message.text)).toEqual(["SEGUE ai", "ENTREGA A"]);
  });

  it("sem palavra, sem estado e sem campanha padrão: fica em silêncio", async () => {
    t.graph.following.add("200");
    await deliver(t.env, dmPayload({ from: "200", text: "oi, tudo bem?" }));
    expect(t.graph.calls).toHaveLength(0);
  });

  it("com campanha padrão marcada, quem manda direct sem palavra recebe a padrão", async () => {
    const cfg = JSON.parse(t.kv.store.get("config")!.value);
    cfg.campaigns[1].isDefault = true;
    t.kv.store.set("config", { value: JSON.stringify(cfg) });
    resetConfigCache();
    t.graph.following.add("200");
    await deliver(t.env, dmPayload({ from: "200", text: "oi" }));
    expect(t.graph.dms.map((d) => d.body.message.text)).toEqual(["ENTREGA B"]);
  });
});
