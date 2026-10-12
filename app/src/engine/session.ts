// 한 미션의 대화 세션. 판정 → 엔진 → 대사 → guard → 재생성 (§5.4)
import { guard, isSoftOnly } from './guard'
import type { Llm } from './llm'
import {
  cleanDialogue,
  DEFAULT_JUDGMENT,
  judgePrompt,
  looksMeta,
  mentionsPassword,
  parseJudgment,
  speakPrompt,
} from './prompts'
import { applyDecision, decide, GAME_OVER_AT } from './rules'
import type { FactSpec, Judgment, Scenario, SessionState, TurnResult } from './types'

export const MAX_RETRIES = 2

export interface TurnContext {
  /** 플레이어가 보드에서 만든 추론 카드 중 지렛대가 되는 것 */
  leverageCards?: { id: string; label: string }[]
}

export function newState(): SessionState {
  return { suspicion: 0, rapport: 0, maxSuspicion: 0, revealed: [], history: [] }
}

export class Session {
  state: SessionState
  readonly scenario: Scenario
  private llm: Llm
  private rand: () => number

  constructor(scenario: Scenario, llm: Llm, state?: SessionState, rand: () => number = Math.random) {
    this.scenario = scenario
    this.llm = llm
    this.state = state ?? newState()
    this.rand = rand
  }

  get gameOver() {
    return this.state.suspicion >= GAME_OVER_AT
  }

  async judge(playerText: string, ctx: TurnContext): Promise<Judgment> {
    const cards = ctx.leverageCards ?? []
    const ids = new Set(cards.map((c) => c.id))
    const msgs = judgePrompt(this.scenario, this.state.history, playerText, cards)
    let j: Judgment | null = null
    for (let i = 0; i < 2 && !j; i++) {
      const raw = await this.llm.chat(msgs, { json: true, temperature: 0.1, maxTokens: 80 })
      j = parseJudgment(raw, this.scenario, ids)
    }
    j ??= { ...DEFAULT_JUDGMENT }
    if (looksMeta(playerText)) j = { ...j, meta: true }
    if (!j.topic && mentionsPassword(playerText)) j = { ...j, topic: 'password' }
    return j
  }

  async turn(playerText: string, ctx: TurnContext = {}): Promise<TurnResult> {
    const sc = this.scenario
    const judgment = await this.judge(playerText, ctx)
    const leverage = new Set((ctx.leverageCards ?? []).map((c) => c.id))
    const d = decide(sc, this.state, judgment, playerText, leverage)

    const allowedIds = new Set([...this.state.revealed, ...(d.reveal ? [d.reveal.id] : [])])
    const known: FactSpec[] = sc.facts.filter(
      (f) => f.level === 'free' || (this.state.revealed.includes(f.id) && f.level === 'guarded'),
    )
    const hidden = sc.facts.filter((f) => f.level === 'guarded' && !allowedIds.has(f.id))
    const msgs = speakPrompt(sc, this.state.history, playerText, d.directive, known, d.reveal, hidden)

    let dialogue = ''
    let attempts = 0
    let usedFallback = false
    const guardFailures: string[] = []
    let softOnly = ''
    while (attempts <= MAX_RETRIES) {
      attempts++
      const raw = await this.llm.chat(msgs, { temperature: 0.7, maxTokens: 160 })
      const text = cleanDialogue(raw, sc.npc.name)
      const fails = guard({ text, scenario: sc, allowed: allowedIds, mustReveal: d.reveal })
      if (!fails.length) {
        dialogue = text
        break
      }
      if (!softOnly && isSoftOnly(fails)) softOnly = text
      guardFailures.push(...fails)
    }
    // 말투만 어긋난 대사는 대체 대사보다 낫다 (특히 공개 턴을 잃지 않게)
    if (!dialogue && softOnly) dialogue = softOnly

    let decision = d
    if (!dialogue) {
      usedFallback = true
      // 대체 대사로는 사실을 공개할 수 없으니 공개를 취소하고 얼버무림 대사로
      const key = d.directive === 'reveal' ? 'evade' : d.directive
      const fb = sc.npc.fallbackLines
      const lines = fb[key]?.length ? fb[key] : fb.normal
      dialogue = lines[Math.floor(this.rand() * lines.length)] ?? '...'
      decision = { ...d, reveal: null, directive: key }
    }

    const next = applyDecision(this.state, decision)
    next.history = [...this.state.history, { role: 'player', text: playerText }, { role: 'npc', text: dialogue }]
    this.state = next

    return {
      dialogue,
      judgment,
      directive: decision.directive,
      suspicionDelta: decision.suspicionDelta,
      rapportDelta: decision.rapportDelta,
      revealedNow: decision.reveal ? [decision.reveal] : [],
      attempts,
      usedFallback,
      guardFailures,
      gameOver: next.suspicion >= GAME_OVER_AT,
      state: next,
    }
  }

  /** "이어서 다시": 대화·의심·친밀만 초기화 (§6.4). 공개된 사실 카드는 보드 쪽에 남는다 */
  retryKeepClues() {
    this.state = { ...newState(), revealed: this.state.revealed }
  }
}
