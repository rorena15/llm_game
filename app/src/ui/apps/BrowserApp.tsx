import { useState, type ReactNode } from 'react'
import { normalizeUrl, useRun, type MissionRun } from '../../game/run'
import { findPage, HOME, SHARED_SITES, URL_IN_TEXT } from '../../game/sites'
import { useT } from '../../i18n'
import { Site } from '../sites'
import { brand, siteTitle } from '../sites/parse'
import { SearchSite } from '../sites/SearchSite'
import { isSearchHost, looksLikeUrl, parseSearch, SEARCH_HOME, searchName, searchUrl } from '../sites/search'

const host = (key: string) => key.split('/')[0].replace(/^www\./, '')
const path = (key: string) => key.split('/').slice(1).join('/')

export function BrowserApp({ run }: { run: MissionRun }) {
  useRun(run)
  const t = useT().apps.browser
  const { history, index } = run.browser
  const current = index >= 0 ? history[index] : null
  // 주소창은 이동할 때마다 지금 주소로 맞추고, 그 사이에는 플레이어가 고친다
  const [draft, setDraft] = useState<{ for: string | null; text: string }>({ for: current, text: current ?? '' })
  const url = draft.for === current ? draft.text : (current ?? '')
  const [showHistory, setShowHistory] = useState(false)
  const [hover, setHover] = useState<string | null>(null)
  // 페이지가 스크롤과 상관없이 보이는 영역 위에 띄울 것 (스토리 보기 등)
  const [layer, setLayer] = useState<HTMLDivElement | null>(null)

  const sites = run.scenario.websites
  const page = current ? findPage(sites, current) : null
  const knownHosts = new Set([...Object.keys(sites), ...Object.keys(SHARED_SITES)].map((k) => host(normalizeUrl(k))))
  const visited = [...new Set(history)].reverse()
  // 주소가 아니면 검색한다. www.를 빼고 써도 그 페이지가 있으면 연다
  const go = (u: string) => {
    const t = u.trim()
    if (!t) return
    setShowHistory(false)
    setHover(null)
    if (!looksLikeUrl(t)) return run.navigate(searchUrl(t))
    const bare = normalizeUrl(t)
    const withWww = `www.${bare}`
    run.navigate(!bare.startsWith('www.') && (findPage(sites, withWww) || isSearchHost(withWww)) ? withWww : t)
  }
  const onSearch = !!current && isSearchHost(current)
  const query = current ? parseSearch(current) : null
  const label = (u: string) => {
    const q = parseSearch(u)
    if (q !== null) return t.searchTitle(q, searchName())
    if (isSearchHost(u)) return searchName()
    const p = findPage(sites, u)
    return p ? siteTitle(host(normalizeUrl(p.key)), p.body, path(normalizeUrl(p.key))) : u
  }

  const tabTitle = showHistory
    ? t.history
    : current === null
      ? t.newTab
      : onSearch
        ? label(current)
        : page
        ? siteTitle(host(normalizeUrl(page.key)), page.body, path(normalizeUrl(page.key)))
        : knownHosts.has(host(current))
          ? t.notFoundTitle
          : t.unreachable
  const tabHost = showHistory || current === null ? null : host(current)

  let content: ReactNode
  if (showHistory)
    content = (
      <div className="newtab history">
        <h2>{t.history}</h2>
        <ul>
          {visited.map((u) => {
            return (
              <li key={u}>
                <button className="link-word" data-url={u} onClick={() => go(u)}>
                  {label(u)}
                </button>
                <small>{u}</small>
              </li>
            )
          })}
        </ul>
      </div>
    )
  else if (current === null) {
    const tiles = [SEARCH_HOME, HOME, ...visited.filter((u) => u !== HOME && findPage(sites, u))].slice(0, 8)
    content = (
      <div className="newtab">
        <span className="nb-logo big">
          <i>🧭</i>
          {searchName()}
        </span>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault()
            go(url)
          }}
        >
          <input
            value={url}
            onChange={(e) => setDraft({ for: current, text: e.target.value })}
            placeholder={t.newTabPlaceholder}
            spellCheck={false}
          />
        </form>
        <div className="tiles">
          {tiles.map((u) => (
            <button key={u} className="tile" data-url={u} onClick={() => go(u)}>
              <span className="fav" style={{ background: brand(host(u)) }}>
                {host(u)[0].toUpperCase()}
              </span>
              <small>{host(u)}</small>
            </button>
          ))}
        </div>
      </div>
    )
  } else if (onSearch)
    content = <SearchSite key={current} query={query} pages={{ ...SHARED_SITES, ...sites }} go={go} />
  else if (page)
    content = (
      <Site
        key={current}
        pageKey={normalizeUrl(page.key)}
        host={host(normalizeUrl(page.key))}
        path={path(normalizeUrl(page.key))}
        body={page.body}
        run={run}
        go={go}
        find={(u) => findPage(sites, u)?.body ?? null}
        layer={layer}
        clues={run.scenario.clues.filter((c) => normalizeUrl(c.source.replace(/^web:/, '')) === normalizeUrl(page.key))}
      />
    )
  else if (knownHosts.has(host(current)))
    content = (
      <div className="site-404">
        <h1>404</h1>
        <p>{t.notFoundText}</p>
        <small>{current}</small>
        <button className="link-word" onClick={() => go(host(current) === host(HOME) ? HOME : `www.${host(current)}`)}>
          {t.toHome}
        </button>
      </div>
    )
  else
    content = (
      <div className="neterr">
        <div className="neterr-icon">☹</div>
        <h2>{t.unreachable}</h2>
        <p>
          {t.dnsPre}
          <b>{host(current)}</b>
          {t.dnsPost}
        </p>
        <ul>
          <li>{t.tipTypo}</li>
          <li>{t.tipHistory}</li>
        </ul>
        <code>ERR_NAME_NOT_RESOLVED</code>
      </div>
    )

  return (
    <div className="browser">
      <div className="tabstrip">
        <div className="tab">
          {tabHost ? (
            <span className="fav" style={{ background: brand(tabHost) }}>
              {tabHost[0].toUpperCase()}
            </span>
          ) : (
            <span className="fav blank" />
          )}
          <span className="tab-title">{tabTitle}</span>
        </div>
      </div>
      <form
        className="urlbar"
        onSubmit={(e) => {
          e.preventDefault()
          go(url)
        }}
      >
        <button type="button" className="nav" title={t.back} disabled={index <= 0} onClick={() => run.goBack()}>
          ←
        </button>
        <button
          type="button"
          className="nav"
          title={t.forward}
          disabled={index >= history.length - 1}
          onClick={() => run.goForward()}
        >
          →
        </button>
        <button type="button" className="nav" title={t.home} onClick={() => go(HOME)}>
          ⌂
        </button>
        <div className="omnibox">
          <span className="lock" title={current ? t.secure : undefined}>
            {current && (page || onSearch) ? '🔒' : current ? 'ⓘ' : '🔍'}
          </span>
          <input
            value={url}
            onChange={(e) => setDraft({ for: current, text: e.target.value })}
            onFocus={(e) => e.currentTarget.select()}
            placeholder={t.urlPlaceholder}
            spellCheck={false}
          />
        </div>
        <button
          type="button"
          className={`nav${showHistory ? ' on' : ''}`}
          title={t.history}
          disabled={!visited.length}
          onClick={() => setShowHistory((v) => !v)}
        >
          ☰
        </button>
      </form>
      {current && !showHistory && <div key={`${current}#${index}`} className="loadbar" />}
      <div className="page-wrap">
        <div
          className="page"
          onMouseOver={(e) => {
            const b = (e.target as HTMLElement).closest<HTMLElement>('[data-url], .link-word')
            setHover(b ? (b.dataset.url ?? b.textContent?.match(URL_IN_TEXT)?.[0] ?? null) : null)
          }}
          onMouseLeave={() => setHover(null)}
        >
          <div key={`${current}#${showHistory}`} className="page-in">
            {content}
          </div>
        </div>
        <div className="page-layer" ref={setLayer} />
      </div>
      {hover && <div className="statusbar">https://{hover}</div>}
    </div>
  )
}
