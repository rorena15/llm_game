import type { ReactNode } from 'react'
import type { ClueSpec } from '../engine/types'
import { URL_IN_TEXT } from '../game/sites'

interface Props {
  text: string
  /** 이 문서에서 나오는 단서들 */
  clues: ClueSpec[]
  collected: (id: string) => boolean
  onClue: (id: string) => void
  /** 있으면 본문 속 주소(www.…)를 눌러 브라우저로 갈 수 있다 */
  onLink?: (url: string) => void
}

/** 단서가 아닌 부분에서 주소를 링크로 바꾼다 */
function linkify(text: string, onLink: Props['onLink'], key: () => number): ReactNode[] {
  if (!onLink) return [text]
  const out: ReactNode[] = []
  let at = 0
  for (const m of text.matchAll(URL_IN_TEXT)) {
    const url = m[0].replace(/[.,)]+$/, '')
    if (m.index > at) out.push(text.slice(at, m.index))
    out.push(
      <button key={key()} className="link-word" onClick={() => onLink(url)}>
        {url}
      </button>,
    )
    at = m.index + url.length
  }
  if (at < text.length) out.push(text.slice(at))
  return out
}

/** 본문에서 단서 낱말을 눌러서 수집할 수 있게 표시한다 */
export function ClueText({ text, clues, collected, onClue, onLink }: Props) {
  let k = 0
  const key = () => k++
  const withKey = clues.filter((c) => c.keyword && text.includes(c.keyword))
  if (!withKey.length) return <>{linkify(text, onLink, key)}</>

  const parts: ReactNode[] = []
  let rest = text
  while (rest) {
    let best: { i: number; c: ClueSpec } | null = null
    for (const c of withKey) {
      const i = rest.indexOf(c.keyword!)
      if (i >= 0 && (!best || i < best.i)) best = { i, c }
    }
    if (!best) {
      parts.push(...linkify(rest, onLink, key))
      break
    }
    const { i, c } = best
    if (i > 0) parts.push(...linkify(rest.slice(0, i), onLink, key))
    const got = collected(c.id)
    parts.push(
      <button
        key={key()}
        className={`clue-word${got ? ' got' : ''}`}
        title={got ? `수집함: ${c.label}` : '단서로 수집'}
        onClick={() => onClue(c.id)}
      >
        {c.keyword}
      </button>,
    )
    rest = rest.slice(i + c.keyword!.length)
  }
  return <>{parts}</>
}
