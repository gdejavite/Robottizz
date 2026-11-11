import { afterEach, describe, expect, it } from "vitest";
import worker from "../src/index";
import { campaign, commentPayload, deliver, setup, teardown, type TestCtx } from "./helpers";
import { panelHtml } from "../src/panel";
import { parseShortcode } from "../src/admin";
import { sanitizeConfig } from "../src/config";
import { resetConfigCache } from "../src/config";
import { processWebhookPayload } from "../src/webhook";

afterEach(teardown);

const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
const basic = (pw: string) => "Basic " + btoa("admin:" + pw);

function req(t: TestCtx, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return worker.fetch(
    new Request("https://x.dev" + path, {
      method,
      headers: { authorization: basic("senha-forte"), ...(body !== undefined ? { "content-type": "application/json" } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    t.env,
    ctx,
  );
}
const api = { "x-admin": "1" };

describe("painel /admin: autenticação", () => {
  it("sem senha -> 401 com WWW-Authenticate", async () => {
    const t = setup();
    const res = await worker.fetch(new Request("https://x.dev/admin"), t.env, ctx);
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toMatch(/Basic/);
  });
  it("senha errada -> 401; senha certa -> 200 HTML", async () => {
    const t = setup();
    const bad = await worker.fetch(new Request("https://x.dev/admin", { headers: { authorization: basic("errada") } }), t.env, ctx);
    expect(bad.status).toBe(401);
    const ok = await req(t, "GET", "/admin");
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toMatch(/text\/html/);
    expect(ok.headers.get("content-security-policy")).toMatch(/nonce-/);
  });
  it("API também exige senha", async () => {
    const t = setup();
    const res = await worker.fetch(new Request("https://x.dev/admin/api/state"), t.env, ctx);
    expect(res.status).toBe(401);
  });
  it("sem ADMIN_PASSWORD configurada o painel fica fechado (503), nunca aberto", async () => {
    const t = setup();
    t.env.ADMIN_PASSWORD = "";
    const res = await worker.fetch(new Request("https://x.dev/admin", { headers: { authorization: basic("") } }), t.env, ctx);
    expect(res.status).toBe(503);
  });
  it("escritas sem o cabeçalho do painel (CSRF) são bloqueadas", async () => {
    const t = setup();
    const res = await req(t, "PUT", "/admin/api/config", { campaigns: [] });
    expect(res.status).toBe(403);
  });
});

describe("painel /admin: campanhas sem redeploy", () => {
  it("cria campanha nova com palavra-chave e as 4 mensagens; passa a valer na hora", async () => {
    const t = setup();
    const res = await req(t, "PUT", "/admin/api/config", {
      paused: false,
      campaigns: [
        {
          name: "Guia grátis",
          keywords: ["guia", "  quero "],
          introMessage: "Oi! Responda aqui.",
          followMessage: "Segue lá!",
          deliveryMessage: "Seu guia: https://exemplo.com/guia",
          publicNotice: "Me chama no direct!\nManda a palavra no direct!",
        },
      ],
    }, api);
    expect(res.status).toBe(200);
    const saved = t.kv.json("config");
    expect(saved.campaigns[0]).toMatchObject({ name: "Guia grátis", keywords: ["guia", "quero"], active: true });
    expect(saved.campaigns[0].id).toBeTruthy();

    // sem redeploy e sem esperar o cache: o mesmo isolate já enxerga
    await processWebhookPayload(t.env, commentPayload({ id: "cm1", from: "100", text: "GUIA!" }));
    expect(t.graph.privateReplies[0].body.message.text).toBe("Oi! Responda aqui.");
  });

  it("editar a mensagem no painel muda o que o bot envia (após o cache de 5s)", async () => {
    const t = setup({ campaigns: [campaign({ isDefault: true, introMessage: "ANTIGA" })] });
    const state = await (await req(t, "GET", "/admin/api/state")).json<any>();
    state.config.campaigns[0].introMessage = "NOVA";
    await req(t, "PUT", "/admin/api/config", state.config, api);
    resetConfigCache();
    await processWebhookPayload(t.env, commentPayload({ id: "cm1", from: "100", text: "quero" }));
    expect(t.graph.privateReplies[0].body.message.text).toBe("NOVA");
  });

  it("recusa campanha ativa sem palavra-chave ou sem mensagens, com mensagem em português", async () => {
    const t = setup();
    const res = await req(t, "PUT", "/admin/api/config", { campaigns: [{ name: "X", keywords: [], introMessage: "a", followMessage: "b", deliveryMessage: "c" }] }, api);
    expect(res.status).toBe(400);
    expect((await res.json<any>()).error).toMatch(/palavra-chave/);
    const res2 = await req(t, "PUT", "/admin/api/config", { campaigns: [{ name: "Y", keywords: ["a"], introMessage: "", followMessage: "b", deliveryMessage: "c" }] }, api);
    expect(res2.status).toBe(400);
  });

  it("só uma campanha pode ser padrão", () => {
    const base = { keywords: ["a"], introMessage: "i", followMessage: "f", deliveryMessage: "d" };
    const cfg = sanitizeConfig({ campaigns: [{ ...base, name: "1", isDefault: true }, { ...base, name: "2", isDefault: true }] });
    expect(cfg.campaigns.filter((c) => c.isDefault)).toHaveLength(1);
  });

  it("pausar e reativar a automação", async () => {
    const t = setup({ campaigns: [campaign({ isDefault: true })] });
    expect((await (await req(t, "POST", "/admin/api/pause", { paused: true }, api)).json<any>()).paused).toBe(true);
    await processWebhookPayload(t.env, commentPayload({ id: "cm1", from: "100", text: "quero" }));
    expect(t.graph.calls).toHaveLength(0);
    await req(t, "POST", "/admin/api/pause", { paused: false }, api);
    await processWebhookPayload(t.env, commentPayload({ id: "cm2", from: "101", text: "quero" }));
    expect(t.graph.privateReplies).toHaveLength(1);
  });

  it("vincula a campanha a um post colando o link do Reel", async () => {
    const t = setup();
    const res = await req(t, "POST", "/admin/api/media", { url: "https://www.instagram.com/reel/BBB222/?igsh=abc" }, api);
    expect(await res.json<any>()).toMatchObject({ ok: true, mediaId: "9002" });
    const bad = await req(t, "POST", "/admin/api/media", { url: "https://www.instagram.com/reel/NAOEXISTE/" }, api);
    expect(bad.status).toBe(400);
    const invalid = await req(t, "POST", "/admin/api/media", { url: "oi" }, api);
    expect(invalid.status).toBe(400);
  });

  it("parseShortcode entende links de reel, reels, post e com @perfil", () => {
    expect(parseShortcode("https://www.instagram.com/reel/AbC_12-x/")).toBe("AbC_12-x");
    expect(parseShortcode("https://instagram.com/reels/XyZ9/?utm=1")).toBe("XyZ9");
    expect(parseShortcode("https://www.instagram.com/p/POST1/")).toBe("POST1");
    expect(parseShortcode("https://www.instagram.com/meuperfil/reel/RRR3/")).toBe("RRR3");
    expect(parseShortcode("https://exemplo.com")).toBeNull();
  });

  it("campanha vinculada ao post: a mesma palavra entrega o conteúdo do post certo", async () => {
    const t = setup();
    await req(
      t,
      "PUT",
      "/admin/api/config",
      {
        campaigns: [
          { name: "Reel A", keywords: ["quero"], mediaId: "9001", introMessage: "INTRO A", followMessage: "f", deliveryMessage: "d" },
          { name: "Reel B", keywords: ["quero"], mediaId: "9002", introMessage: "INTRO B", followMessage: "f", deliveryMessage: "d" },
        ],
      },
      api,
    );
    await processWebhookPayload(t.env, commentPayload({ id: "cm1", from: "100", text: "quero", media: "9002" }));
    expect(t.graph.privateReplies[0].body.message.text).toBe("INTRO B");
  });

  it("métricas aparecem no painel: comentários, DMs, follows convertidos e entregas", async () => {
    const t = setup({ campaigns: [campaign({ isDefault: true })] });
    await deliver(t.env, commentPayload({ id: "cm1", from: "100", text: "quero" }));
    const state = await (await req(t, "GET", "/admin/api/state")).json<any>();
    expect(state.metrics.counters).toMatchObject({ comments: 1, dms: 1 });
    expect(state.queue).toBe(0);
  });

  it("testar conexão e inscrever webhooks usam a API do Instagram", async () => {
    const t = setup();
    expect((await (await req(t, "POST", "/admin/api/health", undefined, api)).json<any>()).username).toBe("minhaloja");
    const sub = await req(t, "POST", "/admin/api/subscribe", undefined, api);
    expect(sub.status).toBe(200);
    const call = t.graph.calls.find((c) => c.path === "/me/subscribed_apps")!;
    expect(call.query.get("subscribed_fields")).toBe("comments,messages");
  });
});

describe("página do painel", () => {
  it("o JavaScript da página é válido (não quebra no navegador)", () => {
    const html = panelHtml("NONCE");
    const script = html.match(/<script nonce="NONCE">([\s\S]*?)<\/script>/)![1];
    expect(() => new Function(script)).not.toThrow();
  });
  it("tem os campos das 4 mensagens e o botão de vincular o Reel", () => {
    const html = panelHtml("N");
    for (const s of ["Mensagem de intro", "pedindo para seguir", "Mensagem de entrega", "Aviso público", "Vincular ao post", "Pausar automação"]) {
      expect(html).toContain(s);
    }
  });
});
