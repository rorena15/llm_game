import type { ReactNode } from 'react'
import type { ClueSpec } from '../engine/types'

interface Props {
  text: string
  /** 이 문서에서 나오는 단서들 */
  clues: ClueSpec[]
  collected: (id: string) => boolean
  onClue: (id: string) => void
}

/** 본문에서 단서 낱말을 눌러서 수집할 수 있게 표시한다 */
export function ClueText({ text, clues, collected, onClue }: Props) {
  const withKey = clues.filter((c) => c.keyword && text.includes(c.keyword))
  if (!withKey.length) return <>{text}</>

  const parts: ReactNode[] = []
  let rest = text
  let k = 0
  while (rest) {
    let best: { i: number; c: ClueSpec } | null = null
    for (const c of withKey) {
      const i = rest.indexOf(c.keyword!)
      if (i >= 0 && (!best || i < best.i)) best = { i, c }
    }
    if (!best) {
      parts.push(rest)
      break
    }
    const { i, c } = best
    if (i > 0) parts.push(rest.slice(0, i))
    const got = collected(c.id)
    parts.push(
      <button
        key={k++}
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
