// 시나리오 파일 묶음과 LLM 연결 설정
import { OpenAICompatLlm } from '../engine/llm'
import type { ScenarioSpec } from '../engine/types'

const files = import.meta.glob<ScenarioSpec>('../../scenarios/*.json', { eager: true, import: 'default' })

export const SCENARIOS: Record<string, ScenarioSpec> = Object.fromEntries(
  Object.values(files).map((s) => [s.id, s]),
)

export const llm = new OpenAICompatLlm(
  import.meta.env.VITE_LLM_URL ?? 'http://localhost:11434',
  import.meta.env.VITE_LLM_MODEL ?? 'se-kanana-8b',
)
