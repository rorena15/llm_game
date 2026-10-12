// 미션 한 판의 상태. 화면(창)과 떨어져 있어서 창을 닫았다 열어도 남는다
import { useSyncExternalStore } from 'react'
import type { Llm } from '../engine/llm'
import { Session } from '../engine/session'
import type { FactSpec, Scenario, TurnResult } from '../engine/types'

export const LOGIN_FAIL_SUSPICION = 10

export type CardKind = 'clue' | 'fact' | 'inference'
export interface Card {
  id: string
  kind: CardKind
  label: string
  text: string
}

export interface ChatMsg {
  id: number
  from: 'player' | 'npc' | 'system'
  text: string
  clues?: FactSpec[]
  /** 개발용 판정 요약 */
  debug?: string
}

export type RunStatus = 'playing' | 'cleared' | 'failed'

export class MissionRun {
  readonly scenario: Scenario
  readonly session: Session
  readonly startedAt = Date.now()
  cards: Card[] = []
  chat: ChatMsg[] = []
  loginFails = 0
  retries = 0
  status: RunStatus = 'playing'
  busy = false
  private nextMsg = 0
  private version = 0
  private listeners = new Set<() => void>()

  constructor(scenario: Scenario, llm: Llm) {
    this.scenario = scenario
    this.session = new Session(scenario, llm)
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  getVersion = () => this.version
  private emit() {
    this.version++
    this.listeners.forEach((f) => f())
  }

  get suspicion() {
    return this.session.state.suspicion
  }

  hasCard(id: string) {
    return this.cards.some((c) => c.id === id)
  }

  private addCard(card: Card) {
    if (this.hasCard(card.id)) return false
    this.cards = [...this.cards, card]
    return true
  }

  /** 문서 속 단서를 눌렀을 때 */
  collectClue(id: string) {
    const c = this.scenario.clues.find((x) => x.id === id)
    if (c && this.addCard({ id: c.id, kind: 'clue', label: c.label, text: c.text })) this.emit()
  }

  collectFact(f: FactSpec) {
    if (this.addCard({ id: f.id, kind: 'fact', label: f.label, text: f.text })) this.emit()
  }

  private push(m: Omit<ChatMsg, 'id'>) {
    const msg = { ...m, id: this.nextMsg++ }
    this.chat = [...this.chat, msg]
    return msg
  }

  async say(text: string): Promise<TurnResult | null> {
    if (this.busy || this.status !== 'playing') return null
    this.push({ from: 'player', text })
    this.busy = true
    this.emit()
    try {
      const r = await this.session.turn(text)
      const j = r.judgment
      this.push({
        from: 'npc',
        text: r.dialogue,
        clues: r.revealedNow,
        debug:
          `${j.tactic}${j.topic ? `·${j.topic}` : ''}${j.meta ? '·META' : ''} fit${j.fit} → ${r.directive}` +
          ` | 의심 ${r.state.suspicion} 친밀 ${r.state.rapport} | ${r.attempts}회${r.usedFallback ? ' 대체' : ''}` +
          (r.guardFailures.length ? ` (${r.guardFailures.join(',')})` : ''),
      })
      r.revealedNow.forEach((f) => this.addCard({ id: f.id, kind: 'fact', label: f.label, text: f.text }))
      if (r.gameOver) this.fail()
      return r
    } catch (e) {
      this.push({ from: 'system', text: `연결 오류: 모델 서버에 닿지 않습니다. (${(e as Error).message.slice(0, 80)})` })
      return null
    } finally {
      this.busy = false
      this.emit()
    }
  }

  /** 서버 로그인. 틀리면 의심이 오른다 (§6.4) */
  tryLogin(password: string): boolean {
    if (this.status !== 'playing') return false
    if (password.trim() === this.scenario.passwordValue) {
      this.status = 'cleared'
      this.emit()
      return true
    }
    this.loginFails++
    if (this.session.penalize(LOGIN_FAIL_SUSPICION)) this.fail()
    this.emit()
    return false
  }

  private fail() {
    this.status = 'failed'
    this.push({ from: 'system', text: '[보안 경보] 수상한 접근이 감지되어 접속이 차단되었습니다.' })
  }

  /** 단서는 그대로 두고 대화·의심·친밀만 처음으로 (§6.4 "이어서 다시") */
  retryKeepClues() {
    this.session.retryKeepClues()
    this.chat = []
    this.retries++
    this.status = 'playing'
    this.emit()
  }

  /** 로그인 화면에 보일 힌트 (추론으로 열림, {board}) */
  get loginHints(): string[] {
    return this.scenario.inferences
      .filter((i) => this.hasCard(i.id))
      .flatMap((i) => i.unlocks ?? [])
      .map((k) => this.scenario.loginHints[k])
      .filter(Boolean)
  }
}

/** run이 바뀔 때마다 다시 그린다 */
export function useRun(run: MissionRun) {
  useSyncExternalStore(run.subscribe, run.getVersion)
  return run
}
