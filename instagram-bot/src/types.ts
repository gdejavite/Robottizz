/** Variáveis e segredos disponíveis no Worker. */
export interface Env {
  KV: KVNamespace;
  /** Segredos (wrangler secret put) */
  VERIFY_TOKEN: string;
  ACCESS_TOKEN: string;
  ADMIN_PASSWORD: string;
  APP_SECRET: string;
  /** Variável comum (wrangler.toml) */
  GRAPH_VERSION?: string;
}

/** Uma campanha, editável no painel /admin. */
export interface Campaign {
  id: string;
  name: string;
  active: boolean;
  /** Atende quem manda direct sem palavra nenhuma. */
  isDefault: boolean;
  keywords: string[];
  /** Post (Graph media id) ao qual a campanha pertence. Vazio = vale p/ qualquer post. */
  mediaId: string;
  /** Link colado no painel, só para exibição. */
  mediaUrl: string;
  /** 1) Private reply: pede para a pessoa responder no direct. */
  introMessage: string;
  /** 2) Pede para seguir o perfil. */
  followMessage: string;
  /** 3) Conteúdo entregue. */
  deliveryMessage: string;
  /** 4) Aviso público (plano B). Uma variação por linha. */
  publicNotice: string;
}

export interface Config {
  paused: boolean;
  campaigns: Campaign[];
}

/** Estado por pessoa (só gravado quando o roteamento depende dele). */
export interface UserState {
  /** Campanha para onde a próxima mensagem dela deve ser roteada. */
  c?: string;
  /** campaignId -> timestamp (ms) da entrega. */
  d?: Record<string, number>;
  /** campanhas em que já pedimos o follow (para contar "follow convertido"). */
  f?: string[];
  t: number;
}

/** Item da fila de retry de private replies. */
export interface RetryItem {
  commentId: string;
  igsid: string;
  username: string;
  campaignId: string;
  createdAt: number;
  attempts: number;
}

export interface MetricsData {
  since: number;
  updatedAt: number;
  counters: Record<string, number>;
}

export interface TokenRecord {
  token: string;
  /** O ACCESS_TOKEN (secret) que originou este token renovado. */
  base: string;
  refreshedAt: number;
}

export interface TokenStatus {
  lastAttemptAt: number;
  ok: boolean;
  error?: string;
}
