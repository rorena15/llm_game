// 골프장 홈페이지 (greenhill-cc.com): 짙은 초록과 금색, 세리프 글꼴, 순위표
import { useT } from '../../i18n'
import { T } from './common'
import { cells, sections, type SiteProps } from './parse'

export function ClubSite(p: SiteProps) {
  const t = useT().sites.club
  const { head, parts } = sections(p.body)
  const [club, page = ''] = head.split('·').map((s) => s.trim())
  const en = p.host.split('.')[0].replace(/-cc$/, '').toUpperCase()

  return (
    <article className="s-club">
      <header className="club-head">
        <div className="club-logo">
          <b>{en}</b>
          <small>COUNTRY CLUB</small>
        </div>
        <nav>
          {t.gnb.map((g) => (
            <span key={g} className={g === page ? 'on' : ''}>
              {g}
            </span>
          ))}
        </nav>
      </header>
      <section className="club-hero">
        <small>{club}</small>
        <h1>{page || club}</h1>
      </section>
      <div className="club-body">
        {parts.map((s, i) => {
          const rows = s.lines.map(cells)
          const table = s.lines.filter((_, j) => rows[j])
          const notes = s.lines.filter((_, j) => !rows[j])
          return (
            <section key={i} className="club-sec">
              {s.tag && (
                <h2>
                  {s.tag} {s.title && <T p={p} text={s.title} />}
                </h2>
              )}
              {table.length > 0 && (
                <table className="club-board">
                  <thead>
                    <tr>
                      <th>{t.rank}</th>
                      <th>{t.member}</th>
                      <th>{t.score}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.map((l, j) => {
                      const c = cells(l)!
                      return (
                        <tr key={j}>
                          {c.map((v, k) => (
                            <td key={k}>
                              {k === 0 ? (
                                <span className={`medal m${j + 1}`}>
                                  <T p={p} text={v} />
                                </span>
                              ) : (
                                <T p={p} text={v} />
                              )}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
              {notes.map((l, j) => (
                <p key={j} className={l.trim().startsWith('*') ? 'note' : ''}>
                  <T p={p} text={l.trim()} />
                </p>
              ))}
            </section>
          )
        })}
      </div>
      <footer className="club-foot">
        <b>{club}</b>
        <small>{t.footer}</small>
      </footer>
    </article>
  )
}
