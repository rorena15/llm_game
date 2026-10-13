// 이야기 원고(docs/이야기.md의 "## 7. 원고")와 게임 데이터를 잇는다.
// 실행: npm run story            원고 → 시나리오 request·secretDocuments, story/ending.json
//       npm run story -- --export 지금 데이터 → 원고 (원고 절을 새로 씀)
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Email, ScenarioSpec } from '../src/engine/types'
import type { EndingSpec } from '../src/game/story'

const APP = join(import.meta.dirname, '..')
const DOC = join(APP, '..', 'docs', '이야기.md')
const ENDING_FILE = join(APP, 'story', 'ending.json')
const SECTION = '## 7. 원고'
const IDS = ['tutorial', 'mission_1', 'mission_2', 'mission_3', 'mission_4']
const ENDING_HEAD = '엔딩'
const FENCE = '```'

const scenarioFile = (id: string) => join(APP, 'scenarios', `${id}.json`)

// ---------- 원고 쓰기 (--export) ----------

const block = (text: string) => `${FENCE}text\n${text}\n${FENCE}`

function exportManuscript() {
  const out: string[] = [
    SECTION,
    '',
    '게임에 들어가는 이야기 문구를 모두 여기에 씁니다. 고친 뒤 `app/`에서 `npm run story`를 실행하면 시나리오 파일과 `app/story/ending.json`에 들어갑니다.',
    '',
    '- 본문은 ```text 블록 안에 씁니다. 줄바꿈은 그대로 게임에 나옵니다.',
    '- 기밀 문서와 후일담은 블록 하나가 문서 한 장입니다. 블록을 늘리거나 줄여도 됩니다.',
    '- 단서 연결은 블록 하나가 한 번 넘김입니다.',
    '- `{{password}}` 같은 자리 표시는 변형 값으로 바뀝니다. 쓸 수 있는 이름은 각 시나리오의 `variants`에 있습니다.',
    '- 제목·소제목(###, ####)과 `제목:`, `보낸 사람:`, `버튼:`, `설명:` 줄의 모양은 바꾸지 않습니다.',
    '',
  ]
  for (const id of IDS) {
    const s = JSON.parse(readFileSync(scenarioFile(id), 'utf8')) as ScenarioSpec
    const r = s.request ?? { sender: 'K', subject: '', body: '' }
    out.push(`### ${id}`, '', '#### 의뢰 메일', '', `보낸 사람: ${r.sender}`, `제목: ${r.subject}`, '', block(r.body), '')
    out.push('#### 기밀 문서', '', ...s.secretDocuments.flatMap((d) => [block(d), '']))
  }
  const e = JSON.parse(readFileSync(ENDING_FILE, 'utf8')) as EndingSpec
  out.push(`### ${ENDING_HEAD}`, '', '#### 마지막 메일', '', `보낸 사람: ${e.finalMail.sender}`, `제목: ${e.finalMail.subject}`, '')
  out.push(block(e.finalMail.body), '', '#### 단서 연결', '', ...e.reveal.flatMap((l) => [block(l), '']))
  for (const c of e.choices) {
    out.push(`#### 선택 ${c.id}`, '', `버튼: ${c.label}`, `설명: ${c.desc}`, '', ...c.epilogue.flatMap((p) => [block(p), '']))
  }

  const doc = readFileSync(DOC, 'utf8')
  const at = doc.indexOf(SECTION)
  const head = at >= 0 ? doc.slice(0, at) : doc.trimEnd() + '\n\n'
  writeFileSync(DOC, head + out.join('\n').trimEnd() + '\n')
  console.log(`원고를 썼습니다: docs/이야기.md "${SECTION}"`)
}

// ---------- 원고 읽기 ----------

interface Part {
  fields: Record<string, string>
  blocks: string[]
}

/** "#### 이름" 하나의 내용: "키: 값" 줄과 ```text 블록들 */
function parsePart(text: string): Part {
  const fields: Record<string, string> = {}
  const blocks: string[] = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith(FENCE)) {
      const body: string[] = []
      for (i++; i < lines.length && !lines[i].startsWith(FENCE); i++) body.push(lines[i])
      if (i >= lines.length) throw new Error('닫히지 않은 ``` 블록이 있습니다')
      blocks.push(body.join('\n'))
      continue
    }
    const m = line.match(/^(보낸 사람|제목|버튼|설명):\s?(.*)$/)
    if (m) fields[m[1]] = m[2].trim()
  }
  return { fields, blocks }
}

