// 학교 홈페이지 (hanbit-es.kr): 교표와 학교 이름, 위쪽 메뉴, 게시판 글 보기, 수상자 표, 아래 알림
import type { ReactNode } from 'react'
import { siteImage } from '../../game/siteImages'
import { useT } from '../../i18n'
import { T } from './common'
import { cells, sections, seeded, type SiteProps } from './parse'

export function SchoolSite(p: SiteProps) {
  const t = useT().sites.school
  const { head, parts } = sections(p.body)
  const [school, board = t.gnb[1]] = head.split('·').map((s) => s.trim())
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
              <th>{t.category}</th>
              <th colSpan={rows[0].length - 1}>{t.details}</th>
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
          <small>{t.slogan}</small>
        </div>
      </header>
      <nav className="sch-gnb">
        {t.gnb.map((g) => (
          <span key={g} className={g === board ? 'on' : ''}>
            {g}
          </span>
        ))}
      </nav>
      <div className="sch-body">
        <small className="crumb">{t.home} › {board}</small>
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
              <span>{t.author}</span>
              <span>{t.views(views)}</span>
            </div>
            {siteImage(p.pageKey, 'photo') && <img className="sch-photo" src={siteImage(p.pageKey, 'photo')!} alt="" />}
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
        {t.footer(school)}
        <br />
        Copyright © {school}. All rights reserved.
      </footer>
    </article>
  )
}
