// 판정 호출과 대사 호출의 프롬프트 조립 (§5.4 ①③). 문구는 언어별로 lang/에 있다
import { promptText } from './lang'
import type { Directive, FactSpec, Judgment, Line, Scenario, Tactic } from './types'
import { TACTICS } from './types'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const recent = (history: Line[], n: number) => history.slice(-n)

/** 틀 문자열의 {이름}을 채운다. 모르는 이름({"tactic": ...} 같은 JSON 예시)은 그대로 둔다 */
function tpl(s: string, vars: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m))
}

const textFor = (sc: Scenario) => promptText(sc.lang ?? 'ko')

export function judgePrompt(
  sc: Scenario,
  history: Line[],
  playerText: string,
  leverageCards: { id: string; label: string }[],
): ChatMessage[] {
  const t = textFor(sc)
  const topics = [
    ...sc.facts.filter((f) => f.level === 'guarded').map((f) => `- ${f.id}: ${f.label}`),
    `- password: ${t.passwordTopic}`,
  ].join('\n')
  const cards = leverageCards.length ? leverageCards.map((c) => `- ${c.id}: ${c.label}`).join('\n') : t.none
  const convo = recent(history, 6)
    .map((l) => `${l.role === 'player' ? t.player : sc.npc.name}: ${l.text}`)
    .join('\n')

  const system = tpl(t.judgeSystem, {
    npc: sc.npc.name,
    persona: sc.npc.persona,
    tactics: TACTICS.map((x) => `- ${x}: ${t.tactic[x]}`).join('\n'),
    topics,
    cards,
  })
  const user = `${convo ? `${t.recentConvo}\n${convo}\n\n` : ''}${t.thisLine}\n${playerText}`
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

export function speakPrompt(
  sc: Scenario,
  history: Line[],
  playerText: string,
  directive: Directive,
  known: FactSpec[],
  reveal: FactSpec | null,
  hidden: FactSpec[] = [],
): ChatMessage[] {
  const t = textFor(sc)
  const speech = t.speech[sc.npc.speech]
  if (!speech) throw new Error(`${sc.lang ?? 'ko'} 시나리오에 쓸 수 없는 말투 등급: ${sc.npc.speech}`)
  const system = tpl(t.speakSystem, {
    npc: sc.npc.name,
    persona: sc.npc.persona,
    speech,
    facts: known.map((f) => `- ${f.text}`).join('\n') || t.none,
    reveal: reveal ? tpl(t.revealBlock, { text: reveal.text }) : '',
    hidden: hidden.length ? tpl(t.hiddenBlock, { list: hidden.map((f) => `- ${f.label}`).join('\n') }) : '',
    directive: t.directive[directive],
  })

  const msgs: ChatMessage[] = [{ role: 'system', content: system }]
  for (const l of recent(history, 12)) {
    msgs.push({ role: l.role === 'player' ? 'user' : 'assistant', content: l.text })
  }
  msgs.push({ role: 'user', content: playerText })
  return msgs
}

const DEFAULT_JUDGMENT: Judgment = { tactic: 'chat', topic: null, meta: false, fit: 1, leverage: null }

/** 모델 출력에서 판정을 꺼낸다. 형식이 틀리면 null */
export function parseJudgment(raw: string, sc: Scenario, leverageIds: ReadonlySet<string>): Judgment | null {
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) return null
  let o: Record<string, unknown>
  try {
    o = JSON.parse(m[0])
  } catch {
    return null
  }
  const tactic = o.tactic as Tactic
  if (!TACTICS.includes(tactic)) return null
  const topicIds = new Set([...sc.facts.filter((f) => f.level === 'guarded').map((f) => f.id), 'password'])
  const topic = typeof o.topic === 'string' && topicIds.has(o.topic) ? o.topic : null
  const fitNum = Number(o.fit)
  const fit = (fitNum === 0 || fitNum === 2 ? fitNum : 1) as 0 | 1 | 2
  const leverage = typeof o.leverage === 'string' && leverageIds.has(o.leverage) ? o.leverage : null
  return { tactic, topic, meta: o.meta === true, fit, leverage }
}

export { DEFAULT_JUDGMENT }

/** 모델이 놓쳐도 잡는 메타 인젝션 안전망 */
const META_PATTERNS = [
  /(이전|위의?|앞의?|모든)\s*(지시|명령|규칙|설정)/,
  /(지시|명령|규칙|설정|프롬프트)\s*(를|을)?\s*(무시|잊|해제|초기화|보여)/,
  /시스템\s*(프롬프트|메시지|:)/,
  /\[\s*(system|시스템|sys|admin|관리자 모드)\s*\]/i,
  /너는?\s*(이제\s*)?(ai|인공지능|챗봇|언어\s*모델)/i,
  /ignore (all |the )?(previous|above)/i,
  /(disregard|forget) (all |the |your )?(previous|prior|above|earlier) (instructions|rules|prompt)/i,
  /system\s*(prompt|message)/i,
  /(show|reveal|print) (me )?(your|the) (prompt|instructions)/i,
  /you('re| are) (now |just )?(an? )?(ai|chatbot|language model|llm)\b/i,
  /(stop|end|drop) (the )?(roleplay|role-play|act(ing)?)\b/i,
  /developer mode/i,
  /(roleplay|역할극)\s*(그만|중단|끝)/i,
  /개발자\s*모드/,
]

/** 모델이 놓쳐도 잡는 비밀번호 요구 안전망 */
export function mentionsPassword(text: string): boolean {
  return /(비밀\s*번호|비번|암호|패스\s*워드|로그인\s*정보|pass\s*word|passwd|pass\s*code|credentials|login (details|info))/i.test(text)
}

export function looksMeta(text: string): boolean {
  return META_PATTERNS.some((p) => p.test(text))
}

/** 대사 끝에 붙는 이름표·따옴표 정리 */
export function cleanDialogue(raw: string, npcName: string): string {
  let t = raw.trim()
  t = t.replace(new RegExp(`^(${npcName}|NPC|assistant)\\s*[:：]\\s*`), '')
  t = t.replace(/^["“']|["”']$/g, '').trim()
  // 괄호 속 행동 묘사 "(잊어버린 척)"를 지운다
  t = t.replace(/\s*[(（][^)）]{1,30}[)）]\s*/g, ' ').replace(/\s{2,}/g, ' ').trim()
  return t
}