/** 제목 단계(#### 또는 ###)로 나눈다. 코드 블록 안의 #은 무시 */
function splitBy(text: string, mark: string): Map<string, string> {
  const out = new Map<string, string>()
  let name: string | null = null
  let buf: string[] = []
  let inFence = false
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith(FENCE)) inFence = !inFence
    if (!inFence && line.startsWith(mark + ' ')) {
      if (name !== null) out.set(name, buf.join('\n'))
      name = line.slice(mark.length + 1).trim()
      buf = []
    } else if (name !== null) buf.push(line)
  }
  if (name !== null) out.set(name, buf.join('\n'))
  return out
}

function need<T>(v: T | undefined, what: string): T {
  if (v === undefined) throw new Error(`원고에 ${what}이(가) 없습니다`)
  return v
}

function mailFrom(p: Part, what: string): Email {
  return {
    sender: need(p.fields['보낸 사람'], `${what}의 "보낸 사람:"`),
    subject: need(p.fields['제목'], `${what}의 "제목:"`),
    body: need(p.blocks[0], `${what}의 본문 블록`),
  }
}

// ---------- 시나리오 파일에 넣기 (모양은 그대로, 해당 값만 바꿈) ----------

/** "key": 다음 값(객체·배열)의 끝 위치. 문자열 안의 괄호는 무시 */
function valueSpan(src: string, key: string): [number, number] {
  const k = src.indexOf(`"${key}":`)
  if (k < 0) throw new Error(`"${key}" 칸이 없습니다`)
  let i = k + key.length + 3
  while (src[i] === ' ') i++
  const start = i
  let depth = 0
  let inStr = false
  for (; i < src.length; i++) {
    const c = src[i]
    if (inStr) {
      if (c === '\\') i++
      else if (c === '"') inStr = false
    } else if (c === '"') inStr = true
    else if (c === '{' || c === '[') depth++
    else if (c === '}' || c === ']') {
      depth--
      if (depth === 0) return [start, i + 1]
    }
  }
  throw new Error(`"${key}" 값이 닫히지 않았습니다`)
}

function replaceValue(src: string, key: string, json: string): string {
  const [a, b] = valueSpan(src, key)
  return src.slice(0, a) + json + src.slice(b)
}

const mailJson = (m: Email) =>
  `{ "sender": ${JSON.stringify(m.sender)}, "subject": ${JSON.stringify(m.subject)}, "body": ${JSON.stringify(m.body)} }`

const docsJson = (docs: string[]) => `[\n${docs.map((d) => `    ${JSON.stringify(d)}`).join(',\n')}\n  ]`

function apply() {
  const doc = readFileSync(DOC, 'utf8')
  const at = doc.indexOf(SECTION)
  if (at < 0) throw new Error(`docs/이야기.md에 "${SECTION}" 절이 없습니다. 먼저 npm run story -- --export`)
  const sections = splitBy(doc.slice(at), '###')

  for (const id of IDS) {
    const parts = splitBy(need(sections.get(id), `"### ${id}"`), '####')
    const request = mailFrom(parsePart(need(parts.get('의뢰 메일'), `${id}의 "#### 의뢰 메일"`)), `${id} 의뢰 메일`)
    const docs = parsePart(need(parts.get('기밀 문서'), `${id}의 "#### 기밀 문서"`)).blocks
    if (!docs.length) throw new Error(`${id}: 기밀 문서 블록이 하나도 없습니다`)

    let src = readFileSync(scenarioFile(id), 'utf8')
    src = replaceValue(src, 'request', mailJson(request))
    src = replaceValue(src, 'secretDocuments', docsJson(docs))
    JSON.parse(src) // 깨진 JSON을 쓰지 않게
    writeFileSync(scenarioFile(id), src)
  }

  const parts = splitBy(need(sections.get(ENDING_HEAD), `"### ${ENDING_HEAD}"`), '####')
  const old = JSON.parse(readFileSync(ENDING_FILE, 'utf8')) as EndingSpec
  const choices = [...parts.entries()]
    .filter(([name]) => name.startsWith('선택 '))
    .map(([name, text]) => {
      const p = parsePart(text)
      return {
        id: name.slice('선택 '.length).trim(),
        label: need(p.fields['버튼'], `${name}의 "버튼:"`),
        desc: need(p.fields['설명'], `${name}의 "설명:"`),
        epilogue: p.blocks,
      }
    })
  const ending: EndingSpec = {
    ...old,
    finalMail: mailFrom(parsePart(need(parts.get('마지막 메일'), '"#### 마지막 메일"')), '마지막 메일'),
    reveal: parsePart(need(parts.get('단서 연결'), '"#### 단서 연결"')).blocks,
    choices,
  }
  writeFileSync(ENDING_FILE, JSON.stringify(ending, null, 2) + '\n')
  console.log('원고를 게임 데이터에 넣었습니다. 이어서 npm run validate, npm test를 실행하세요.')
}

try {
  if (process.argv.includes('--export')) exportManuscript()
  else apply()
} catch (e) {
  console.error(`✗ ${(e as Error).message}`)
  process.exit(1)
}
