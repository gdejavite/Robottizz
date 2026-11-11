/**
 * Cliente da "Instagram API with Instagram Login" (graph.instagram.com).
 * Nunca usa a variante "with Facebook Login" (graph.facebook.com).
 */

export const DEFAULT_GRAPH_VERSION = "v23.0";
const HOST = "https://graph.instagram.com";

/** Subcódigo da Meta: "invalid for a private reply" = teto de velocidade. */
export const SUBCODE_PRIVATE_REPLY_BLOCKED = 2534025;

export type ErrorKind =
  /** 2534025: aciona o plano B (aviso público + fila de retry). */
  | "private_reply_blocked"
  /** Instabilidade, limite de taxa, token: vale tentar de novo depois. */
  | "transient"
  /** Não adianta repetir (comentário apagado, usuário bloqueou etc.). */
  | "permanent";

export class GraphError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
    readonly subcode?: number,
    readonly isTransient?: boolean,
  ) {
    super(message);
    this.name = "GraphError";
  }

  get kind(): ErrorKind {
    if (this.subcode === SUBCODE_PRIVATE_REPLY_BLOCKED) return "private_reply_blocked";
    if (this.status === 0 || this.status >= 500 || this.status === 429) return "transient";
    if (this.isTransient) return "transient";
    // 1,2 = erro temporário; 4,17,32,613,80xxx = limite de taxa; 190/102 = token (não é culpa da pessoa)
    if (this.code !== undefined && [1, 2, 4, 17, 32, 341, 368, 613, 190, 102].includes(this.code)) {
      return "transient";
    }
    if (this.code !== undefined && this.code >= 80000 && this.code < 80100) return "transient";
    return "permanent";
  }
}

export interface GraphCtx {
  token: string;
  version?: string;
}

function base(ctx: GraphCtx): string {
  return `${HOST}/${ctx.version || DEFAULT_GRAPH_VERSION}`;
}

async function call(
  url: string,
  init: RequestInit,
): Promise<Record<string, any>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    throw new GraphError(`Falha de rede: ${(e as Error).message}`, 0);
  }
  const raw = await res.text();
  let body: any = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = { raw };
  }
  if (!res.ok || body?.error) {
    const err = body?.error ?? {};
    throw new GraphError(
      err.message ?? `HTTP ${res.status}`,
      res.status,
      err.code,
      err.error_subcode,
      err.is_transient,
    );
  }
  return body;
}

function post(ctx: GraphCtx, path: string, body: unknown) {
  return call(`${base(ctx)}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ctx.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function get(ctx: GraphCtx, path: string) {
  return call(`${base(ctx)}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${ctx.token}` },
  });
}

/** PRIVATE REPLY: primeira mensagem, em resposta a um comentário (1 por comentário, vale 7 dias). */
export function sendPrivateReply(ctx: GraphCtx, commentId: string, text: string) {
  return post(ctx, "/me/messages", {
    recipient: { comment_id: commentId },
    message: { text },
  });
}

/** DM comum. Só funciona dentro da janela de 24h após uma mensagem da pessoa. */
export function sendDm(ctx: GraphCtx, igsid: string, text: string) {
  return post(ctx, "/me/messages", {
    recipient: { id: igsid },
    message: { text },
  });
}

/** Resposta pública a um comentário (plano B). */
export function sendPublicReply(ctx: GraphCtx, commentId: string, text: string) {
  return post(ctx, `/${encodeURIComponent(commentId)}/replies`, { message: text });
}

export interface IgUser {
  name?: string;
  username?: string;
  is_user_follow_business?: boolean;
}

/** Informações do usuário, incluindo se ele segue o perfil. */
export async function getUserInfo(ctx: GraphCtx, igsid: string): Promise<IgUser> {
  return (await get(
    ctx,
    `/${encodeURIComponent(igsid)}?fields=name,username,is_user_follow_business`,
  )) as IgUser;
}

export async function getMe(ctx: GraphCtx) {
  return get(ctx, "/me?fields=user_id,username");
}

export async function listMedia(ctx: GraphCtx, after?: string) {
  const cursor = after ? `&after=${encodeURIComponent(after)}` : "";
  return get(ctx, `/me/media?fields=id,shortcode,permalink&limit=50${cursor}`);
}

export function subscribeWebhooks(ctx: GraphCtx) {
  return post(ctx, "/me/subscribed_apps?subscribed_fields=comments,messages", {});
}

/** Renova o token de longa duração (precisa ter mais de 24h e não estar expirado). */
export async function refreshLongLivedToken(token: string): Promise<{ access_token: string; expires_in?: number }> {
  const url = `${HOST}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`;
  const body = await call(url, { method: "GET" });
  if (!body.access_token) throw new GraphError("Resposta sem access_token", 200);
  return body as { access_token: string; expires_in?: number };
}
