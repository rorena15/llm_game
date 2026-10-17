// 회사 홈페이지 (CorpX): 위쪽 메뉴와 펼침 메뉴, 첫 화면(슬라이드·사업·숫자·뉴스룸·알림·고객사), 하위 페이지 옆 메뉴,
// 게시판(눌러서 펼침), 연혁, 표, 조직도(본부 → 팀 → 구성원, 인원 합계), 사이트맵 푸터, 쿠키 안내
import { useEffect, useState, type ReactNode } from 'react'
import { normalizeUrl } from '../../game/run'
import { msg, useT } from '../../i18n'
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
    const count = s[2]?.match(msg().sites.marks.headcount)
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
const KV = /^([^:：]{1,20})[:：]\s*(.+)$/
const DATE_TAG = /^\d{4}\.\d{2}\.\d{2}$/

interface MenuItem {
  label: string
  url: string
  kids: MenuItem[]
}

/** [메뉴]: 들여쓰지 않은 줄은 대메뉴, 들여쓴 줄은 그 아래 메뉴 */
function parseMenu(lines: string[]): MenuItem[] {
  const out: MenuItem[] = []
  for (const l of lines) {
    const m = l.trim().match(NAV_LINE)
    if (!m) continue
    const item = { label: m[1].trim(), url: m[2], kids: [] }
    if (/^\s/.test(l) && out.length) out[out.length - 1].kids.push(item)
    else out.push(item)
  }
  return out
}

/** 쿠키 안내는 한 번 닫으면 이번 실행 동안 다시 띄우지 않는다 */
let cookieClosed = false
const SLIDE_MS = 5000

