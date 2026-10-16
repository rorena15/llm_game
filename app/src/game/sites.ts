// 모든 미션에서 열리는 공통 웹페이지 (CorpX 홈페이지). 미션의 websites가 같은 주소를 가지면 미션 쪽이 이긴다
// 언어마다 파일이 따로다 (story/sites.json = 한국어, story/en/sites.json = 영어, 설계안 §17.2)
import shared from '../../story/sites.json'
import type { Lang } from '../engine/types'
import { lang } from '../i18n'
import { normalizeUrl } from './run'

const enShared = Object.values(import.meta.glob<Record<string, string>>('../../story/en/sites.json', { eager: true, import: 'default' }))[0]

export const HOME = 'www.corpx.com'
export const SHARED_SITES: Record<string, string> = shared
// 영어 파일이 아직 없으면 한국어로 (개발 빌드에서만 영어를 고를 수 있는 동안)
const SHARED_BY_LANG: Record<Lang, Record<string, string>> = { ko: shared, en: enShared ?? shared }

/** 주소에 맞는 페이지 본문과 그 페이지의 원래 키 (단서 연결용) */
export function findPage(sites: Record<string, string>, url: string): { key: string; body: string } | null {
  const want = normalizeUrl(url)
  for (const pool of [sites, SHARED_BY_LANG[lang()]]) {
    const key = Object.keys(pool).find((k) => normalizeUrl(k) === want)
    if (key) return { key, body: pool[key] }
  }
  return null
}

/** 본문 속 주소 (www.로 시작). 링크로 바꿀 때 쓴다 */
export const URL_IN_TEXT = /www\.[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[\w\-./]*)?/gi
