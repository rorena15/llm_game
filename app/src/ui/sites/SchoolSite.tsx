// 학교 홈페이지 (hanbit-es.kr): 교표와 학교 이름, 위쪽 메뉴, 게시판 글 보기, 수상자 표, 아래 알림
import type { ReactNode } from 'react'
import { T } from './common'
import { cells, sections, seeded, type SiteProps } from './parse'

const GNB = ['학교 소개', '학교 소식', '교육 활동', '학부모 마당', '열린 마당']

export function SchoolSite(p: SiteProps) {
  const { head, parts } = sections(p.body)
  const [school, board = '학교 소식'] = head.split('·').map((s) => s.trim())
  const [post, ...more] = parts.filter((s) => s.tag !== null)
  const views = Math.round(40 + seeded(p.pageKey) * 300)

  const body = (lines: string[]) => {
    const out: ReactNode[] = []
    let table: string[][] = []
    const flush = () => {
      if (!table.length) return
      const rows = table
      out.push(
        <table key={`t${out.length}`} className="sch-table">
          <thead>
            <tr>
              <th>구분</th>
              <th colSpan={rows[0].length - 1}>내용</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>
                    <T p={p} text={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      )
      table = []
    }
    lines.forEach((l, i) => {
      const c = cells(l)
      if (c) return void table.push(c)
      flush()
      out.push(
        <p key={i} className={/["“]/.test(l) ? 'quote' : ''}>
          <T p={p} text={l.trim()} />
        </p>,
      )
    })
    flush()
    return out
  }

  return (
    <article className="s-school">
      <header className="sch-head">
        <span className="sch-emblem">{school[0]}</span>
        <div>
          <b>{school}</b>
          <small>꿈을 키우는 즐거운 배움터</small>
        </div>
      </header>
      <nav className="sch-gnb">
        {GNB.map((g) => (
          <span key={g} className={g === board ? 'on' : ''}>
            {g}
          </span>
        ))}
      </nav>
      <div className="sch-body">
        <small className="crumb">홈 › {board}</small>
        <h1 className="sch-board">{board}</h1>
        {post ? (
          <div className="sch-post">
            <div className="sch-title">
              <span className="cat">{post.tag}</span>
              <b>
                <T p={p} text={post.title} />
              </b>
            </div>
            <div className="sch-meta">
              <span>작성자 교무실</span>
              <span>조회 {views}</span>
            </div>
            <div className="sch-content">{body(post.lines)}</div>
          </div>
        ) : (
          <div className="sch-content">{body(parts[0]?.lines ?? [])}</div>
        )}
        {more.length > 0 && (
          <ul className="sch-list">
            {more.map((s, i) => (
              <li key={i}>
                <span className="cat">{s.tag}</span>
                <T p={p} text={s.title} />
                {s.lines.map((l, j) => (
                  <p key={j}>
                    <T p={p} text={l} />
                  </p>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>
      <footer className="sch-foot">
        {school} · 행정실 · 교무실
        <br />
        Copyright © {school}. All rights reserved.
      </footer>
    </article>
  )
}
