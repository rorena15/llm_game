// 화면 문구 (i18n). 문구는 영역별 파일(ko/*.ts, en/*.ts)에 두고, 영어 파일은 한국어 파일과 모양이 같아야 한다
// (타입으로 검사: 빠진 문구가 있으면 tsc가 실패한다). 끼워 넣을 값이 있는 문구는 함수로 쓴다.
//
// 이 파일이 다루는 것은 화면 문구뿐이다. 시나리오·이야기·NPC 프롬프트는 내용 파일 쪽에서 언어별로 둔다 (설계안 §17).
import type { Lang } from '../engine/types'
import { save, useSave } from '../game/save'
import { ko } from './ko'
import { en } from './en'

export type { Lang }
export type Messages = typeof ko

const MESSAGES: Record<Lang, Messages> = { ko, en }

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'ko', label: '한국어' },
  { id: 'en', label: 'English' },
]

/** 내용(시나리오·이야기)까지 준비된 언어. 아닌 언어는 개발 빌드에서만 고를 수 있다 */
export const CONTENT_READY: Lang[] = ['ko', 'en']

export function lang(): Lang {
  const v = save.data.settings.lang
  return v === 'en' || v === 'ko' ? v : 'ko'
}

/** 날짜·숫자 형식에 쓰는 BCP 47 태그 */
export const localeTag = () => (lang() === 'en' ? 'en-US' : 'ko-KR')

export function setLang(l: Lang) {
  save.setSetting('lang', l)
  applyLang()
}

export function applyLang() {
  document.documentElement.lang = lang()
}

/** 컴포넌트 밖에서 (알림, 상태 문구) */
export const msg = (): Messages => MESSAGES[lang()]

/** 컴포넌트 안에서. 언어가 바뀌면 다시 그린다 */
export function useT(): Messages {
  useSave()
  return MESSAGES[lang()]
}
