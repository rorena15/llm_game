// 시나리오 검증: 형식과 설계안 §7 미션 설계 규칙을 변형마다 검사한다.
// 실행: npm run validate [파일...]
import { readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { applyDecision, decide } from '../src/engine/rules'
import { applyVariant, unfilledSlots } from '../src/engine/scenario'
import { newState } from '../src/engine/session'
import type { Scenario, ScenarioSpec, Tactic } from '../src/engine/types'
import { TACTICS } from '../src/engine/types'

const DIR = join(import.meta.dirname, '..', 'scenarios')
const MAX_TURNS_TO_REVEAL = 8
const MIN_VARIANTS = 3

function checkSpec(spec: ScenarioSpec): string[] {
  const e: string[] = []
  const ids = new Map<string, string>()
  const add = (id: string, kind: string) => {
    if (ids.has(id)) e.push(`id 중복: ${id} (${ids.get(id)}, ${kind})`)
    ids.set(id, kind)
  }
  spec.facts.forEach((f) => add(f.id, 'fact'))
  spec.clues.forEach((c) => add(c.id, 'clue'))
  spec.inferences.forEach((i) => add(i.id, 'inference'))

  if (!spec.npc.fallbackLines?.normal?.length) e.push('npc.fallbackLines.normal 비어 있음')
  for (const t of Object.keys(spec.npc.weak)) if (!TACTICS.includes(t as Tactic)) e.push(`npc.weak 알 수 없는 tactic: ${t}`)
  for (const f of spec.facts) {
    if (f.level === 'guarded' && !f.keys?.length) e.push(`guarded 사실에 keys 없음: ${f.id}`)
  }
  for (const c of spec.clues) {
    const [kind, ref] = c.source.split(':')
    if (kind === 'email' && !spec.emails[Number(ref)]) e.push(`단서 ${c.id}: 없는 메일 ${ref}`)
    else if (kind === 'web' && !(ref in spec.websites)) e.push(`단서 ${c.id}: 없는 웹페이지 ${ref}`)
    else if (kind !== 'email' && kind !== 'web') e.push(`단서 ${c.id}: 알 수 없는 출처 ${c.source}`)
  }
  for (const inf of spec.inferences) {
    if (inf.requires.length < 2) e.push(`추론 ${inf.id}: 재료가 2개 미만`)
    for (const r of inf.requires) if (!ids.has(r)) e.push(`추론 ${inf.id}: 없는 재료 ${r}`)
    for (const u of inf.unlocks ?? []) if (!(u in spec.loginHints)) e.push(`추론 ${inf.id}: 없는 힌트 ${u}`)
  }
  if (!spec.inferences.some((i) => i.final)) e.push('final 추론 없음')

  // §7 규칙 1~3: 조각 수, 대화 전용 조각, 문서 전용 조각
  const pieces = spec.password.pieces
  if (pieces.length < 2 || pieces.length > 4) e.push(`비밀번호 조각 ${pieces.length}개 (2~4개여야 함)`)
  const kindOf = (id: string) => ids.get(id)
  for (const p of pieces) for (const s of p.sources) if (!ids.has(s)) e.push(`조각 ${p.key}: 없는 출처 ${s}`)
  if (!pieces.some((p) => p.sources.every((s) => kindOf(s) === 'fact'))) e.push('규칙 2: 대화로만 얻는 조각이 없음')
  if (!pieces.some((p) => p.sources.every((s) => kindOf(s) === 'clue'))) e.push('규칙 3: 문서로만 얻는 조각이 없음')
  for (const p of pieces)
    for (const s of p.sources) {
      const f = spec.facts.find((x) => x.id === s)
      if (f?.level === 'secret') e.push(`조각 ${p.key}: secret 사실은 출처가 될 수 없음`)
    }

  const isTutorial = spec.difficulty === 0
  if (!isTutorial && spec.variants.length < MIN_VARIANTS) e.push(`규칙 7: 변형 ${spec.variants.length}개 (${MIN_VARIANTS}개 이상)`)
  return e
}

/** 규칙 4: 모든 단서와 사실에서 출발해 final 추론까지 닿는가 */
function reachesFinal(sc: Scenario): boolean {
  const have = new Set([...sc.clues.map((c) => c.id), ...sc.facts.filter((f) => f.level !== 'secret').map((f) => f.id)])
  let grew = true
  while (grew) {
    grew = false
    for (const inf of sc.inferences)
      if (!have.has(inf.id) && inf.requires.every((r) => have.has(r))) {
        have.add(inf.id)
        grew = true
      }
  }
  return sc.inferences.some((i) => i.final && have.has(i.id))
}

/** 규칙 5: 약점 tactic만으로 몇 턴 안에 guarded 사실이 열리는가 */
function turnsToReveal(sc: Scenario, factId: string): number | null {
  const best = TACTICS.filter((t) => t !== 'hostile').reduce((a, b) =>
    (sc.npc.weak[b] ?? 1) > (sc.npc.weak[a] ?? 1) ? b : a,
  )
  let st = newState()
  for (let turn = 1; turn <= MAX_TURNS_TO_REVEAL; turn++) {
    const ask = decide(sc, st, { tactic: best, topic: factId, meta: false, fit: 1, leverage: null }, '')
    if (ask.reveal) return turn
    st = applyDecision(st, decide(sc, st, { tactic: best, topic: null, meta: false, fit: 1, leverage: null }, ''))
  }
  return null
}

function checkVariant(spec: ScenarioSpec, vi: number): string[] {
  const v = spec.variants[vi]
  const sc = applyVariant(spec, v)
  const e: string[] = []
  const tag = (m: string) => `[변형 ${v.id}] ${m}`
  for (const s of unfilledSlots(sc)) e.push(tag(`채워지지 않은 자리 표시 {{${s}}}`))

  // 규칙 6: 비밀번호 원문은 대화·문서·힌트에 나오지 않는다 (기밀 문서와 secret 사실은 예외)
  const pw = sc.passwordValue.toLowerCase()
  const exposed = [
    ...sc.facts.filter((f) => f.level !== 'secret').map((f) => f.text),
    ...sc.clues.map((c) => c.text),
    ...sc.inferences.map((i) => i.yields),
    ...Object.values(sc.loginHints),
    ...sc.emails.map((m) => m.subject + m.body),
    ...Object.values(sc.websites),
    sc.npc.persona,
  ]
  if (exposed.some((t) => t.toLowerCase().includes(pw))) e.push(tag('비밀번호 원문이 노출된 곳이 있음'))

  // 단서 낱말이 문서에 실제로 있어야 누를 수 있다
  for (const c of sc.clues) {
    const [kind, ref] = c.source.split(':')
    const doc = kind === 'email' ? sc.emails[Number(ref)]?.body : sc.websites[ref]
    if (!c.keyword) e.push(tag(`단서 ${c.id}: keyword 없음 (누를 낱말이 없어 모을 수 없음)`))
    else if (doc !== undefined && !doc.includes(c.keyword)) e.push(tag(`단서 ${c.id}: 본문에 "${c.keyword}"가 없음`))
  }
  // 웹페이지 주소는 메일이나 다른 페이지에 적혀 있어야 찾아갈 수 있다
  for (const url of Object.keys(sc.websites)) {
    const docs = [...sc.emails.map((m) => m.subject + m.body), ...Object.entries(sc.websites).filter(([u]) => u !== url).map(([, t]) => t)]
    if (!docs.some((t) => t.includes(url))) e.push(tag(`웹페이지 ${url}: 주소가 어디에도 적혀 있지 않음`))
  }

  if (!reachesFinal(sc)) e.push(tag('규칙 4: final 추론에 닿지 않음'))
  for (const f of sc.facts.filter((x) => x.level === 'guarded')) {
    const n = turnsToReveal(sc, f.id)
    if (n === null) e.push(tag(`규칙 5: ${f.id}가 약점 tactic ${MAX_TURNS_TO_REVEAL}턴 안에 열리지 않음`))
  }
  return e
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => join(DIR, f))

let failed = 0
for (const file of files) {
  const spec = JSON.parse(readFileSync(file, 'utf8')) as ScenarioSpec
  const errors = [...checkSpec(spec), ...spec.variants.flatMap((_, i) => checkVariant(spec, i))]
  if (errors.length) {
    failed++
    console.log(`✗ ${basename(file)}`)
    for (const m of errors) console.log(`  - ${m}`)
  } else {
    const turns = spec.facts
      .filter((f) => f.level === 'guarded')
      .map((f) => `${f.id} ${turnsToReveal(applyVariant(spec, spec.variants[0]), f.id)}턴`)
    console.log(`✓ ${basename(file)} (변형 ${spec.variants.length}개${turns.length ? `, 공개까지 ${turns.join(', ')}` : ''})`)
  }
}
process.exit(failed ? 1 : 0)
