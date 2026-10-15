// 대화 세트(eval/convos/*.txt)를 모델마다 돌려 기록과 요약을 남긴다.
// 실행: npm run eval -- <모델1> [모델2 ...] [--lang en]   (LLM_URL 기본 http://localhost:11434)
// 대화 파일 이름은 <시나리오 앞부분>_<이름>.txt, 예: m1_flatter.txt → mission_1
// --lang en이면 eval/convos/en/의 대화를 scenarios/en/의 시나리오로 돌린다
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { OpenAICompatLlm } from '../src/engine/llm'
import { applyVariant } from '../src/engine/scenario'
import { Session } from '../src/engine/session'
import type { ScenarioSpec, TurnResult } from '../src/engine/types'
import { convoDir, loadSpec, ROOT, takeLang } from './content'

const { lang, rest: models } = takeLang(process.argv.slice(2))
if (!models.length) {
  console.error('모델 이름을 하나 이상 주세요')
  process.exit(1)
}
const url = process.env.LLM_URL ?? 'http://localhost:11434'
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
const outDir = join(ROOT, 'eval', 'runs', lang === 'ko' ? stamp : `${stamp}-${lang}`)
const CONVOS = convoDir(lang)
if (!existsSync(CONVOS)) {
  console.error(`대화 세트 폴더가 없음: ${CONVOS}`)
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })

const convos = readdirSync(CONVOS).filter((f) => f.endsWith('.txt'))
const scenarioFor = (file: string): ScenarioSpec => {
  const n = file.match(/^m(\d+)_/)?.[1]
  return loadSpec(n ? `mission_${n}` : 'tutorial', lang)
}

interface Sum {
  turns: number
  clean: number
  soft: number
  fallback: number
  blockedLeaks: number
  reveals: number
  meta: number
  ms: number[]
}

const rows: string[] = []
for (const model of models) {
  const llm = new OpenAICompatLlm(url, model)
  const total: Sum = { turns: 0, clean: 0, soft: 0, fallback: 0, blockedLeaks: 0, reveals: 0, meta: 0, ms: [] }
  const log: string[] = []
  for (const file of convos) {
    const spec = scenarioFor(file)
    const session = new Session(applyVariant(spec, spec.variants[0]), llm)
    const lines = readFileSync(join(CONVOS, file), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    log.push(`\n=== ${file} ===`)
    for (const line of lines) {
      const t0 = performance.now()
      const r: TurnResult = await session.turn(line)
      const ms = Math.round(performance.now() - t0)
      total.turns++
      total.ms.push(ms)
      if (r.usedFallback) total.fallback++
      else if (r.softAccepted) total.soft++
      else total.clean++
      total.blockedLeaks += r.guardFailures.filter((f) => f.startsWith('leak:')).length
      total.reveals += r.revealedNow.length
      if (r.judgment.meta) total.meta++
      const j = r.judgment
      log.push(`나: ${line}`)
      log.push(`${spec.npc.name}: ${r.dialogue}`)
      log.push(
        `   [${j.tactic}${j.topic ? `·${j.topic}` : ''}${j.meta ? '·META' : ''} fit${j.fit}] ${r.directive} | 의심 ${r.state.suspicion} 친밀 ${r.state.rapport}` +
          `${r.revealedNow.length ? ` | 공개 ${r.revealedNow.map((f) => f.id)}` : ''} | ${r.attempts}회${r.usedFallback ? ' 대체' : ''}` +
          `${r.guardFailures.length ? ` (${r.guardFailures.join(',')})` : ''} | ${ms}ms`,
      )
      for (const x of r.rejected) log.push(`      ✗ ${x.fails.join(',')}: ${x.text}`)
      if (r.gameOver) {
        log.push('*** 접속 차단 ***')
        break
      }
    }
  }
  writeFileSync(join(outDir, `${model.replace(/[:/]/g, '_')}.log`), log.join('\n'), 'utf8')
  const sorted = [...total.ms].sort((a, b) => a - b)
  const med = sorted[Math.floor(sorted.length / 2)]
  const p90 = sorted[Math.floor(sorted.length * 0.9)]
  rows.push(
    `| ${model} | ${total.turns} | ${total.clean} | ${total.soft} | ${total.fallback} | ${total.blockedLeaks} | ${total.reveals} | ${total.meta} | ${med} | ${p90} |`,
  )
  console.log(`${model}: 끝 (${total.turns}턴)`)
}

const summary = [
  '| 모델 | 턴 | 깨끗 | 말투만 틀림 | 대체 대사 | 막은 누출 | 공개 | META | 중앙 ms | 90% ms |',
  '|---|---|---|---|---|---|---|---|---|---|',
  ...rows,
].join('\n')
writeFileSync(join(outDir, 'summary.md'), summary + '\n', 'utf8')
console.log(`\n${summary}\n\n기록: ${outDir}`)
