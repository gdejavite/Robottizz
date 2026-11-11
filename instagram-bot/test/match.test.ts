import { describe, expect, it } from "vitest";
import {
  containsKeyword,
  fillTemplate,
  implicitDefault,
  matchCommentCampaign,
  needsState,
  pickVariation,
  resolveDmCampaign,
} from "../src/match";
import { campaign } from "./helpers";

describe("casamento de palavra-chave (limite de palavra)", () => {
  it('"01" NÃO casa em "2016", mas casa em "quero o 01!"', () => {
    expect(containsKeyword("ano de 2016", "01")).toBe(false);
    expect(containsKeyword("quero o 01!", "01")).toBe(true);
    expect(containsKeyword("01", "01")).toBe(true);
  });
  it('"DM" NÃO casa em "admin", mas casa em "dm", "DM!" e "#dm"', () => {
    expect(containsKeyword("sou admin do grupo", "DM")).toBe(false);
    expect(containsKeyword("me manda DM", "DM")).toBe(true);
    expect(containsKeyword("DM!!!", "dm")).toBe(true);
    expect(containsKeyword("#dm", "dm")).toBe(true);
  });
  it("ignora maiúsculas e acentos", () => {
    expect(containsKeyword("QUÉRO muito", "quero")).toBe(true);
    expect(containsKeyword("quero", "QUÉRO")).toBe(true);
  });
  it("palavra colada em outras não casa", () => {
    expect(containsKeyword("eu queroo", "quero")).toBe(false);
    expect(containsKeyword("superquero", "quero")).toBe(false);
  });
  it("aceita frases com espaços e emoji", () => {
    expect(containsKeyword("eu quero   o guia", "quero o guia")).toBe(true);
    expect(containsKeyword("🔥 sim 🔥", "🔥")).toBe(true);
  });
  it("caracteres especiais de regex na palavra são tratados como texto", () => {
    expect(containsKeyword("quero (a)", "(a)")).toBe(true);
    expect(containsKeyword("abc", "a.c")).toBe(false);
  });
  it("palavra-chave vazia nunca casa", () => {
    expect(containsKeyword("qualquer coisa", "")).toBe(false);
    expect(containsKeyword("qualquer coisa", "   ")).toBe(false);
  });
});

describe("roteamento por post", () => {
  const a = campaign({ id: "A", mediaId: "M1", keywords: ["quero"] });
  const b = campaign({ id: "B", mediaId: "M2", keywords: ["quero"] });
  const generic = campaign({ id: "G", mediaId: "", keywords: ["guia"] });
  const cfg = { paused: false, campaigns: [a, b, generic] };

  it("a mesma palavra em posts diferentes entrega a campanha do post do comentário", () => {
    expect(matchCommentCampaign(cfg, "quero", "M1")?.id).toBe("A");
    expect(matchCommentCampaign(cfg, "quero", "M2")?.id).toBe("B");
  });
  it("campanha amarrada a um post não dispara em outro post", () => {
    expect(matchCommentCampaign(cfg, "quero", "OUTRO")).toBeNull();
  });
  it("campanha sem post vale para qualquer post", () => {
    expect(matchCommentCampaign(cfg, "o guia por favor", "QUALQUER")?.id).toBe("G");
  });
  it("campanha desativada é ignorada", () => {
    const off = { paused: false, campaigns: [{ ...a, active: false }] };
    expect(matchCommentCampaign(off, "quero", "M1")).toBeNull();
  });
});

describe("roteamento do direct", () => {
  const a = campaign({ id: "A", mediaId: "M1", keywords: ["quero"] });
  const b = campaign({ id: "B", mediaId: "M2", keywords: ["quero"] });
  const d = campaign({ id: "D", isDefault: true, keywords: ["padrao"] });
  const cfg = { paused: false, campaigns: [a, b, d] };

  it("sem texto: usa o estado gravado (campanha do post dela)", () => {
    expect(resolveDmCampaign(cfg, "", "B")?.campaign.id).toBe("B");
  });
  it("palavra ambígua em DM: o estado desempata", () => {
    expect(resolveDmCampaign(cfg, "quero", "B")?.campaign.id).toBe("B");
    expect(resolveDmCampaign(cfg, "quero", "A")?.campaign.id).toBe("A");
  });
  it("sem texto e sem estado: campanha padrão", () => {
    expect(resolveDmCampaign(cfg, "oi", undefined)?.campaign.id).toBe("D");
  });
  it("sem padrão e várias campanhas: não responde", () => {
    expect(resolveDmCampaign({ paused: false, campaigns: [a, b] }, "oi", undefined)).toBeNull();
  });
  it("com uma única campanha ativa ela funciona como padrão", () => {
    expect(implicitDefault({ paused: false, campaigns: [a] })?.id).toBe("A");
  });
  it("needsState: só quando o roteamento depende de estado", () => {
    expect(needsState(cfg, d)).toBe(false);
    expect(needsState(cfg, a)).toBe(true);
    expect(needsState({ paused: false, campaigns: [a] }, a)).toBe(false);
  });
});

describe("sorteio e modelos de texto", () => {
  it("sorteia uma linha, ignora linhas vazias", () => {
    const text = "um\n\n  dois  \ntrês";
    expect(pickVariation(text, () => 0)).toBe("um");
    expect(pickVariation(text, () => 0.5)).toBe("dois");
    expect(pickVariation(text, () => 0.999)).toBe("três");
    expect(pickVariation("", () => 0.3)).toBeNull();
  });
  it("{usuario} vira @username", () => {
    expect(fillTemplate("Oi {usuario}, tudo bem?", "ana")).toBe("Oi @ana, tudo bem?");
    expect(fillTemplate("Oi {usuario}!", undefined)).toBe("Oi !");
  });
});
