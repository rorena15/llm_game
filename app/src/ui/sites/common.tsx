// 사이트 틀이 함께 쓰는 글 조각: 단서·링크가 살아 있는 글
import type { ReactNode } from 'react'
import { ClueText } from '../ClueText'
import type { SiteProps } from './parse'

/** 글 조각. 단서 낱말과 본문 속 주소가 눌린다 */
export function T({ p, text }: { p: SiteProps; text: string }) {
  return (
    <ClueText
      text={text}
      clues={p.clues}
      collected={(id) => p.run.hasCard(id)}
      onClue={(id) => p.run.collectClue(id)}
      onLink={p.go}
    />
  )
}

export function Go({ p, url, children, className }: { p: SiteProps; url: string; children: ReactNode; className?: string }) {
  return (
    <button className={`link-word ${className ?? ''}`} data-url={url} onClick={() => p.go(url)}>
      {children}
    </button>
  )
}
