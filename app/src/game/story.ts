// 미션을 잇는 이야기: 엔딩 흐름의 데이터 (docs/이야기.md §5~§6). 문구는 story/ending.json에 둔다
// 언어마다 파일이 따로다 (story/en/ending.json = 영어, 설계안 §17.2)
import data from '../../story/ending.json'
import type { Email, Lang } from '../engine/types'
import { lang } from '../i18n'

const enData = Object.values(import.meta.glob<EndingSpec>('../../story/en/ending.json', { eager: true, import: 'default' }))[0]

export interface EndingChoice {
  id: string
  /** 선택 버튼 글 */
  label: string
  /** 버튼 아래 설명 */
  desc: string
  /** 고른 뒤 한 장씩 넘기는 후일담 */
  epilogue: string[]
}

export interface EndingSpec {
  /** 이 미션을 깨면 결과 화면에서 엔딩으로 넘어간다 */
  afterMission: string
  finalMail: Email
  /** 마지막 메일 뒤 한 장씩 넘기는 단서 연결 */
  reveal: string[]
  choices: EndingChoice[]
  credits: { role: string; names: string[] }[]
}

export const ENDING: EndingSpec = data
// 영어 파일이 아직 없으면 한국어로
const BY_LANG: Record<Lang, EndingSpec> = { ko: ENDING, en: enData ?? ENDING }

/** 지금 언어의 엔딩 */
export const ending = (): EndingSpec => BY_LANG[lang()]
