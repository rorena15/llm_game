// 대사 검사 (§5.4 ④). 실패 사유 목록을 돌려준다. 빈 배열이면 통과
import type { FactSpec, Scenario, Speech } from './types'

export const MAX_LEN = 220

const HANJA = /[一-鿿㐀-䶿]/
const KANA = /[぀-ヿ]/
/** 영어 낱말 3개 이상 연속 = 영어 문장 */
const ENGLISH_RUN = /[A-Za-z]{2,}[,.!?]?(\s+[A-Za-z]{2,}[,.!?]?){2,}/
/** 같은 낱말이 붙어서 두 번 ("랙 랙의") */
const REPEAT = /(^|\s)([가-힣A-Za-z]{1,})\s+\2(?=[가-힣\s.,!?]|$)/

/** 반말 문장 끝. 존댓말 끝(요·니다·니까·죠)은 먼저 걸러진다 */
const BANMAL_END = /(야|어|아|지|냐|니|거든|잖아|해|돼|래|군|구나|다|라|봐|와|줘|게|네|걸|데|까|나|자|더라)$/

const norm = (s: string) => s.toLowerCase().replace(/[\s_\-.!]/g, '')

function containsKey(text: string, key: string): boolean {
  return text.includes(key) || (key.length >= 4 && norm(text).includes(norm(key)))
}

/** 문장 끝 어미로 말투 등급을 거칠게 검사 */
export function speechViolations(text: string, speech: Speech): string[] {
  const sentences = text
    .split(/(?<=[.!?~…])\s+|\n+/)
    .map((s) => s.replace(/[\s.!?~…"'”’)\]]+$/u, '').trim())
    // "아!", "네?" 같은 짧은 감탄사는 말투 판단에서 뺀다
    .filter((s) => /[가-힣]$/.test(s) && s.replace(/\s/g, '').length >= 3)
  const bad: string[] = []
  for (const s of sentences) {
    const polite = /(요|니다|니까|세요|시죠|죠)$/.test(s)
    if ((speech === 'haeyo' || speech === 'hapsho') && !polite && BANMAL_END.test(s)) {
      // "~다"는 합쇼체가 아니면 평서 반말. "입니다"는 polite에서 걸러짐
      bad.push(s)
    } else if ((speech === 'hage' || speech === 'banmal') && /(요|니다)$/.test(s)) {
      bad.push(s)
    }
  }
  return bad
}

/** 말투·반복 실패는 가볍다: 재생성이 다 실패하면 이것만 걸린 대사는 그대로 쓴다.
 *  누출·외국어·공개 누락·길이는 무겁다: 절대 내보내지 않는다 */
export const SOFT_FAILS = new Set(['speech', 'repeat'])
export const isSoftOnly = (fails: string[]) => fails.every((f) => SOFT_FAILS.has(f))
/** 공개하라는 내용만 빠진 대사: 대사는 쓰고 공개는 다음으로 미룬다 */
export const isMissingOnly = (fails: string[]) => fails.length > 0 && fails.every((f) => f.startsWith('missing:'))

export interface GuardInput {
  text: string
  scenario: Scenario
  /** 이미 공개했거나 이번 턴에 허락된 사실 */
  allowed: ReadonlySet<string>
  /** 이번 턴에 반드시 공개해야 하는 사실 */
  mustReveal: FactSpec | null
}

export function guard({ text, scenario, allowed, mustReveal }: GuardInput): string[] {
  const fails: string[] = []
  const t = text.trim()
  if (!t) return ['empty']
  if (t.length > MAX_LEN) fails.push('too_long')

  if (containsKey(t, scenario.passwordValue)) fails.push('leak:password')
  for (const f of scenario.facts) {
    if (f.level === 'free' || allowed.has(f.id)) continue
    for (const k of f.keys ?? []) if (containsKey(t, k)) fails.push(`leak:${f.id}`)
  }
  if (mustReveal && !(mustReveal.keys ?? []).some((k) => containsKey(t, k))) {
    fails.push(`missing:${mustReveal.id}`)
  }

  if (HANJA.test(t)) fails.push('hanja')
  if (KANA.test(t)) fails.push('kana')
  if (ENGLISH_RUN.test(t)) fails.push('english')
  if (REPEAT.test(t)) fails.push('repeat')
  if (speechViolations(t, scenario.npc.speech).length) fails.push('speech')
  return [...new Set(fails)]
}
