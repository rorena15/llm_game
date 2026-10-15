// 시나리오 파일 묶음과 LLM 연결 설정. 언어마다 폴더가 따로다 (scenarios/ = 한국어, scenarios/en/ = 영어, 설계안 §17.2)
import { OpenAICompatLlm } from '../engine/llm'
import { withLang } from '../engine/scenario'
import type { Lang, ScenarioSpec } from '../engine/types'
import { lang } from '../i18n'

const koFiles = import.meta.glob<ScenarioSpec>('../../scenarios/*.json', { eager: true, import: 'default' })
const enFiles = import.meta.glob<ScenarioSpec>('../../scenarios/en/*.json', { eager: true, import: 'default' })

const byId = (files: Record<string, ScenarioSpec>, l: Lang) =>
  Object.fromEntries(Object.values(files).map((s) => [s.id, withLang(s, l)]))

/** 한국어 시나리오 (원본) */
export const SCENARIOS: Record<string, ScenarioSpec> = byId(koFiles, 'ko')

const BY_LANG: Record<Lang, Record<string, ScenarioSpec>> = {
  ko: SCENARIOS,
  // 영어 파일이 아직 없는 미션은 한국어로 (개발 빌드에서만 영어를 고를 수 있는 동안)
  en: { ...SCENARIOS, ...byId(enFiles, 'en') },
}

/** 지금 언어의 시나리오 */
export const scenarios = (): Record<string, ScenarioSpec> => BY_LANG[lang()]

export const llm = new OpenAICompatLlm(
  import.meta.env.VITE_LLM_URL ?? 'http://localhost:11434',
  import.meta.env.VITE_LLM_MODEL ?? 'se-kanana-8b',
)
