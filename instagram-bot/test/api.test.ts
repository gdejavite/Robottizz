import { afterEach, describe, expect, it } from "vitest";
import worker from "../src/index";
import { HOUR, MIN, advance, campaign, commentPayload, deliver, setup, teardown, type TestCtx } from "./helpers";
import { processWebhookPayload } from "../src/webhook";

afterEach(teardown);

const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
const KEY = "chave-dos-agentes";

function withKey(t: TestCtx) {
  t.env.AGENT_API_KEY = KEY;
  return t;
}
async function call(t: TestCtx, method: string, path: string, body?: unknown, key = KEY) {
  const res = await worker.fetch(
    new Request("https://x.dev" + path, {
      method,
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "x-agente": "otto" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    t.env,
    ctx,
  );
  return { status: res.status, body: (await res.json()) as any };
}

describe("API de agentes: segurança", () => {
  it("sem AGENT_API_KEY configurada a API fica desligada (503)", async () => {
    const t = setup();
    expect((await call(t, "GET", "/api/v1/status")).status).toBe(503);
  });
  it("chave errada ou ausente -> 401", async () => {
    const t = withKey(setup());
    expect((await call(t, "GET", "/api/v1/status", undefined, "errada")).status).toBe(401);
    const res = await worker.fetch(new Request("https://x.dev/api/v1/status"), t.env, ctx);
    expect(res.status).toBe(401);
  });
  it("a senha do painel NÃO abre a API (chaves separadas)", async () => {
    const t = withKey(setup());
    expect((await call(t, "GET", "/api/v1/status", undefined, "senha-forte")).status).toBe(401);
  });
});

describe("API de agentes: status, métricas e alertas", () => {
  it("status traz campanhas, métricas, fila e nenhum alerta quando está tudo bem", async () => {
    const t = withKey(setup({ campaigns: [campaign({ id: "c1", isDefault: true })] }));
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero" }));
    const { status, body } = await call(t, "GET", "/api/v1/status");
    expect(status).toBe(200);
    expect(body.campanhas[0]).toMatchObject({ id: "c1", ativa: true, padrao: true });
    expect(body.metricas).toMatchObject({ comments: 1, dms: 1 });
    expect(body.fila_retry).toBe(0);
    expect(body.alertas).toEqual([]);
  });

  it("alerta quando pausado, sem campanha ativa e com a renovação do token falhando", async () => {
    const t = withKey(setup({ paused: true, campaigns: [] }));
    t.kv.store.set("tokenstatus", { value: JSON.stringify({ lastAttemptAt: Date.now(), ok: false, error: "token expirado" }) });
    const codes = (await call(t, "GET", "/api/v1/status")).body.alertas.map((a: any) => a.codigo);
    expect(codes).toEqual(expect.arrayContaining(["automacao_pausada", "sem_campanha_ativa", "token_renovacao_falhou"]));
  });

  it("alerta de token perto de expirar (renovado há mais de 45 dias)", async () => {
    const t = withKey(setup({ campaigns: [campaign({ isDefault: true })] }));
    t.kv.store.set("token", { value: JSON.stringify({ token: "X", base: "ACCESS_ORIGINAL", refreshedAt: Date.now() - 46 * 24 * HOUR }) });
    const a = (await call(t, "GET", "/api/v1/status")).body.alertas;
    expect(a.map((x: any) => x.codigo)).toContain("token_perto_de_expirar");
    expect(a.find((x: any) => x.codigo === "token_perto_de_expirar").agente).toBe("alex");
  });

  it("alerta de plano B em massa quando a fila passa de 50", async () => {
    const t = withKey(setup({ campaigns: [campaign({ isDefault: true })] }));
    t.graph.blockPrivateReplies = true;
    for (let i = 0; i < 50; i++) await processWebhookPayload(t.env, commentPayload({ id: `cm${i}`, from: `${i}`, text: "quero" }));
    const a = (await call(t, "GET", "/api/v1/status")).body;
    expect(a.fila_retry).toBe(50);
    expect(a.alertas.map((x: any) => x.codigo)).toContain("plano_b_em_massa");
  });

  it("health testa o token ao vivo na Meta", async () => {
    const t = withKey(setup());
    expect((await call(t, "GET", "/api/v1/health")).body).toMatchObject({ ok: true, conta: "minhaloja" });
  });

  it("metrics devolve os contadores", async () => {
    const t = withKey(setup({ campaigns: [campaign({ isDefault: true })] }));
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero" }));
    expect((await call(t, "GET", "/api/v1/metrics")).body.contadores.comments).toBe(1);
  });
});

describe("API de agentes: campanhas", () => {
  it("cria campanha com nomes em português, vinculando o Reel pelo link", async () => {
    const t = withKey(setup());
    const { status, body } = await call(t, "POST", "/api/v1/campaigns", {
      nome: "Reel ROBÔ",
      palavras: "robô, robo",
      reel_url: "https://www.instagram.com/reel/BBB222/",
      intro: "Oi {usuario}! Responde aqui.",
      pedido_follow: "Segue o perfil!",
      entrega: "Link: https://x.com",
      aviso_publico: ["Me chama no direct!", "Direct liberado, manda ROBÔ!"],
    });
    expect(status).toBe(201);
    expect(body.campanha).toMatchObject({ name: "Reel ROBÔ", keywords: ["robô", "robo"], mediaId: "9002", active: true });
    expect(body.campanha.publicNotice).toBe("Me chama no direct!\nDirect liberado, manda ROBÔ!");

    // vale na hora: comentário naquele Reel dispara a intro nova
    await processWebhookPayload(t.env, commentPayload({ id: "cm1", from: "100", text: "ROBO", media: "9002", username: "ana" }));
    expect(t.graph.privateReplies[0].body.message.text).toBe("Oi @ana! Responde aqui.");
  });

  it("campanha sem mensagens recebe os textos padrão", async () => {
    const t = withKey(setup());
    const { body } = await call(t, "POST", "/api/v1/campaigns", { nome: "Simples", palavras: ["guia"] });
    expect(body.campanha.introMessage.length).toBeGreaterThan(10);
    expect(body.campanha.publicNotice.split("\n").length).toBeGreaterThan(1);
  });

  it("recusa campanha ativa sem palavra-chave e link de Reel que não é da conta", async () => {
    const t = withKey(setup());
    expect((await call(t, "POST", "/api/v1/campaigns", { nome: "Sem palavra" })).status).toBe(400);
    const r = await call(t, "POST", "/api/v1/campaigns", { nome: "X", palavras: ["a"], reel_url: "https://www.instagram.com/reel/NAOEXISTE/" });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/Não achei/);
  });

  it("altera mensagem, desativa, reativa e exclui; tudo vai para a auditoria com o nome do agente", async () => {
    const t = withKey(setup({ campaigns: [campaign({ id: "c1", isDefault: true })] }));
    expect((await call(t, "PATCH", "/api/v1/campaigns/c1", { entrega: "NOVA ENTREGA" })).body.campanha.deliveryMessage).toBe("NOVA ENTREGA");
    expect((await call(t, "PATCH", "/api/v1/campaigns/c1", { ativa: false })).body.campanha.active).toBe(false);
    expect((await call(t, "PATCH", "/api/v1/campaigns/c1", { ativa: true })).body.campanha.active).toBe(true);
    expect((await call(t, "PATCH", "/api/v1/campaigns/zzz", { ativa: true })).status).toBe(404);
    expect((await call(t, "DELETE", "/api/v1/campaigns/c1")).status).toBe(200);
    const reg = (await call(t, "GET", "/api/v1/audit")).body.registros;
    expect(reg.map((r: any) => r.acao)).toEqual(["campanha_excluida", "campanha_alterada", "campanha_alterada", "campanha_alterada"]);
    expect(reg[0].agente).toBe("otto");
  });

  it("marcar uma campanha como padrão desmarca as outras", async () => {
    const t = withKey(setup({ campaigns: [campaign({ id: "a", isDefault: true }), campaign({ id: "b", keywords: ["x"] })] }));
    await call(t, "PATCH", "/api/v1/campaigns/b", { padrao: true });
    const c = (await call(t, "GET", "/api/v1/campaigns")).body.campanhas;
    expect(c.find((x: any) => x.id === "a").isDefault).toBe(false);
    expect(c.find((x: any) => x.id === "b").isDefault).toBe(true);
  });
});

describe("API de agentes: contrato com a torre (n8n)", () => {
  const torreParams = {
    nome: "ROBÔ (todos os posts)",
    palavras: ["robô", "robo"],
    padrao: true,
    intro: "Oi {usuario}! Me responde aqui.",
    pedido_follow: "Segue o perfil!",
    entrega: "Link na bio.\n\nAviso: resultados passados não garantem resultados futuros.",
    aviso_publico: ["A {usuario}", "B {usuario}", "C {usuario}", "D {usuario}", "E {usuario}", "F {usuario}"],
  };

  it("igbot_campanha_criar: cria a campanha padrão ROBÔ que responde em qualquer post", async () => {
    const t = withKey(setup());
    expect((await call(t, "POST", "/api/v1/campaigns", torreParams)).status).toBe(201);
    await processWebhookPayload(t.env, commentPayload({ id: "cm1", from: "100", text: "ROBÔ!", media: "QUALQUER" }));
    expect(t.graph.privateReplies).toHaveLength(1);
  });

  it("aprovação executada 2 vezes NÃO duplica a campanha (atualiza a existente)", async () => {
    const t = withKey(setup());
    await call(t, "POST", "/api/v1/campaigns", torreParams);
    const again = await call(t, "POST", "/api/v1/campaigns", { ...torreParams, entrega: "ENTREGA V2" });
    expect(again.status).toBe(200);
    const list = (await call(t, "GET", "/api/v1/campaigns")).body.campanhas;
    expect(list).toHaveLength(1);
    expect(list[0].deliveryMessage).toBe("ENTREGA V2");
  });

  it("igbot_campanha_alterar: altera pelo NOME da campanha (sem precisar do id), ignorando acento e maiúscula", async () => {
    const t = withKey(setup());
    await call(t, "POST", "/api/v1/campaigns", torreParams);
    const r = await call(t, "PATCH", "/api/v1/campaigns", { campanha: "robo (todos os posts)", aviso_publico: ["X", "Y"] });
    expect(r.status).toBe(200);
    expect(r.body.campanha.publicNotice).toBe("X\nY");
    expect((await call(t, "PATCH", "/api/v1/campaigns", { campanha: "não existe", ativa: false })).status).toBe(404);
  });
});

describe("API de agentes: operações", () => {
  it("pausar e reativar", async () => {
    const t = withKey(setup({ campaigns: [campaign({ isDefault: true })] }));
    expect((await call(t, "POST", "/api/v1/pause")).body.pausado).toBe(true);
    await processWebhookPayload(t.env, commentPayload({ id: "cm1", from: "100", text: "quero" }));
    expect(t.graph.calls).toHaveLength(0);
    expect((await call(t, "POST", "/api/v1/resume")).body.pausado).toBe(false);
    await processWebhookPayload(t.env, commentPayload({ id: "cm2", from: "101", text: "quero" }));
    expect(t.graph.privateReplies).toHaveLength(1);
  });

  it("renovar o token sob demanda", async () => {
    const t = withKey(setup());
    expect((await call(t, "POST", "/api/v1/token/refresh")).status).toBe(200);
    expect(t.kv.json("token").token).toBe("NOVO_TOKEN");
    t.graph.refresh = { ok: false };
    const r = await call(t, "POST", "/api/v1/token/refresh");
    expect(r.status).toBe(502);
  });

  it("rodar a fila de retry sob demanda", async () => {
    const t = withKey(setup({ campaigns: [campaign({ isDefault: true })] }));
    t.graph.blockPrivateReplies = true;
    await processWebhookPayload(t.env, commentPayload({ id: "cm1", from: "100", text: "quero" }));
    t.graph.blockPrivateReplies = false;
    advance(16 * MIN);
    expect((await call(t, "POST", "/api/v1/retry/run")).body).toMatchObject({ ok: true, tentadas: 1, fila_restante: 0 });
  });

  it("rota desconhecida -> 404 apontando o manual", async () => {
    const t = withKey(setup());
    expect((await call(t, "GET", "/api/v1/xyz")).body.error).toMatch(/AGENTES\.md/);
  });
});
