// 언어별 프롬프트 문구 묶음과 빈 칸 검사
import type { Lang } from '../types'
import { en } from './en'
import { ko } from './ko'
import type { PromptText } from './types'

export type { PromptText }

export const PROMPTS: Record<Lang, PromptText> = { ko, en }

/** 언어마다 쓸 수 있는 말투 등급 */
export const SPEECHES: Record<Lang, readonly string[]> = {
  ko: ['hage', 'haeyo', 'hapsho', 'banmal'],
  en: ['formal', 'neutral', 'casual'],
}

/** 틀 문자열 속 {이름} 목록 */
export const slotsOf = (s: string) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort()

/** 채워지지 않은 칸 이름 (예: "tactic.flatter", "speech.casual") */
export function missingText(lang: Lang): string[] {
  const p = PROMPTS[lang]
  const out: string[] = []
  const walk = (v: unknown, path: string) => {
    if (typeof v === 'string') {
      if (!v.trim()) out.push(path)
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k)
  }
  walk(p, '')
  for (const s of SPEECHES[lang]) if (!(s in p.speech)) out.push(`speech.${s}`)
  return out
}

export function promptText(lang: Lang): PromptText {
  const missing = missingText(lang)
  if (missing.length) throw new Error(`${lang} 프롬프트 문구가 비어 있음: ${missing.join(', ')} (src/engine/lang/${lang}.ts)`)
  return PROMPTS[lang]
}
