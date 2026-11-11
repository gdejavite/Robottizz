import type { Campaign, Env } from "./types";
import { getGraphCtx, loadConfig } from "./config";
import {
  GraphError,
  getUserInfo,
  sendDm,
  sendPrivateReply,
  sendPublicReply,
  type GraphCtx,
} from "./meta";
import {
  fillTemplate,
  matchCommentCampaign,
  needsState,
  pickVariation,
  resolveDmCampaign,
} from "./match";
import { getState, updateState } from "./state";
import { enqueueRetry } from "./retry";
import { inc, touch } from "./metrics";
import { firstTime, forgetSeen, log } from "./util";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

// ---------------------------------------------------------------------------
// 1) COMENTÁRIO  ->  private reply (intro)
// ---------------------------------------------------------------------------
export async function handleComment(env: Env, accountId: string, v: any): Promise<void> {
  const cfg = await loadConfig(env);
  if (cfg.paused) return;

  const commentId: string | undefined = v?.id;
  const igsid: string | undefined = v?.from?.id;
  const username: string | undefined = v?.from?.username;
  const text = v?.text;
  if (!commentId || !igsid || typeof text !== "string") return;
  if (igsid === accountId) return; // nossos próprios comentários
  if (!firstTime(`cm:${commentId}`, 10 * 60 * 1000)) return; // reentrega do webhook

  inc("comments");
  touch();
  // Resposta a outro comentário é inelegível para private reply, para sempre.
  if (v.parent_id) return;

  const campaign = matchCommentCampaign(cfg, text, v.media?.id);
  if (!campaign) return;
  inc("commentsMatched");
  inc(`c:${campaign.id}:matched`);

  // ANTI-FLOOD: uma intro por pessoa por campanha.
  const floodKey = `intro:${igsid}:${campaign.id}`;
  if (!firstTime(floodKey, DAY)) return;

  const g = await getGraphCtx(env);
  try {
    // A private reply vai ANTES de qualquer comentário público ou curtida.
    await sendPrivateReply(g, commentId, fillTemplate(campaign.introMessage, username));
  } catch (e) {
    await onPrivateReplyFailure(env, g, e, { commentId, igsid, username: username ?? "", campaign, floodKey });
    return;
  }
  inc("dms");
  inc("introSent");
  // Caso comum: nada é gravado. Só grava se o roteamento do direct depender disso.
  if (needsState(cfg, campaign)) {
    await updateState(env, igsid, (s) => {
      s.c = campaign.id;
    });
  }
}

async function onPrivateReplyFailure(
  env: Env,
  g: GraphCtx,
  e: unknown,
  p: { commentId: string; igsid: string; username: string; campaign: Campaign; floodKey: string },
): Promise<void> {
  const kind = e instanceof GraphError ? e.kind : "transient";
  const message = (e as Error).message;

  if (kind === "private_reply_blocked") {
    // ---- PLANO B (subcódigo 2534025: teto de velocidade da Meta) ----
    log("plan_b", { commentId: p.commentId, campaign: p.campaign.id });
    inc("planB");
    // a) estado apontando para a campanha CERTA (direct sem texto = conteúdo do post dela)
    await updateState(env, p.igsid, (s) => {
      s.c = p.campaign.id;
    });
    // d) fila de retry por cron (a private reply continua válida por 7 dias)
    await enqueueRetry(env, {
      commentId: p.commentId,
      igsid: p.igsid,
      username: p.username,
      campaignId: p.campaign.id,
    });
    // b) + c) resposta PÚBLICA, sorteada entre as variações. Só acontece porque a private reply falhou.
    const notice = pickVariation(p.campaign.publicNotice);
    if (notice) {
      try {
        await sendPublicReply(g, p.commentId, fillTemplate(notice, p.username));
        inc("publicReplies");
      } catch (pe) {
        log("public_reply_failed", { commentId: p.commentId, error: (pe as Error).message });
      }
    }
    return;
  }

  if (kind === "transient") {
    // Instabilidade/limite de taxa/token: tenta de novo por cron, sem comentar em público.
    log("private_reply_transient", { commentId: p.commentId, error: message });
    try {
      await enqueueRetry(env, {
        commentId: p.commentId,
        igsid: p.igsid,
        username: p.username,
        campaignId: p.campaign.id,
      });
    } catch (qe) {
      log("enqueue_failed", { error: (qe as Error).message });
    }
    return;
  }

  // permanente (comentário apagado, usuário indisponível...): não adianta repetir.
  log("private_reply_permanent", { commentId: p.commentId, error: message });
  forgetSeen(p.floodKey);
}

