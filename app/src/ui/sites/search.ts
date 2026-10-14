// 브라우저 속 검색 포털 "나침반". 지금 미션에서 열 수 있는 웹페이지(미션 사이트 + 공통 CorpX)만 찾는다.
// 본문 글자로 찾으므로, 단서가 되는 이름·아이디를 알아야 그 사이트가 나온다
import { msg } from '../../i18n'
import { normalizeUrl } from '../../game/run'
import { siteTitle } from './parse'

export const SEARCH_HOME = 'www.nachimban.com'
/** 포털 이름 (언어별) */
export const searchName = () => msg().sites.search.name

export const searchUrl = (q: string) => `${SEARCH_HOME}/search?q=${q.trim()}`

/** 검색 결과 주소면 검색어 */
export function parseSearch(url: string): string | null {
  const m = normalizeUrl(url).match(/^www\.nachimban\.com\/search\?q=(.*)$/)
  return m ? m[1].trim() : null
}

export const isSearchHost = (url: string) => normalizeUrl(url).split('/')[0] === SEARCH_HOME

/** 주소처럼 생겼나 (아니면 검색어로 본다) */
export function looksLikeUrl(input: string): boolean {
  const t = input.trim().replace(/^https?:\/\//i, '')
  return !/\s/.test(t) && /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(t)
}

export interface SearchResult {
  url: string
  title: string
  snippet: string
}

/** 모든 낱말이 들어 있는 페이지만. 제목·주소에 있으면 점수를 더 준다 */
export function search(pages: Record<string, string>, query: string): SearchResult[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  const scored: (SearchResult & { score: number })[] = []
  for (const [key, full] of Object.entries(pages)) {
    const body = indexed(full)
    const url = normalizeUrl(key)
    const host = url.split('/')[0].replace(/^www\./, '')
    const path = url.split('/').slice(1).join('/')
    const title = siteTitle(host, body, path)
    const text = body.toLowerCase()
    let score = 0
    let all = true
    for (const t of terms) {
      const inTitle = title.toLowerCase().includes(t)
      const inUrl = url.includes(t)
      const hits = text.split(t).length - 1
      if (!inTitle && !inUrl && !hits) all = false
      score += (inTitle ? 5 : 0) + (inUrl ? 3 : 0) + Math.min(hits, 3)
    }
    if (all) scored.push({ url, title, snippet: snippet(body, terms), score })
  }
  return scored.sort((a, b) => b.score - a.score || a.url.localeCompare(b.url)).map(({ url, title, snippet }) => ({ url, title, snippet }))
}

/** 검색에 걸리는 글. 하이라이트(스토리) 안의 글은 눌러 봐야 보이는 것이라 빼고 제목 줄만 남긴다 */
function indexed(body: string): string {
  let hidden = false
  return body
    .split('\n')
    .filter((l) => {
      const sec = l.trim().match(/^\[(.+?)\]/)
      if (sec) hidden = sec[1].includes('하이라이트')
      return !hidden || !!sec
    })
    .join('\n')
}

/** 첫 낱말이 나오는 줄 둘레 (없으면 본문 앞부분). 메뉴 줄과 [제목] 괄호는 뺀다 */
function snippet(body: string, terms: string[]): string {
  const lines = body
    .split('\n')
    .slice(1)
    .map((l) => l.trim().replace(/^\[(.+?)\]\s*/, '$1 '))
    .filter((l) => l && !/\s{2,}www\./.test(l))
  const hit = lines.find((l) => terms.some((t) => l.toLowerCase().includes(t)))
  const line = hit ?? lines.slice(0, 2).join(' · ')
  if (line.length <= 90) return line
  const at = hit ? Math.max(0, hit.toLowerCase().indexOf(terms.find((t) => hit.toLowerCase().includes(t))!) - 30) : 0
  return `${at > 0 ? '…' : ''}${line.slice(at, at + 90)}…`
}
