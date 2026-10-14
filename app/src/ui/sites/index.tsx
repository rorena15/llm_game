// 브라우저 속 웹페이지. 본문은 시나리오의 일반 텍스트이고, 도메인마다 그 사이트다운 틀로 그린다.
// 틀이 없는 도메인은 GenericSite. 어느 틀이든 단서 낱말은 모두 눌리게 그려야 한다 (sites.test.tsx)
import type { ReactNode } from 'react'
import { useT } from '../../i18n'
import { ClubSite } from './ClubSite'
import { Go, T } from './common'
import { brand, NAV_LINE, sections, type SiteProps } from './parse'
import { CorpSite } from './CorpSite'
import { InstaSite } from './InstaSite'
import { SchoolSite } from './SchoolSite'
import './sites.css'

export type { SiteProps } from './parse'

const TEMPLATES: Record<string, (p: SiteProps) => ReactNode> = {
  'corpx.com': CorpSite,
  'instargram.com': InstaSite,
  'hanbit-es.kr': SchoolSite,
  'greenhill-cc.com': ClubSite,
}

export function Site(p: SiteProps) {
  const Tpl = TEMPLATES[p.host] ?? GenericSite
  return <Tpl {...p} />
}

/** 틀이 없는 사이트: 머리띠, 소제목, 목록, 메뉴 줄 */
function GenericSite(p: SiteProps) {
  const t = useT().sites.generic
  const { head, parts } = sections(p.body)
  return (
    <article className="site">
      <header className="site-head" style={{ background: brand(p.host) }}>
        <b>
          <T p={p} text={head} />
        </b>
        <small>{p.host}</small>
      </header>
      <div className="site-body">
        {parts.map((s, i) => {
          const navs = s.lines.map((l) => l.trim().match(NAV_LINE))
          const onlyNav = s.lines.length > 0 && navs.every(Boolean)
          return (
            <section key={i}>
              {s.tag && !(onlyNav && !s.title) && (
                <h3>
                  <span className="tag">{s.tag}</span>
                  {s.title && <T p={p} text={s.title} />}
                </h3>
              )}
              {s.lines.map((l, j) => {
                const nav = navs[j]
                if (nav)
                  return (
                    <Go key={j} p={p} url={nav[2]} className="nav-item">
                      {nav[1].trim()}
                    </Go>
                  )
                return (
                  <p key={j} className={l.startsWith('- ') ? 'li' : ''}>
                    <T p={p} text={l.startsWith('- ') ? l.slice(2) : l} />
                  </p>
                )
              })}
            </section>
          )
        })}
      </div>
      <footer className="site-foot">{t.copyright(p.host)}</footer>
    </article>
  )
}
