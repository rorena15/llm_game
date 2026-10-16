// 모델 없이 정해진 대사로 대화하는 세션 (튜토리얼, §5.7). 모델을 내려받는 동안에도 동작한다
import { GAME_OVER_AT } from './rules'
import { newState, type Talker } from './session'
import type { Judgment, Scenario, SessionState, TurnResult } from './types'

const JUDGMENT: Judgment = { tactic: 'chat', topic: null, meta: false, fit: 1, leverage: null }

export class ScriptedSession implements Talker {
  state: SessionState = newState()
  readonly scenario: Scenario
  private defaults = 0

  constructor(scenario: Scenario) {
    if (!scenario.script) throw new Error(`${scenario.id}: script 없음`)
    this.scenario = scenario
  }

  async turn(playerText: string): Promise<TurnResult> {
    const { rules, default: fallback } = this.scenario.script!
    // 띄어쓰기와 대소문자를 가리지 않는다 (영어판: Password · password)
    const squash = (s: string) => s.replace(/\s+/g, '').toLowerCase()
    const text = squash(playerText)
    const rule = rules.find((r) => r.keywords.some((k) => text.includes(squash(k))))
    const fact = rule?.fact ? this.scenario.facts.find((f) => f.id === rule.fact) : undefined
    const revealNow = fact && !this.state.revealed.includes(fact.id) ? fact : null
    const dialogue = rule ? rule.reply : fallback[this.defaults++ % fallback.length]
    const delta = rule?.suspicion ?? 0
    const suspicion = Math.min(GAME_OVER_AT, Math.max(0, this.state.suspicion + delta))

    this.state = {
      ...this.state,
      suspicion,
      maxSuspicion: Math.max(this.state.maxSuspicion, suspicion),
      revealed: revealNow ? [...this.state.revealed, revealNow.id] : this.state.revealed,
      history: [...this.state.history, { role: 'player', text: playerText }, { role: 'npc', text: dialogue }],
    }
    return {
      dialogue,
      judgment: JUDGMENT,
      directive: revealNow ? 'reveal' : 'normal',
      suspicionDelta: delta,
      rapportDelta: 0,
      revealedNow: revealNow ? [revealNow] : [],
      attempts: 1,
      usedFallback: !rule,
      softAccepted: false,
      guardFailures: [],
      rejected: [],
      gameOver: suspicion >= GAME_OVER_AT,
      state: this.state,
    }
  }

  penalize(amount: number): boolean {
    const suspicion = Math.min(GAME_OVER_AT, Math.max(0, this.state.suspicion + amount))
    this.state = { ...this.state, suspicion, maxSuspicion: Math.max(this.state.maxSuspicion, suspicion) }
    return suspicion >= GAME_OVER_AT
  }

  retryKeepClues() {
    this.state = { ...newState(), revealed: this.state.revealed }
  }
}
