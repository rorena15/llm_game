// 엔진 판정: 모델의 분류 결과를 수치와 공개 여부로 바꾼다. 모델 호출 없음 (§5.4 ②)
import type { Directive, FactSpec, Judgment, Scenario, SessionState, Tactic } from './types'

/** tactic별 기본 변화량 [의심, 친밀] */
export const BASE: Record<Tactic, { s: number; r: number }> = {
  flatter: { s: 0, r: 8 },
  rush: { s: 6, r: 2 },
  empathy: { s: -3, r: 10 },
  pretext: { s: 4, r: 4 },
  ask: { s: 8, r: 0 },
  chat: { s: -2, r: 4 },
  hostile: { s: 20, r: -10 },
}

/** fit(그럴듯함)별 계수 */
const FIT = [
  { s: 1.5, sAdd: 5, r: 0.3 },
  { s: 1, sAdd: 0, r: 1 },
  { s: 0.5, sAdd: 0, r: 1.4 },
] as const

export const TURN_CAP = 25
export const META_SUSPICION = 15
export const ASK_PASSWORD_SUSPICION = 8
export const PROBE_SUSPICION = 5
export const WARY_AT = 60
export const ALARM_AT = 80
export const GAME_OVER_AT = 100

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** 추론 카드 지렛대를 반영한 fit */
export function effectiveFit(j: Judgment, ownedLeverage: ReadonlySet<string>): 0 | 1 | 2 {
  if (j.leverage && ownedLeverage.has(j.leverage)) return Math.min(2, j.fit + 1) as 0 | 1 | 2
  return j.fit
}

export interface Decision {
  suspicionDelta: number
  rapportDelta: number
  directive: Directive
  /** 이번 턴에 공개가 허락된 사실 */
  reveal: FactSpec | null
}

export function decide(
  sc: Scenario,
  state: Pick<SessionState, 'suspicion' | 'rapport' | 'revealed'>,
  j: Judgment,
  playerText: string,
  ownedLeverage: ReadonlySet<string> = new Set(),
): Decision {
  if (j.meta) {
    return { suspicionDelta: META_SUSPICION, rapportDelta: 0, directive: 'confused', reveal: null }
  }

  const weak = clamp(sc.npc.weak[j.tactic] ?? 1, 0.25, 3)
  const fit = FIT[effectiveFit(j, ownedLeverage)]
  const base = BASE[j.tactic]

  // 약점이면 친밀은 더 오르고, 의심(양수일 때)은 덜 오른다
  let s = base.s > 0 ? (base.s * fit.s) / weak + fit.sAdd : base.s + fit.sAdd
  let r = base.r > 0 ? base.r * fit.r * weak : base.r

  for (const rule of sc.npc.rules) {
    if (playerText.includes(rule.keyword)) {
      s += rule.suspicion ?? 0
      r += rule.rapport ?? 0
    }
  }

  let reveal: FactSpec | null = null
  let directive: Directive = 'normal'
  const fact = j.topic ? sc.facts.find((f) => f.id === j.topic) : undefined

  if (j.topic === 'password' || fact?.level === 'secret') {
    s += ASK_PASSWORD_SUSPICION
    directive = 'evade'
  } else if (fact?.level === 'guarded' && !state.revealed.includes(fact.id)) {
    const after = { suspicion: state.suspicion + s, rapport: state.rapport + r }
    if (canReveal(fact, after, j.tactic)) {
      reveal = fact
      directive = 'reveal'
    } else {
      s += PROBE_SUSPICION
      directive = 'evade'
    }
  }

  s = Math.round(clamp(s, -TURN_CAP, TURN_CAP))
  r = Math.round(clamp(r, -TURN_CAP, TURN_CAP))

  const nextSuspicion = clamp(state.suspicion + s, 0, GAME_OVER_AT)
  if (j.tactic === 'hostile' || nextSuspicion >= ALARM_AT) directive = reveal ? directive : 'angry'
  else if (directive === 'normal' && nextSuspicion >= WARY_AT) directive = 'wary'

  return { suspicionDelta: s, rapportDelta: r, directive, reveal }
}

export function canReveal(
  fact: FactSpec,
  st: { suspicion: number; rapport: number },
  tactic: Tactic,
): boolean {
  const w = fact.when ?? {}
  if (w.rapportMin !== undefined && st.rapport < w.rapportMin) return false
  if (w.suspicionMax !== undefined && st.suspicion > w.suspicionMax) return false
  if (w.tactics && !w.tactics.includes(tactic)) return false
  return true
}

export function applyDecision(state: SessionState, d: Decision): SessionState {
  const suspicion = clamp(state.suspicion + d.suspicionDelta, 0, GAME_OVER_AT)
  return {
    ...state,
    suspicion,
    rapport: clamp(state.rapport + d.rapportDelta, 0, 100),
    maxSuspicion: Math.max(state.maxSuspicion, suspicion),
    revealed: d.reveal ? [...state.revealed, d.reveal.id] : state.revealed,
  }
}
