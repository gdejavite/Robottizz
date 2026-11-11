import type { Campaign, Config } from "./types";

/** minúsculas + sem acentos, para "Quero" casar com "quéro". */
export function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

const regexCache = new Map<string, RegExp>();

function keywordRegex(keyword: string): RegExp | null {
  const k = normalize(keyword).trim().replace(/\s+/g, " ");
  if (!k) return null;
  let re = regexCache.get(k);
  if (!re) {
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
    // Limite de palavra: o caractere antes/depois NÃO pode ser letra ou número.
    // Assim "01" não casa em "2016" e "dm" não casa em "admin".
    re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u");
    regexCache.set(k, re);
  }
  return re;
}

/** Casa por palavra inteira, nunca por pedaço de palavra. */
export function containsKeyword(text: string, keyword: string): boolean {
  const re = keywordRegex(keyword);
  return re ? re.test(normalize(text)) : false;
}

export function campaignMatches(c: Campaign, text: string): boolean {
  return c.active && c.keywords.some((k) => containsKeyword(text, k));
}

/**
 * Roteamento de COMENTÁRIO: o post do comentário decide.
 * 1º campanha amarrada àquele post; 2º campanha sem post (vale para qualquer um).
 */
export function matchCommentCampaign(config: Config, text: string, mediaId: string | undefined): Campaign | null {
  const matches = config.campaigns.filter((c) => campaignMatches(c, text));
  if (mediaId) {
    const exact = matches.find((c) => c.mediaId && c.mediaId === mediaId);
    if (exact) return exact;
  }
  return matches.find((c) => !c.mediaId) ?? null;
}

/**
 * Campanha que atende quem manda direct sem palavra nenhuma:
 * a marcada como padrão; se não houver, a única campanha ativa.
 */
export function implicitDefault(config: Config): Campaign | null {
  const active = config.campaigns.filter((c) => c.active);
  const explicit = active.find((c) => c.isDefault);
  if (explicit) return explicit;
  return active.length === 1 ? active[0] : null;
}

/** O roteamento da campanha depende de estado gravado? (Se não, não gravamos nada.) */
export function needsState(config: Config, campaign: Campaign): boolean {
  return implicitDefault(config)?.id !== campaign.id;
}

export interface DmRoute {
  campaign: Campaign;
  /** A pessoa digitou uma palavra-chave (vs. rota por estado/padrão). */
  viaKeyword: boolean;
}

/** Roteamento de DIRECT: palavra digitada > estado gravado > campanha padrão. */
export function resolveDmCampaign(
  config: Config,
  text: string,
  pointerCampaignId: string | undefined,
): DmRoute | null {
  const matches = config.campaigns.filter((c) => campaignMatches(c, text));
  if (matches.length) {
    const campaign =
      matches.find((c) => c.id === pointerCampaignId) ?? matches.find((c) => !c.mediaId) ?? matches[0];
    return { campaign, viaKeyword: true };
  }
  const pointed = pointerCampaignId ? config.campaigns.find((c) => c.id === pointerCampaignId && c.active) : undefined;
  if (pointed) return { campaign: pointed, viaKeyword: false };
  const fallback = implicitDefault(config);
  return fallback ? { campaign: fallback, viaKeyword: false } : null;
}

/** Sorteia uma variação (uma por linha) do aviso público. */
export function pickVariation(text: string, rand: () => number = Math.random): string | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  return lines[Math.min(lines.length - 1, Math.floor(rand() * lines.length))];
}

/** Troca {usuario} por @username. */
export function fillTemplate(text: string, username?: string): string {
  return text.replace(/\{usuario\}/gi, username ? `@${username}` : "").replace(/[ \t]{2,}/g, " ").trim();
}
