import type { Env, UserState } from "./types";

const STATE_TTL_S = 30 * 24 * 3600;

export async function getState(env: Env, igsid: string): Promise<UserState | null> {
  return env.KV.get<UserState>(`u:${igsid}`, "json");
}

/** Lê, aplica a mudança e grava. Só chamado quando o roteamento realmente depende do estado. */
export async function updateState(
  env: Env,
  igsid: string,
  mutate: (s: UserState) => void,
  current?: UserState | null,
): Promise<UserState> {
  const state: UserState = current ?? (await getState(env, igsid)) ?? { t: Date.now() };
  mutate(state);
  state.t = Date.now();
  await env.KV.put(`u:${igsid}`, JSON.stringify(state), { expirationTtl: STATE_TTL_S });
  return state;
}
