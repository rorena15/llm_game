// 회사 홈페이지 (CorpX): 위쪽 메뉴, 첫 화면(배너·사업·숫자·소식·알림·보도자료), 게시판(눌러서 펼침),
// 연혁, 표, 조직도(본부 → 팀 → 구성원, 인원 합계)
import { useState, type ReactNode } from 'react'
import { normalizeUrl } from '../../game/run'
import { useT } from '../../i18n'
import { Go, T } from './common'
import { cells, NAV_LINE, sections, seeded, type Section, type SiteProps } from './parse'

interface OrgNode {
  dept: string
  /** 책임자 또는 구성원 이름 */
  name: string
  count: number | null
  kids: OrgNode[]
}

/** 들여쓰기 두 칸마다 한 단계 아래. 칸은 두 칸 이상 띄움: "부서  책임자  인원" 또는 구성원 이름만 */
function orgTree(lines: string[]): OrgNode[] | null {
  const rows = lines.filter((l) => !NAV_LINE.test(l.trim()))
  if (rows.length < 3 || !rows.some((l) => /^\s/.test(l))) return null
  const split = rows.map((l) => l.trim().split(/\s{2,}/))
  if (split.filter((s) => s.length >= 2).length < rows.length / 2) return null
  const roots: OrgNode[] = []
  const stack: OrgNode[] = []
  rows.forEach((l, i) => {
    const depth = Math.floor((l.length - l.trimStart().length) / 2)
    const s = split[i]
    const count = s[2]?.match(/^(\d+)명$/)
    const node: OrgNode =
      s.length >= 2
        ? { dept: s[0], name: s[1], count: count ? Number(count[1]) : null, kids: [] }
        : { dept: '', name: s[0], count: null, kids: [] }
    stack.length = depth
    if (depth > 0 && stack[depth - 1]) stack[depth - 1].kids.push(node)
    else roots.push(node)
    stack[depth] = node
  })
  return roots
}

/** 팀 인원의 합 (구성원 줄은 팀 인원 안에 있다) */
const teamSum = (n: OrgNode): number => n.kids.reduce((a, k) => a + (k.count ?? teamSum(k)), 0)
/** 맨 위 단계(대표·본부장) 한 명씩과 그 아래 팀 인원 */
const headcount = (roots: OrgNode[]) => roots.reduce((a, r) => a + 1 + teamSum(r), 0)

/** "본사: 서울 강남구" 꼴 */
const KV = /^([^:：]{1,10})[:：]\s*(.+)$/
const DATE_TAG = /^\d{4}\.\d{2}\.\d{2}$/

