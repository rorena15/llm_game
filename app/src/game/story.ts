// 미션을 잇는 이야기: 엔딩 흐름의 데이터 (docs/이야기.md §5~§6). 문구는 story/ending.json에 둔다
import data from '../../story/ending.json'
import type { Email } from '../engine/types'

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
  /** 마지막 메일 뒤 한 줄씩 보여 주는 단서 연결 */
  reveal: string[]
  choices: EndingChoice[]
  credits: { role: string; names: string[] }[]
}

export const ENDING: EndingSpec = data
