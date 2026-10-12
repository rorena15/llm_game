// 엔진을 실제 모델에 붙여 정해진 대사를 차례로 보내 본다 (UI 없이).
// 실행: npm run chat -- [시나리오 id] [변형 id] < 대사.txt   (한 줄에 한 마디)
//   환경 변수 LLM_URL (기본 http://localhost:11434), LLM_MODEL (기본 se-kanana-2.1b)
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { OpenAICompatLlm } from '../src/engine/llm'
import { applyVariant } from '../src/engine/scenario'
import { Session } from '../src/engine/session'
import type { ScenarioSpec } from '../src/engine/types'

const [id = 'mission_1', variantId] = process.argv.slice(2)
const spec = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'scenarios', `${id}.json`), 'utf8')) as ScenarioSpec
const variant = spec.variants.find((v) => v.id === variantId) ?? spec.variants[0]
const llm = new OpenAICompatLlm(process.env.LLM_URL ?? 'http://localhost:11434', process.env.LLM_MODEL ?? 'se-kanana-2.1b')
const session = new Session(applyVariant(spec, variant), llm)

const lines = readFileSync(0, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
for (const line of lines) {
  const t0 = performance.now()
  const r = await session.turn(line)
  const ms = Math.round(performance.now() - t0)
  const j = r.judgment
  console.log(`\n나: ${line}`)
  console.log(`${spec.npc.name}: ${r.dialogue}`)
  console.log(
    `   [${j.tactic}${j.topic ? ` · ${j.topic}` : ''}${j.meta ? ' · META' : ''} · fit ${j.fit}] ${r.directive}` +
      ` | 의심 ${r.state.suspicion} (${r.suspicionDelta >= 0 ? '+' : ''}${r.suspicionDelta})` +
      ` 친밀 ${r.state.rapport} (${r.rapportDelta >= 0 ? '+' : ''}${r.rapportDelta})` +
      `${r.revealedNow.length ? ` | 공개: ${r.revealedNow.map((f) => f.id).join(',')}` : ''}` +
      ` | ${r.attempts}회${r.usedFallback ? ' 대체대사' : ''}${r.guardFailures.length ? ` (${r.guardFailures.join(',')})` : ''} | ${ms}ms`,
  )
  if (r.gameOver) {
    console.log('\n*** 의심도 100: 접속 차단 ***')
    break
  }
}
