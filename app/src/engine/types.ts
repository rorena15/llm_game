// 엔진 공용 타입. 설계: docs/설계안.md §5~§8

export const TACTICS = ['flatter', 'rush', 'empathy', 'pretext', 'ask', 'chat', 'hostile'] as const
export type Tactic = (typeof TACTICS)[number]

/** hage 하게체 · haeyo 해요체 · hapsho 합쇼체 · banmal 반말 */
export type Speech = 'hage' | 'haeyo' | 'hapsho' | 'banmal'

export type FactLevel = 'free' | 'guarded' | 'secret'

export interface FactSpec {
  id: string
  level: FactLevel
  /** 판정 프롬프트에 보이는 이름표. guarded 사실은 값 없이 이것만 보인다 */
  label: string
  /** NPC가 아는 내용. 공개가 허락된 턴에만 대사 프롬프트에 들어간다 */
  text: string
  when?: { rapportMin?: number; suspicionMax?: number; tactics?: Tactic[] }
  /** 대사에 이 중 하나가 들어가면 "공개했다"고 본다. 허락 전에는 금지어 */
  keys?: string[]
}

export interface NpcSpec {
  name: string
  speech: Speech
  persona: string
  /** tactic별 약점 배율. 1보다 크면 잘 먹힌다 */
  weak: Partial<Record<Tactic, number>>
  rules: { keyword: string; suspicion?: number; rapport?: number }[]
  /** 재생성이 다 실패했을 때 쓰는 대사. 엔진 지시별로, 없는 지시는 normal을 쓴다 */
  fallbackLines: { normal: string[] } & Partial<Record<Directive, string[]>>
}

export interface ClueSpec {
  id: string
  /** email:<index> · web:<url> */
  source: string
  label: string
  text: string
  /** 문서 본문에서 링크로 표시할 낱말 */
  keyword?: string
}

export interface InferenceSpec {
  id: string
  label: string
  /** 단서·사실·추론 id */
  requires: string[]
  yields: string
  unlocks?: string[]
  /** 대화 지렛대로 쓸 수 있나 (§6.3) */
  leverage?: boolean
  /** 비밀번호 조합 규칙을 완성하는 추론 */
  final?: boolean
}

export interface PasswordPiece {
  key: string
  /** 이 조각을 알려 주는 단서·사실 id */
  sources: string[]
}

export interface VariantSpec {
  id: string
  values: Record<string, string>
  password: string
}

export interface Email {
  sender: string
  subject: string
  body: string
}

/** 튜토리얼: 모델 없이 낱말로 고르는 정해진 대사 */
export interface ScriptRule {
  /** 이 중 하나라도 들어 있으면 */
  keywords: string[]
  reply: string
  /** 이 대사로 공개되는 사실 */
  fact?: string
  suspicion?: number
}

export interface GuideStep {
  text: string
  /** 이 카드를 모두 가지면 끝난 단계 */
  cards?: string[]
  /** 로그인 성공이 조건 */
  login?: boolean
}

/** 시나리오 파일 그대로 (자리 표시 {{key}} 포함) */
export interface ScenarioSpec {
  id: string
  title: string
  difficulty: number
  briefing: string
  /** 브리핑 위에 보이는 의뢰 메일 (docs/이야기.md §4) */
  request?: Email
  npc: NpcSpec
  facts: FactSpec[]
  password: { pieces: PasswordPiece[] }
  variants: VariantSpec[]
  clues: ClueSpec[]
  inferences: InferenceSpec[]
  loginHints: Record<string, string>
  emails: Email[]
  websites: Record<string, string>
  secretDocuments: string[]
  /** 있으면 모델 대신 이 정해진 대사로 대화한다 (튜토리얼) */
  script?: { rules: ScriptRule[]; default: string[] }
  /** 있으면 데스크톱에 단계 안내 창을 띄운다 */
  guide?: GuideStep[]
}

/** 변형을 적용해 자리 표시를 채운 시나리오 */
export interface Scenario extends Omit<ScenarioSpec, 'variants'> {
  variantId: string
  passwordValue: string
}

export interface Judgment {
  tactic: Tactic
  /** 캐묻는 사실 id, 'password', 또는 null */
  topic: string | null
  meta: boolean
  fit: 0 | 1 | 2
  /** 활용한 추론 카드 id */
  leverage: string | null
}

/** 대사 호출에 주는 엔진 지시 */
export type Directive = 'normal' | 'reveal' | 'evade' | 'wary' | 'angry' | 'confused'

export interface Line {
  role: 'player' | 'npc'
  text: string
}

export interface SessionState {
  suspicion: number
  rapport: number
  maxSuspicion: number
  revealed: string[]
  history: Line[]
}

export interface TurnResult {
  dialogue: string
  judgment: Judgment
  directive: Directive
  suspicionDelta: number
  rapportDelta: number
  revealedNow: FactSpec[]
  attempts: number
  usedFallback: boolean
  /** 말투만 틀린 대사를 그대로 썼다 */
  softAccepted: boolean
  guardFailures: string[]
  /** guard에 걸린 대사들 (평가·디버그용) */
  rejected: { text: string; fails: string[] }[]
  gameOver: boolean
  state: SessionState
}
