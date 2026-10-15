// 도구들이 같이 쓰는 내용 파일 위치와 --lang 인자 (설계안 §17.2)
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { withLang } from '../src/engine/scenario'
import type { Lang, ScenarioSpec } from '../src/engine/types'

export const ROOT = join(import.meta.dirname, '..')

/** argv에서 --lang ko|en을 빼내고 나머지 인자를 돌려준다 */
export function takeLang(argv: string[]): { lang: Lang; rest: string[] } {
  const i = argv.indexOf('--lang')
  if (i < 0) return { lang: 'ko', rest: argv }
  const v = argv[i + 1]
  if (v !== 'ko' && v !== 'en') throw new Error(`--lang은 ko 또는 en: ${v}`)
  return { lang: v, rest: [...argv.slice(0, i), ...argv.slice(i + 2)] }
}

export const scenarioDir = (lang: Lang) => (lang === 'ko' ? join(ROOT, 'scenarios') : join(ROOT, 'scenarios', lang))

/** 이 언어의 시나리오 파일 경로들 */
export function scenarioFiles(lang: Lang): string[] {
  const dir = scenarioDir(lang)
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => join(dir, f))
}

export function readSpec(file: string, lang: Lang): ScenarioSpec {
  return withLang(JSON.parse(readFileSync(file, 'utf8')) as ScenarioSpec, lang)
}

export function loadSpec(id: string, lang: Lang): ScenarioSpec {
  const file = join(scenarioDir(lang), `${id}.json`)
  if (!existsSync(file)) throw new Error(`시나리오 파일 없음: ${file}`)
  return readSpec(file, lang)
}

export const convoDir = (lang: Lang) => (lang === 'ko' ? join(ROOT, 'eval', 'convos') : join(ROOT, 'eval', 'convos', lang))
