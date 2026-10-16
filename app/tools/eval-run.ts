// 대화 세트(eval/convos/*.txt)를 모델마다 돌려 기록과 요약을 남긴다.
// 실행: npm run eval -- <모델1> [모델2 ...] [--lang en] [--variants]   (LLM_URL 기본 http://localhost:11434)
// 대화 파일 이름은 <시나리오 앞부분>_<이름>.txt, 예: m1_flatter.txt → mission_1
// --lang en이면 eval/convos/en/의 대화를 scenarios/en/의 시나리오로 돌린다
// 판정 정답표(eval/labels/)가 있으면 tactic·topic 정확도와 META 놓침·오탐을 함께 적는다
// --variants면 대화마다 변형을 모두 돌린다 (없으면 첫 변형만). 요약에 대화·변형별로 공개한 사실과 턴을 적는다
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { OpenAICompatLlm } from '../src/engine/llm'
import { applyVariant } from '../src/engine/scenario'
import { Session } from '../src/engine/session'
import type { ScenarioSpec, TurnResult } from '../src/engine/types'
import { convoDir, loadSpec, ROOT, takeLang } from './content'

const { lang, rest } = takeLang(process.argv.slice(2))
const allVariants = rest.includes('--variants')
const models = rest.filter((a) => a !== '--variants')
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
const runs = convos.flatMap((file) => {
  const spec = scenarioFor(file)
  return (allVariants ? spec.variants : spec.variants.slice(0, 1)).map((variant) => ({ file, spec, variant }))
})

/** 판정 정답표 (eval/labels/<대화 파일>, 형식은 그 폴더의 README). 언어와 상관없이 같은 표를 쓴다 */
interface Label {
  tactics: string[] | null
  topics: (string | null)[]
  meta: boolean
}
const LABELS = join(ROOT, 'eval', 'labels')
function labelsFor(file: string): Label[] | null {
  const f = join(LABELS, file)
  if (!existsSync(f)) return null
  return readFileSync(f, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [tactic, topic, meta] = l.split(/\s+/)
      return {
        tactics: tactic === '*' ? null : tactic.split('|'),
        topics: topic.split('|').map((t) => (t === '-' ? null : t)),
        meta: meta === 'meta',
      }
    })
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
  /** 정답표와 비교: [맞음, 전체] */
  tactic: [number, number]
  topic: [number, number]
  metaMiss: number
  metaFalse: number
}

const rows: string[] = []
/** 모델 → "대화 변형" → 공개한 사실@턴 */
const reach = new Map<string, Map<string, string>>()
for (const model of models) {
  const llm = new OpenAICompatLlm(url, model)
  const total: Sum = {
    turns: 0,
    clean: 0,
    soft: 0,
    fallback: 0,
    blockedLeaks: 0,
    reveals: 0,
    meta: 0,
    ms: [],
    tactic: [0, 0],
    topic: [0, 0],
    metaMiss: 0,
    metaFalse: 0,
  }
  const log: string[] = []
  const got = new Map<string, string>()
  reach.set(model, got)
  for (const { file, spec, variant } of runs) {
    const session = new Session(applyVariant(spec, variant), llm)
    const lines = readFileSync(join(CONVOS, file), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    const found: string[] = []
    const labels = labelsFor(file)
    if (labels && labels.length !== lines.length) throw new Error(`정답표 줄 수가 대화와 다름: ${file}`)
    log.push(`\n=== ${file} (변형 ${variant.id}) ===`)
    for (const [turn, line] of lines.entries()) {
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
      for (const f of r.revealedNow) found.push(`${f.id}@${turn + 1}`)
      if (r.judgment.meta) total.meta++
      const j = r.judgment
      const wrong: string[] = []
      const want = labels?.[turn]
      if (want) {
        if (want.meta !== j.meta) {
          if (want.meta) total.metaMiss++
          else total.metaFalse++
          wrong.push(want.meta ? 'META 놓침' : 'META 오탐')
        }
        if (!want.meta) {
          const tOk = !want.tactics || want.tactics.includes(j.tactic)
          const pOk = want.topics.includes(j.topic)
          total.tactic[0] += tOk ? 1 : 0
          total.tactic[1]++
          total.topic[0] += pOk ? 1 : 0
          total.topic[1]++
          if (!tOk) wrong.push(`tactic 정답 ${want.tactics!.join('|')}`)
          if (!pOk) wrong.push(`topic 정답 ${want.topics.map((t) => t ?? '-').join('|')}`)
        }
      }
      log.push(`나: ${line}`)
      log.push(`${spec.npc.name}: ${r.dialogue}`)
      log.push(
        `   [${j.tactic}${j.topic ? `·${j.topic}` : ''}${j.meta ? '·META' : ''} fit${j.fit}] ${r.directive} | 의심 ${r.state.suspicion} 친밀 ${r.state.rapport}` +
          `${r.revealedNow.length ? ` | 공개 ${r.revealedNow.map((f) => f.id)}` : ''} | ${r.attempts}회${r.usedFallback ? ' 대체' : ''}` +
          `${r.guardFailures.length ? ` (${r.guardFailures.join(',')})` : ''} | ${ms}ms` +
          `${wrong.length ? ` | ✗ ${wrong.join(', ')}` : ''}`,
      )
      for (const x of r.rejected) log.push(`      ✗ ${x.fails.join(',')}: ${x.text}`)
      if (r.gameOver) {
        log.push('*** 접속 차단 ***')
        found.push('차단')
        break
      }
    }
    got.set(`${file} ${variant.id}`, found.join(' ') || '-')
  }
  writeFileSync(join(outDir, `${model.replace(/[:/]/g, '_')}.log`), log.join('\n'), 'utf8')
  const sorted = [...total.ms].sort((a, b) => a - b)
  const med = sorted[Math.floor(sorted.length / 2)]
  const p90 = sorted[Math.floor(sorted.length * 0.9)]
  const pct = ([ok, n]: [number, number]) => (n ? `${Math.round((ok / n) * 100)}% (${ok}/${n})` : '-')
  rows.push(
    `| ${model} | ${total.turns} | ${total.clean} | ${total.soft} | ${total.fallback} | ${total.blockedLeaks} | ${total.reveals} | ${total.meta} | ${med} | ${p90} |` +
      ` ${pct(total.tactic)} | ${pct(total.topic)} | ${total.metaMiss} | ${total.metaFalse} |`,
  )
  console.log(`${model}: 끝 (${total.turns}턴)`)
}

const summary = [
  '| 모델 | 턴 | 깨끗 | 말투만 틀림 | 대체 대사 | 막은 누출 | 공개 | META | 중앙 ms | 90% ms | tactic 정확도 | topic 정확도 | META 놓침 | META 오탐 |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows,
].join('\n')
const reachTable = [
  `| 대화 변형 | ${models.join(' | ')} |`,
  `|---|${models.map(() => '---|').join('')}`,
  ...runs.map(({ file, variant }) => {
    const k = `${file} ${variant.id}`
    return `| ${k} | ${models.map((m) => reach.get(m)?.get(k) ?? '').join(' | ')} |`
  }),
].join('\n')
writeFileSync(join(outDir, 'summary.md'), `${summary}\n\n공개한 사실@턴\n\n${reachTable}\n`, 'utf8')
console.log(`\n${summary}\n\n${reachTable}\n\n기록: ${outDir}`)
