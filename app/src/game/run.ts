// 미션 한 판의 상태. 화면(창)과 떨어져 있어서 창을 닫았다 열어도 남는다
import { useSyncExternalStore } from 'react'
import type { Llm } from '../engine/llm'
import { ALARM_AT } from '../engine/rules'
import { ScriptedSession } from '../engine/scripted'
import { Session, type Talker } from '../engine/session'
import type { FactSpec, InferenceSpec, Scenario, TurnResult } from '../engine/types'
import { gradeOf, score, type Grade } from './grade'

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

/** 화면 위에 잠깐 뜨는 알림 */
export interface Notice {
  id: number
  kind: 'clue' | 'fact' | 'inference' | 'hint' | 'warn'
  title: string
  text: string
}
export const NOTICE_MS = 4000

export interface Link {
  a: string
  b: string
}

/** 보드에서 두 카드를 이은 결과 */
export type LinkResult = { ok: false; reason: 'wrong' | 'dup' | 'self' } | { ok: true; made: InferenceSpec[] }

export class MissionRun {
  readonly scenario: Scenario
  readonly session: Talker
  readonly startedAt = Date.now()
  /** 클리어한 시각 (결과 화면의 걸린 시간) */
  clearedAt: number | null = null
  cards: Card[] = []
  links: Link[] = []
  wrongLinks = 0
  /** 보드 카드 위치 */
  positions: Record<string, { x: number; y: number }> = {}
  chat: ChatMsg[] = []
  loginFails = 0
  retries = 0
  status: RunStatus = 'playing'
  busy = false
  notices: Notice[] = []
  /** 보드에서 아직 보지 않은 카드 수 */
  unseen = 0
  private nextMsg = 0
  private nextNotice = 0
  private version = 0
  private listeners = new Set<() => void>()

  constructor(scenario: Scenario, llm: Llm) {
    this.scenario = scenario
    this.session = scenario.script ? new ScriptedSession(scenario) : new Session(scenario, llm)
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
    this.unseen++
    const title = card.kind === 'clue' ? '단서 수집' : card.kind === 'fact' ? '대화에서 단서 발견' : '추론 완성'
    this.notify(card.kind, title, card.label)
    return true
  }

  notify(kind: Notice['kind'], title: string, text: string) {
    const n = { id: this.nextNotice++, kind, title, text }
    this.notices = [...this.notices, n]
    setTimeout(() => this.dismiss(n.id), NOTICE_MS)
  }

  dismiss(id: number) {
    if (!this.notices.some((n) => n.id === id)) return
    this.notices = this.notices.filter((n) => n.id !== id)
    this.emit()
  }

  /** 보드를 열어 봤을 때 */
  markSeen() {
    if (!this.unseen) return
    this.unseen = 0
    this.emit()
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
      const leverageCards = this.scenario.inferences
        .filter((i) => i.leverage && this.hasCard(i.id))
        .map((i) => ({ id: i.id, label: i.label }))
      const before = this.suspicion
      const r = await this.session.turn(text, { leverageCards })
      if (before < ALARM_AT && r.state.suspicion >= ALARM_AT && !r.gameOver)
        this.notify('warn', '경계 위험', `${this.scenario.npc.name}이(가) 의심하기 시작했습니다`)
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
      this.clearedAt = Date.now()
      this.emit()
      return true
    }
    this.loginFails++
    this.notify('warn', '접속 거부', `보안 경계 +${LOGIN_FAIL_SUSPICION}`)
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

  /** 두 카드를 잇는다. 같은 추론의 재료끼리만 이어진다 (§6.2) */
  link(a: string, b: string): LinkResult {
    if (a === b) return { ok: false, reason: 'self' }
    if (this.links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a))) return { ok: false, reason: 'dup' }
    const related = this.scenario.inferences.some((i) => i.requires.includes(a) && i.requires.includes(b))
    // 추론 카드와 그 재료를 잇는 것도 허용 (이미 만든 추론을 다시 확인할 때)
    const ownMaterial = this.scenario.inferences.some(
      (i) => (i.id === a && i.requires.includes(b)) || (i.id === b && i.requires.includes(a)),
    )
    if (!related && !ownMaterial) {
      this.wrongLinks++
      this.emit()
      return { ok: false, reason: 'wrong' }
    }
    this.links = [...this.links, { a, b }]
    const made = this.resolveInferences()
    this.emit()
    return { ok: true, made }
  }

  unlink(a: string, b: string) {
    this.links = this.links.filter((l) => !((l.a === a && l.b === b) || (l.a === b && l.b === a)))
    this.emit()
  }

  setPosition(id: string, pos: { x: number; y: number }) {
    this.positions = { ...this.positions, [id]: pos }
  }

  /** 재료가 모두 같은 덩어리로 이어진 추론을 만든다. 새로 만든 추론 카드도 재료가 될 수 있어 반복 */
  private resolveInferences(): InferenceSpec[] {
    const made: InferenceSpec[] = []
    let grew = true
    while (grew) {
      grew = false
      for (const inf of this.scenario.inferences) {
        if (this.hasCard(inf.id) || !inf.requires.every((r) => this.hasCard(r))) continue
        if (!this.connected(inf.requires)) continue
        this.addCard({ id: inf.id, kind: 'inference', label: inf.label, text: inf.yields })
        // 새 추론 카드를 재료와 이어 둔다 (보드에 선으로 보이게)
        for (const r of inf.requires) this.links = [...this.links, { a: r, b: inf.id }]
        made.push(inf)
        if (inf.unlocks?.length) this.notify('hint', '로그인 힌트 열림', '사내망 접속 화면에서 확인하세요')
        grew = true
      }
    }
    return made
  }

  /** ids가 모두 선으로 한 덩어리인가 */
  private connected(ids: string[]): boolean {
    const adj = new Map<string, string[]>()
    for (const { a, b } of this.links) {
      adj.set(a, [...(adj.get(a) ?? []), b])
      adj.set(b, [...(adj.get(b) ?? []), a])
    }
    const seen = new Set([ids[0]])
    const stack = [ids[0]]
    while (stack.length) {
      for (const n of adj.get(stack.pop()!) ?? []) {
        if (seen.has(n)) continue
        seen.add(n)
        stack.push(n)
      }
    }
    return ids.every((id) => seen.has(id))
  }

  /** 등급 점수 (§6.5) */
  get score(): number {
    return score({
      maxSuspicion: this.session.state.maxSuspicion,
      loginFails: this.loginFails,
      wrongLinks: this.wrongLinks,
      retries: this.retries,
    })
  }

  get grade(): Grade {
    return gradeOf(this.score)
  }

  /** 튜토리얼 안내: 단계마다 끝났는지 */
  get guide(): { text: string; done: boolean }[] {
    return (this.scenario.guide ?? []).map((g) => ({
      text: g.text,
      done: g.login ? this.status === 'cleared' : (g.cards ?? []).every((id) => this.hasCard(id)),
    }))
  }

  /** 비밀번호 조합 규칙(final 추론)을 완성했나 */
  get solved() {
    return this.scenario.inferences.some((i) => i.final && this.hasCard(i.id))
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
