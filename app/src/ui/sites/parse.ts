// 사이트 틀이 함께 쓰는 것: 본문 나누기, 꾸밈용 숫자·색, 탭 제목
import type { ClueSpec } from '../../engine/types'
import type { MissionRun } from '../../game/run'

export interface SiteProps {
  /** 시나리오의 원래 주소 키 (www.corpx.com/about) */
  pageKey: string
  host: string
  /** 주소의 경로 부분 ('' · 'about') */
  path: string
  body: string
  clues: ClueSpec[]
  run: MissionRun
  go: (url: string) => void
  /** 다른 페이지 본문 (메뉴를 만들 때) */
  find: (url: string) => string | null
  /** 보이는 영역 위에 띄우는 자리 (없으면 페이지 안에) */
  layer?: HTMLElement | null
}

/** "이름  www.주소" 꼴의 줄 (메뉴, 돌아가기) */
export const NAV_LINE = /^(.+?)\s{2,}(www\.\S+)$/

export interface Section {
  /** [제목] 안의 낱말. 첫 덩어리는 null */
  tag: string | null
  /** [제목] 뒤에 같은 줄로 이어진 글 */
  title: string
  lines: string[]
}

/** 첫 줄(사이트 제목)을 뺀 본문을 [제목] 줄로 나눈다. 빈 줄은 버린다 */
export function sections(body: string): { head: string; parts: Section[] } {
  const [head, ...rest] = body.split('\n')
  const parts: Section[] = [{ tag: null, title: '', lines: [] }]
  for (const raw of rest) {
    const line = raw.trimEnd()
    const m = line.match(/^\[(.+?)\]\s*(.*)$/)
    if (m) parts.push({ tag: m[1], title: m[2], lines: [] })
    else if (line.trim()) parts[parts.length - 1].lines.push(line)
  }
  return { head: head.trim(), parts: parts.filter((s) => s.tag !== null || s.lines.length) }
}

/** 칸을 세 칸 이상 띄워 나눈 줄이면 칸들 */
export const cells = (line: string): string[] | null => {
  const c = line.trim().split(/\s{3,}/)
  return c.length >= 2 ? c : null
}

/** 이름으로 정하는 0~1 사이 값 (꾸밈 숫자·색이 매번 같게) */
export function seeded(s: string, salt = 0): number {
  let n = 2166136261 ^ salt
  for (const ch of s) n = Math.imul(n ^ ch.charCodeAt(0), 16777619)
  return ((n >>> 0) % 10000) / 10000
}

/** 글 속 첫 그림 문자 */
export const firstEmoji = (s: string) => s.match(/\p{Extended_Pictographic}/u)?.[0] ?? null

/** 사이트별 대표 색 (탭 아이콘, 틀 없는 사이트의 머리띠). 없는 도메인은 이름으로 색을 정한다 */
const BRAND: Record<string, string> = {
  'corpx.com': '#1d3c78',
  'instargram.com': 'linear-gradient(135deg, #7b3fe4, #e1306c, #f77737)',
  'hanbit-es.kr': '#2f7d4f',
  'greenhill-cc.com': '#23422f',
  'nachimban.com': '#1f8a70',
}

export function brand(host: string): string {
  return BRAND[host] ?? `hsl(${Math.round(seeded(host) * 360)} 45% 32%)`
}

/** 탭에 보일 제목 */
export function siteTitle(host: string, body: string, path: string): string {
  const head = body.split('\n')[0].trim()
  if (host === 'instargram.com') {
    const handle = body.match(/^@(\S+)/m)?.[1] ?? path
    return `${handle} • Instargram 사진 및 동영상`
  }
  return head
}