// ---------------------------------------------------------------------------
// 2) DIRECT  ->  checa follow  ->  follow ou entrega
// ---------------------------------------------------------------------------
const busy = new Set<string>();

export async function handleMessage(env: Env, accountId: string, ev: any): Promise<void> {
  const cfg = await loadConfig(env);
  if (cfg.paused) return;

  const sender: string | undefined = ev?.sender?.id;
  const msg = ev?.message;
  if (!sender || !msg || msg.is_echo || sender === accountId) return;
  if (msg.mid && !firstTime(`mid:${msg.mid}`, 10 * 60 * 1000)) return;
  if (busy.has(sender)) return; // várias mensagens coladas: processa uma de cada vez
  busy.add(sender);
  touch();
  try {
    await processDirect(env, cfg, sender, typeof msg.text === "string" ? msg.text : "");
  } finally {
    busy.delete(sender);
  }
}

async function processDirect(
  env: Env,
  cfg: Awaited<ReturnType<typeof loadConfig>>,
  sender: string,
  text: string,
): Promise<void> {
  const state = await getState(env, sender);
  const route = resolveDmCampaign(cfg, text, state?.c);
  if (!route) return;
  const { campaign, viaKeyword } = route;

  // ANTI-FLOOD: já entregue -> só reage se ela digitar a palavra, e nunca antes de 1 hora.
  const deliveredAt = state?.d?.[campaign.id];
  if (deliveredAt) {
    if (!viaKeyword) return;
    if (Date.now() - deliveredAt < HOUR) return;
  }

  const g = await getGraphCtx(env);

  let info;
  try {
    info = await getUserInfo(g, sender);
  } catch (e) {
    // Sem saber se segue, NÃO entrega. Na próxima mensagem dela checamos de novo.
    log("follow_check_failed", { sender, error: (e as Error).message });
    return;
  }

  if (info.is_user_follow_business !== true) {
    // NÃO segue (ou o campo não veio): pede o follow. Sem limite de tentativas.
    try {
      await sendDm(g, sender, fillTemplate(campaign.followMessage, info.username));
    } catch (e) {
      log("follow_message_failed", { sender, error: (e as Error).message });
      return;
    }
    inc("dms");
    inc("followAsked");
    if (state?.c !== campaign.id || !state?.f?.includes(campaign.id)) {
      await updateState(
        env,
        sender,
        (s) => {
          s.c = campaign.id;
          s.f = Array.from(new Set([...(s.f ?? []), campaign.id]));
        },
        state,
      );
    }
    return;
  }

  // SEGUE: entrega.
  try {
    await sendDm(g, sender, fillTemplate(campaign.deliveryMessage, info.username));
  } catch (e) {
    log("delivery_failed", { sender, error: (e as Error).message });
    return;
  }
  inc("dms");
  inc("deliveries");
  inc(`c:${campaign.id}:deliveries`);
  if (state?.f?.includes(campaign.id)) inc("followsConverted");
  await updateState(
    env,
    sender,
    (s) => {
      s.c = campaign.id;
      s.d = { ...(s.d ?? {}), [campaign.id]: Date.now() };
      s.f = (s.f ?? []).filter((x) => x !== campaign.id);
    },
    state,
  );
}
