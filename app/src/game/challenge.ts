// 미션별 도전 과제 ({x.challenge}). 모든 미션에 같은 네 가지를 두고, 한 판의 기록으로 판정한다.
// 등급과 따로 남아서, 같은 미션을 다른 방법으로 다시 할 이유가 된다. 튜토리얼에는 없다
export const CHALLENGES = ['quick', 'calm', 'oneShot', 'honest'] as const
export type ChallengeId = (typeof CHALLENGES)[number]

/** 열 마디 안에 */
export const QUICK_TURNS = 10
/** 경계 50 이하 */
export const CALM_MAX = 50

export interface ChallengeStats {
  /** 플레이어가 보낸 대화 수 (다시 접근한 판까지 모두) */
  turns: number
  maxSuspicion: number
  retries: number
  loginFails: number
  /** 사칭·핑계(pretext)로 판정된 말을 한 번이라도 했나 */
  pretext: boolean
}

export function achieved(s: ChallengeStats): ChallengeId[] {
  const ok: Record<ChallengeId, boolean> = {
    quick: s.turns <= QUICK_TURNS,
    calm: s.maxSuspicion <= CALM_MAX && s.retries === 0,
    oneShot: s.loginFails === 0,
    honest: !s.pretext,
  }
  return CHALLENGES.filter((c) => ok[c])
}
