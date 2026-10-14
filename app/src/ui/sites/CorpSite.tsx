// 회사 홈페이지 (CorpX): 위쪽 메뉴, 첫 화면 큰 배너와 소식, 소개 표, 알림 게시판, 조직도
import type { ReactNode } from 'react'
import { normalizeUrl } from '../../game/run'
import { Go, T } from './common'
import { NAV_LINE, sections, type SiteProps } from './parse'

interface OrgNode {
  dept: string
  name: string
  kids: OrgNode[]
}

/** 들여쓴 줄은 바로 위 줄의 아래 조직 ("대표이사  강태호" / "  비서실  정우진 대리" / "  이민수 사원") */
function orgTree(lines: string[]): OrgNode[] | null {
  const rows = lines.filter((l) => !NAV_LINE.test(l.trim()))
  const split = rows.map((l) => l.match(/^(\s*)(\S.*?)\s{2,}(\S.*)$/))
  // 줄 대부분이 "부서  이름" 꼴이고 들여쓴 줄이 있어야 조직도로 본다
  if (rows.length < 3 || split.filter(Boolean).length < rows.length / 2 || !rows.some((l) => /^\s/.test(l))) return null
  const roots: OrgNode[] = []
  rows.forEach((l, i) => {
    const m = split[i]
    const node: OrgNode = m ? { dept: m[2], name: m[3], kids: [] } : { dept: '', name: l.trim(), kids: [] }
    if (/^\s/.test(l) && roots.length) roots[roots.length - 1].kids.push(node)
    else roots.push(node)
  })
  return roots
}

/** "본사: 서울 강남구" 꼴 */
const KV = /^([^:：]{1,10})[:：]\s*(.+)$/

export function CorpSite(p: SiteProps) {
  const brand = p.host.split('.')[0]
  const brandName = brand === 'corpx' ? 'CorpX' : brand
  const home = `www.${p.host}`
  // 메뉴는 첫 화면의 메뉴 줄에서 가져온다
  const menu = (p.find(home) ?? '')
    .split('\n')
    .map((l) => l.trim().match(NAV_LINE))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ label: m[1].trim(), url: m[2] }))
  const inMenu = (u: string) => normalizeUrl(u) === normalizeUrl(home) || menu.some((m) => normalizeUrl(m.url) === normalizeUrl(u))

  const { head, parts } = sections(p.body)
  const isHome = p.path === ''
  const pageTitle = head.replace(new RegExp(`^${brandName}\\s*`), '') || brandName

  const renderLines = (lines: string[]): ReactNode[] => {
    const out: ReactNode[] = []
    const org = orgTree(lines)
    if (org)
      return [
        <div key="org" className="corp-org">
          {org.map((n, i) => (
            <div key={i} className="org-branch">
              <div className="org-card top">
                <small>
                  <T p={p} text={n.dept} />
                </small>
                <b>
                  <T p={p} text={n.name} />
                </b>
              </div>
              {n.kids.length > 0 && (
                <div className="org-kids">
                  {n.kids.map((k, j) => (
                    <div key={j} className="org-card">
                      {k.dept && (
                        <small>
                          <T p={p} text={k.dept} />
                        </small>
                      )}
                      <b>
                        <T p={p} text={k.name} />
                      </b>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>,
      ]
    let kv: [string, string][] = []
    const flushKv = () => {
      if (!kv.length) return
      const rows = kv
      out.push(
        <dl key={`kv${out.length}`} className="corp-info">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>
                <T p={p} text={v} />
              </dd>
            </div>
          ))}
        </dl>,
      )
      kv = []
    }
    lines.forEach((line, i) => {
      const nav = line.trim().match(NAV_LINE)
      if (nav) {
        flushKv()
        if (!inMenu(nav[2]))
          out.push(
            <p key={i}>
              <Go p={p} url={nav[2]}>
                {nav[1].trim()} →
              </Go>
            </p>,
          )
        return
      }
      const m = line.trim().match(KV)
      if (m && !/www\./.test(line)) {
        kv.push([m[1].trim(), m[2]])
        return
      }
      flushKv()
      if (line.startsWith('- '))
        out.push(
          <div key={i} className="corp-news">
            <span className="dot" />
            <T p={p} text={line.slice(2)} />
          </div>,
        )
      else
        out.push(
          <p key={i}>
            <T p={p} text={line} />
          </p>,
        )
    })
    flushKv()
    return out
  }

  // 메뉴 줄만 있는 덩어리([메뉴])는 위쪽 메뉴로 대신한다
  const content = parts.filter((s) => !s.lines.every((l) => NAV_LINE.test(l.trim()) && inMenu(l.trim().match(NAV_LINE)![2])))
  const intro = content.find((s) => s.tag === null)
  const rest = content.filter((s) => s.tag !== null)
  // 알림 게시판: 모든 덩어리가 [꼬리표] 제목 꼴이면 게시판 줄로
  const board = !isHome && rest.length >= 2 && rest.every((s) => s.title)

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
          <h1>{intro?.lines[0] ? <T p={p} text={intro.lines[0]} /> : brandName}</h1>
          {intro && intro.lines.length > 1 && <div className="hero-sub">{renderLines(intro.lines.slice(1))}</div>}
        </section>
      ) : (
        <section className="corp-band">
          <small>
            <Go p={p} url={home}>
              홈
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
          <ul className="corp-board">
            {rest.map((s, i) => (
              <li key={i}>
                <div className="row">
                  <span className={`corp-badge${s.tag === '필독' ? ' hot' : ''}`}>{s.tag}</span>
                  <b>
                    <T p={p} text={s.title} />
                  </b>
                </div>
                {renderLines(s.lines)}
              </li>
            ))}
          </ul>
        ) : (
          rest.map((s, i) => (
            <section key={i} className="corp-sec">
              <h2>
                {s.tag}
                {s.title && (
                  <>
                    {' '}
                    <T p={p} text={s.title} />
                  </>
                )}
              </h2>
              {renderLines(s.lines)}
            </section>
          ))
        )}
      </div>

      <footer className="corp-foot">
        <b>{brandName}</b>
        <span>개인정보처리방침 · 이용약관 · 윤리경영 · 고객센터</span>
        <small>© 2024 {brandName} Corp. All rights reserved.</small>
      </footer>
    </article>
  )
}