export function CorpSite(p: SiteProps) {
  const t = useT().sites.corp
  const brand = p.host.split('.')[0]
  const brandName = brand === 'corpx' ? 'CorpX' : brand
  const home = `www.${p.host}`
  const homeParts = sections(p.find(home) ?? '').parts
  const menuSec = homeParts.find((s) => s.tag === '메뉴')
  const menu = (menuSec?.lines ?? [])
    .map((l) => l.trim().match(NAV_LINE))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ label: m[1].trim(), url: m[2] }))
  const menuUrl = (label: string) => menu.find((m) => m.label === label)?.url
  const isHomeUrl = (u: string) => normalizeUrl(u) === normalizeUrl(home)

  const { head, parts } = sections(p.body)
  const isHome = p.path === ''
  const pageTitle = head.replace(new RegExp(`^${brandName}\\s*`), '') || brandName
  const content = parts.filter((s) => s.tag !== '메뉴')
  const intro = content.find((s) => s.tag === null)
  const rest = content.filter((s) => s.tag !== null)
  const board = !isHome && rest.length >= 2 && rest.every((s) => s.title)

  const renderLines = (lines: string[]): ReactNode[] => {
    const out: ReactNode[] = []
    const org = orgTree(lines)
    if (org) return [<OrgChart key="org" p={p} roots={org} />]
    let kv: [string, string][] = []
    let table: string[][] = []
    let links: { label: string; url: string }[] = []
    const flush = () => {
      if (kv.length) {
        const rows = kv
        out.push(
          isHome ? (
            <div key={`s${out.length}`} className="corp-stats">
              {rows.map(([k, v]) => (
                <div key={k}>
                  <b>
                    <T p={p} text={v} />
                  </b>
                  <small>{k}</small>
                </div>
              ))}
            </div>
          ) : (
            <dl key={`k${out.length}`} className="corp-info">
              {rows.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>
                    <T p={p} text={v} />
                  </dd>
                </div>
              ))}
            </dl>
          ),
        )
      }
      if (table.length) {
        const rows = table
        const years = rows.every((r) => /^\d{4}$/.test(r[0]))
        out.push(
          years ? (
            <ol key={`y${out.length}`} className="corp-timeline">
              {rows.map((r, i) => (
                <li key={i}>
                  <b>{r[0]}</b>
                  <span>
                    <T p={p} text={r.slice(1).join(' ')} />
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <table key={`t${out.length}`} className="corp-table">
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j} className={c === '마감' ? 'closed' : /마감|상시/.test(c) ? 'due' : ''}>
                        <T p={p} text={c} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ),
        )
      }
      if (links.length) {
        const ls = links
        out.push(
          isHome ? (
            <div key={`c${out.length}`} className="corp-cards">
              {ls.map((l, i) => {
                const [title, desc] = l.label.split(' · ')
                return (
                  <Go key={i} p={p} url={l.url} className="corp-card">
                    <b>{title}</b>
                    {desc && <small>{desc}</small>}
                    <i>{t.detail}</i>
                  </Go>
                )
              })}
            </div>
          ) : (
            <p key={`l${out.length}`} className="corp-links">
              {ls.map((l, i) => (
                <Go key={i} p={p} url={l.url}>
                  {l.label} →
                </Go>
              ))}
            </p>
          ),
        )
      }
      kv = []
      table = []
      links = []
    }
    lines.forEach((line, i) => {
      const t = line.trim()
      const nav = t.match(NAV_LINE)
      if (nav) {
        if (!isHomeUrl(nav[2])) links.push({ label: nav[1].trim(), url: nav[2] })
        return
      }
      const c = cells(line)
      if (c) return void table.push(c)
      const m = t.match(KV)
      if (m && !/www\./.test(t)) return void kv.push([m[1].trim(), m[2]])
      flush()
      if (t.startsWith('- '))
        out.push(
          <div key={i} className="corp-bullet">
            <span className="dot" />
            <span>
              <T p={p} text={t.slice(2)} />
            </span>
          </div>,
        )
      else
        out.push(
          <p key={i}>
            <T p={p} text={t} />
          </p>,
        )
    })
    flush()
    return out
  }

  // 첫 화면의 알림 상자: 알림 페이지의 제목 몇 개
  const noticeUrl = menuUrl('알림')
  const noticeTitles = noticeUrl ? sections(p.find(noticeUrl) ?? '').parts.filter((s) => s.title).slice(0, 4) : []

  return (
    <article className="s-corp">
      <header className="corp-gnb">
        <Go p={p} url={home} className="corp-logo">
          <span className="mark" />
          {brandName}
        </Go>
        <nav>
          {menu.map((m) => (
            <Go key={m.url} p={p} url={m.url} className={normalizeUrl(m.url) === normalizeUrl(p.pageKey) ? 'on' : ''}>
              {m.label}
            </Go>
          ))}
        </nav>
      </header>

      {isHome ? (
        <section className="corp-hero">
          <small>{brandName.toUpperCase()}</small>
          <h1>{intro?.lines[0] ? <T p={p} text={intro.lines[0].trim()} /> : brandName}</h1>
          {intro && intro.lines.length > 1 && <div className="hero-sub">{renderLines(intro.lines.slice(1))}</div>}
        </section>
      ) : (
        <section className="corp-band">
          <small>
            <Go p={p} url={home}>
              {t.home}
            </Go>{' '}
            › {pageTitle}
          </small>
          <h1>
            <T p={p} text={pageTitle} />
          </h1>
        </section>
      )}

      <div className="corp-body">
        {!isHome && intro && renderLines(intro.lines)}
        {board ? (
          <Board p={p} items={rest} render={renderLines} />
        ) : (
          rest.map((s, i) => (
            <section key={i} className="corp-sec">
              <h2>
                {s.tag}
                {s.title && (
                  <small>
                    <T p={p} text={s.title} />
                  </small>
                )}
              </h2>
              {renderLines(s.lines)}
            </section>
          ))
        )}
        {isHome && noticeTitles.length > 0 && noticeUrl && (
          <section className="corp-sec">
            <h2>
              {t.notices}
              <Go p={p} url={noticeUrl} className="more">
                {t.more}
              </Go>
            </h2>
            <ul className="corp-mini">
              {noticeTitles.map((s, i) => (
                <li key={i}>
                  <span className={`corp-badge${s.tag === '필독' ? ' hot' : ''}`}>{s.tag}</span>
                  <Go p={p} url={noticeUrl}>
                    {s.title}
                  </Go>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <footer className="corp-foot">
        <b>{brandName}</b>
        <span>{t.footerLinks}</span>
        <small>{t.footerAddress(brandName)}</small>
        <small>{t.copyright(brandName)}</small>
      </footer>
    </article>
  )
}

/** 게시판: 번호·꼬리표·제목·조회. 제목을 누르면 본문이 펼쳐진다 (처음에는 맨 위 글만) */
function Board({ p, items, render }: { p: SiteProps; items: Section[]; render: (lines: string[]) => ReactNode[] }) {
  const t = useT().sites.corp
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]))
  const toggle = (i: number) =>
    setOpen((o) => {
      const n = new Set(o)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })
  return (
    <div className="corp-board">
      <div className="board-head">
        <span>{t.boardNo}</span>
        <span>{t.boardTitle}</span>
        <span>{t.boardViews}</span>
      </div>
      <ul>
        {items.map((s, i) => {
          const date = DATE_TAG.test(s.tag ?? '')
          return (
            <li key={i} className={open.has(i) ? 'open' : ''}>
              <div className="row" onClick={() => toggle(i)}>
                <span className="no">{items.length - i}</span>
                <span className="subject">
                  {!date && <span className={`corp-badge${s.tag === '필독' ? ' hot' : ''}`}>{s.tag}</span>}
                  <b>
                    <T p={p} text={s.title} />
                  </b>
                  {date && <time>{s.tag}</time>}
                </span>
                <span className="views">{Math.round(30 + seeded(s.title) * 900)}</span>
              </div>
              {open.has(i) && <div className="post">{render(s.lines)}</div>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function OrgChart({ p, roots }: { p: SiteProps; roots: OrgNode[] }) {
  const t = useT().sites.corp
  const total = headcount(roots)
  const [ceo, ...divisions] = roots
  const teamCount = roots.reduce((a, r) => a + r.kids.length, 0)
  const text = (t: string) => <T p={p} text={t} />
  return (
    <div className="corp-org">
      <p className="org-summary">
        {t.employees} <b>{t.people(total)}</b>
        {t.orgRest(divisions.length, teamCount)}
      </p>
      {ceo && (
        <div className="org-ceo">
          <div className="org-card top">
            <small>{text(ceo.dept)}</small>
            <b>{text(ceo.name)}</b>
          </div>
          {ceo.kids.length > 0 && (
            <div className="org-staff">
              {ceo.kids.map((k, i) => (
                <div key={i} className="org-card">
                  <small>{text(k.dept)}</small>
                  <b>{text(k.name)}</b>
                  {k.count !== null && <em>{t.people(k.count)}</em>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="org-divisions">
        {divisions.map((d, i) => (
          <section key={i} className="org-division">
            <header>
              <b>{text(d.dept)}</b>
              <small>{text(d.name)}</small>
              <em>{t.people(teamSum(d) + 1)}</em>
            </header>
            <ul>
              {d.kids.map((t, j) => (
                <li key={j}>
                  <div className="team">
                    <span>{text(t.dept)}</span>
                    <small>{text(t.name)}</small>
                    {t.count !== null && <em>{t.count}</em>}
                  </div>
                  {t.kids.length > 0 && (
                    <div className="members">
                      {t.kids.map((m, k) => (
                        <span key={k}>{text(m.name)}</span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
