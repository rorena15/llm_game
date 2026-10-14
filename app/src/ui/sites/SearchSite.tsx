// 검색 포털 화면: 첫 화면(로고와 검색창), 결과 목록
import { useState } from 'react'
import { brand } from './parse'
import { useT } from '../../i18n'
import { search, searchName, searchUrl } from './search'

interface Props {
  query: string | null
  pages: Record<string, string>
  go: (url: string) => void
}

function Logo({ big }: { big?: boolean }) {
  useT()
  return (
    <span className={`nb-logo${big ? ' big' : ''}`}>
      <i>🧭</i>
      {searchName()}
    </span>
  )
}

function SearchBox({ initial, go, big }: { initial: string; go: (u: string) => void; big?: boolean }) {
  const t = useT().sites.search
  const [q, setQ] = useState(initial)
  return (
    <form
      className={`nb-box${big ? ' big' : ''}`}
      onSubmit={(e) => {
        e.preventDefault()
        if (q.trim()) go(searchUrl(q))
      }}
    >
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.placeholder} spellCheck={false} />
      <button>{t.button}</button>
    </form>
  )
}

const host = (url: string) => url.split('/')[0].replace(/^www\./, '')

export function SearchSite({ query, pages, go }: Props) {
  const t = useT().sites.search
  if (query === null)
    return (
      <article className="s-search home">
        <Logo big />
        <SearchBox initial="" go={go} big />
        <p className="nb-tip">{t.homeTip}</p>
      </article>
    )

  const results = search(pages, query)
  return (
    <article className="s-search">
      <header className="nb-head">
        <button className="link-word" onClick={() => go('www.nachimban.com')}>
          <Logo />
        </button>
        <SearchBox key={query} initial={query} go={go} />
      </header>
      <div className="nb-tabs">
        <span className="on">{t.tabAll}</span>
        <span>{t.tabImages}</span>
        <span>{t.tabNews}</span>
        <span>{t.tabMaps}</span>
      </div>
      <div className="nb-results">
        {results.length ? (
          <>
            <small className="nb-count">{t.resultCount(results.length)}</small>
            {results.map((r) => (
              <div key={r.url} className="nb-result">
                <div className="nb-site">
                  <span className="fav" style={{ background: brand(host(r.url)) }}>
                    {host(r.url)[0].toUpperCase()}
                  </span>
                  <span>
                    <b>{host(r.url)}</b>
                    <small>https://{r.url}</small>
                  </span>
                </div>
                <button className="link-word nb-title" data-url={r.url} onClick={() => go(r.url)}>
                  {r.title}
                </button>
                <p>{r.snippet}</p>
              </div>
            ))}
          </>
        ) : (
          <div className="nb-empty">
            <b>{t.noResults(query)}</b>
            <ul>
              <li>{t.tip1}</li>
              <li>{t.tip2}</li>
            </ul>
          </div>
        )}
      </div>
      <footer className="nb-foot">© {searchName()}</footer>
    </article>
  )
}