export function CorpSite(p: SiteProps) {
  const t = useT().sites.corp
  const mk = useT().sites.marks
  const brand = p.host.split('.')[0]
  const brandName = brand === 'corpx' ? 'CorpX' : brand
  const home = `www.${p.host}`
  const homeParts = sections(p.find(home) ?? '').parts
  const groups = parseMenu(homeParts.find((s) => s.tag === mk.menu)?.lines ?? [])
  const flat = groups.flatMap((g) => [g, ...g.kids])
  const menuUrl = (label: string) => flat.find((m) => m.label === label)?.url
  const same = (a: string, b: string) => normalizeUrl(a) === normalizeUrl(b)
  const isHomeUrl = (u: string) => same(u, home)
  const here = normalizeUrl(p.pageKey)
  const group = groups.find((g) => same(g.url, here) || g.kids.some((k) => same(k.url, here)))
  const [cookie, setCookie] = useState(!cookieClosed)

  const { head, parts } = sections(p.body)
  const isHome = p.path === ''
  const pageTitle = head.replace(new RegExp(`^${brandName}\\s*`), '') || brandName
  const content = parts.filter((s) => s.tag !== mk.menu && !(isHome && (s.tag === mk.slides || s.tag === mk.clients)))
  const intro = content.find((s) => s.tag === null)
  const rest = content.filter((s) => s.tag !== null)
  const board = !isHome && rest.length >= 2 && rest.every((s) => s.title)
  const slides = (parts.find((s) => isHome && s.tag === mk.slides)?.lines ?? [])
    .map((l) => l.trim().match(NAV_LINE))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => {
      const [title, desc] = m[1].split(' · ')
      return { title: title.trim(), desc: desc?.trim() ?? '', url: m[2] }
    })
  const clients = isHome ? (parts.find((s) => s.tag === mk.clients)?.lines.map((l) => l.trim()) ?? []) : []

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
                      <td key={j} className={c === mk.closed ? 'closed' : c.includes(mk.closed) || c.includes(mk.ongoing) ? 'due' : ''}>
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

  // 첫 화면의 알림 상자와 뉴스룸 카드: 알림·보도자료 페이지의 글 몇 개
  const noticeUrl = menuUrl(mk.notices)
  const noticeTitles = noticeUrl ? sections(p.find(noticeUrl) ?? '').parts.filter((s) => s.title).slice(0, 4) : []
  const pressUrl = menuUrl(mk.press)
  const pressItems = pressUrl
    ? sections(p.find(pressUrl) ?? '')
        .parts.filter((s) => s.title && DATE_TAG.test(s.tag ?? ''))
        .slice(0, 3)
    : []

  const body = board ? (
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
  )

  return (
    <article className="s-corp">
      <div className="corp-util">
        {t.langs.map((l, i) => (
          <span key={l} className={i === 0 ? 'on' : ''}>
            {l}
          </span>
        ))}
      </div>
      <header className="corp-gnb">
        <Go p={p} url={home} className="corp-logo">
          <span className="mark" />
          {brandName}
        </Go>
        <nav>
          {groups.map((g) => (
            <Go key={g.url} p={p} url={g.url} className={g === group ? 'on' : ''}>
              {g.label}
            </Go>
          ))}
        </nav>
        {groups.some((g) => g.kids.length) && (
          <div className="corp-mega">
            {groups.map((g) => (
              <div key={g.url}>
                <b>{g.label}</b>
                {g.kids.map((k) => (
                  <Go key={k.url + k.label} p={p} url={k.url}>
                    {k.label}
                  </Go>
                ))}
              </div>
            ))}
          </div>
        )}
      </header>

      {isHome ? (
        slides.length ? (
          <Carousel p={p} slides={slides} brandName={brandName} />
        ) : (
          <section className="corp-hero">
            <small>{brandName.toUpperCase()}</small>
            <h1>{intro?.lines[0] ? <T p={p} text={intro.lines[0].trim()} /> : brandName}</h1>
            {intro && intro.lines.length > 1 && <div className="hero-sub">{renderLines(intro.lines.slice(1))}</div>}
          </section>
        )
      ) : (
        <section className="corp-band">
          <small>
            <Go p={p} url={home}>
              {t.home}
            </Go>
            {group && !same(group.url, here) && (
              <>
                {' › '}
                <Go p={p} url={group.url}>
                  {group.label}
                </Go>
              </>
            )}{' '}
            › {pageTitle}
          </small>
          <h1>
            <T p={p} text={pageTitle} />
          </h1>
        </section>
      )}

      {isHome ? (
        <div className="corp-body">
          {slides.length > 0 && intro && intro.lines.length > 0 && <div className="corp-lead">{renderLines(intro.lines)}</div>}
          {body}
          {pressItems.length > 0 && pressUrl && (
            <section className="corp-sec">
              <h2>
                {t.newsroom}
                <Go p={p} url={pressUrl} className="more">
                  {t.more}
                </Go>
              </h2>
              <div className="corp-news">
                {pressItems.map((s, i) => (
                  <Go key={i} p={p} url={pressUrl} className="corp-news-card">
                    <span
                      className="thumb"
                      style={{ background: `hsl(${215 + Math.round(seeded(s.title) * 40)} 55% ${30 + Math.round(seeded(s.title, 1) * 20)}%)` }}
                    />
                    <time>{s.tag}</time>
                    <b>{s.title}</b>
                  </Go>
                ))}
              </div>
            </section>
          )}
          {noticeTitles.length > 0 && noticeUrl && (
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
                    <span className={`corp-badge${s.tag === mk.mustRead ? ' hot' : ''}`}>{s.tag}</span>
                    <Go p={p} url={noticeUrl}>
                      {s.title}
                    </Go>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {clients.length > 0 && (
            <section className="corp-clients">
              <h2>{t.clients}</h2>
              <div>
                {clients.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className={`corp-body${group?.kids.length ? ' with-lnb' : ''}`}>
          {group && group.kids.length > 0 && (
            <aside className="corp-lnb">
              <b>{group.label}</b>
              {group.kids.map((k) => (
                <Go key={k.url + k.label} p={p} url={k.url} className={same(k.url, here) ? 'on' : ''}>
                  {k.label}
                </Go>
              ))}
            </aside>
          )}
          <div className="corp-main">
            {intro && renderLines(intro.lines)}
            {body}
          </div>
        </div>
      )}

      <footer className="corp-foot">
        {groups.length > 0 && (
          <div className="corp-sitemap">
            {groups.map((g) => (
              <div key={g.url}>
                <Go p={p} url={g.url}>
                  {g.label}
                </Go>
                {g.kids.map((k) => (
                  <Go key={k.url + k.label} p={p} url={k.url}>
                    {k.label}
                  </Go>
                ))}
              </div>
            ))}
          </div>
        )}
        <div className="corp-foot-bottom">
          <div>
            <b>{brandName}</b>
            <p className="policy">
              {t.footerPolicy.map((x, i) => (
                <span key={x} className={i === 0 ? 'strong' : ''}>
                  {x}
                </span>
              ))}
            </p>
            <small>{t.footerAddress(brandName)}</small>
            <small>{t.footerBiz}</small>
            <small>{t.copyright(brandName)}</small>
          </div>
          <select aria-label={t.familySite} defaultValue="">
            <option value="" disabled>
              {t.familySite}
            </option>
            {t.families.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
      </footer>

      <button className="corp-top" title={t.top} onClick={(e) => e.currentTarget.closest('.s-corp')?.scrollIntoView({ block: 'start' })}>
        ↑
      </button>
      {cookie && (
        <div className="corp-cookie">
          <span>{t.cookie}</span>
          <button className="ghost">{t.cookieSet}</button>
          <button
            onClick={() => {
              cookieClosed = true
              setCookie(false)
            }}
          >
            {t.cookieOk}
          </button>
        </div>
      )}
    </article>
  )
}

/** 첫 화면 슬라이드: 5초마다 넘어가고, 점·화살표로 고른다. 마우스를 올리면 멈춘다 */
function Carousel({ p, slides, brandName }: { p: SiteProps; slides: { title: string; desc: string; url: string }[]; brandName: string }) {
  const t = useT().sites.corp
  const [at, setAt] = useState(0)
  const [hover, setHover] = useState(false)
  const [stopped, setStopped] = useState(false)
  const paused = hover || stopped
  useEffect(() => {
    if (paused || slides.length < 2) return
    const timer = setInterval(() => setAt((i) => (i + 1) % slides.length), SLIDE_MS)
    return () => clearInterval(timer)
  }, [paused, slides.length])
  const i = at % slides.length
  const s = slides[i]
  const move = (d: number) => setAt((x) => (x + d + slides.length) % slides.length)
  return (
    <section className={`corp-hero slide-${i % 3}`} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <small>{brandName.toUpperCase()}</small>
      <h1 key={i}>
        <T p={p} text={s.title} />
      </h1>
      {s.desc && (
        <p className="hero-desc">
          <T p={p} text={s.desc} />
        </p>
      )}
      <Go p={p} url={s.url} className="hero-cta">
        {t.detail}
      </Go>
      <div className="hero-ctrl">
        <button title={t.prev} onClick={() => move(-1)}>
          ‹
        </button>
        {slides.map((_, k) => (
          <button key={k} className={`dot${k === i ? ' on' : ''}`} onClick={() => setAt(k)} aria-label={`${k + 1}`} />
        ))}
        <button title={t.next} onClick={() => move(1)}>
          ›
        </button>
        <button title={stopped ? t.play : t.pause} onClick={() => setStopped((v) => !v)}>
          {stopped ? '▶' : 'Ⅱ'}
        </button>
        <span className="count">
          {String(i + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
        </span>
      </div>
      <div className="hero-tabs">
        {/* 슬라이드 제목 띠: 누르면 그 슬라이드로 (주소는 '자세히 보기'로 연다) */}
        {slides.map((x, k) => (
          <button key={k} className={k === i ? 'on' : ''} data-url={x.url} onClick={() => setAt(k)}>
            {x.title}
          </button>
        ))}
      </div>
    </section>
  )
}

/** 게시판: 번호·꼬리표·제목·조회. 제목을 누르면 본문이 펼쳐진다 (처음에는 맨 위 글만) */
function Board({ p, items, render }: { p: SiteProps; items: Section[]; render: (lines: string[]) => ReactNode[] }) {
  const t = useT().sites.corp
  const mk = useT().sites.marks
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
                  {!date && <span className={`corp-badge${s.tag === mk.mustRead ? ' hot' : ''}`}>{s.tag}</span>}
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
