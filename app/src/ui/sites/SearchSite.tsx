// 검색 포털 화면: 첫 화면(로고와 검색창), 결과 목록
import { useState } from 'react'
import { brand } from './parse'
import { search, SEARCH_NAME, searchUrl } from './search'

interface Props {
  query: string | null
  pages: Record<string, string>
  go: (url: string) => void
}

function Logo({ big }: { big?: boolean }) {
  return (
    <span className={`nb-logo${big ? ' big' : ''}`}>
      <i>🧭</i>
      {SEARCH_NAME}
    </span>
  )
}

function SearchBox({ initial, go, big }: { initial: string; go: (u: string) => void; big?: boolean }) {
  const [q, setQ] = useState(initial)
  return (
    <form
      className={`nb-box${big ? ' big' : ''}`}
      onSubmit={(e) => {
        e.preventDefault()
        if (q.trim()) go(searchUrl(q))
      }}
    >
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색어를 입력하세요" spellCheck={false} />
      <button>검색</button>
    </form>
  )
}

const host = (url: string) => url.split('/')[0].replace(/^www\./, '')

export function SearchSite({ query, pages, go }: Props) {
  if (query === null)
    return (
      <article className="s-search home">
        <Logo big />
        <SearchBox initial="" go={go} big />
        <p className="nb-tip">사람 이름, 아이디, 학교·회사 이름으로 찾아보세요.</p>
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
        <span className="on">통합</span>
        <span>이미지</span>
        <span>뉴스</span>
        <span>지도</span>
      </div>
      <div className="nb-results">
        {results.length ? (
          <>
            <small className="nb-count">검색 결과 {results.length}건</small>
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
            <b>'{query}'에 대한 검색 결과가 없습니다.</b>
            <ul>
              <li>낱말의 철자가 맞는지, 더 짧은 낱말로도 찾아보세요.</li>
              <li>메일이나 대화에서 알게 된 이름이나 아이디로 찾아보세요.</li>
            </ul>
          </div>
        )}
      </div>
      <footer className="nb-foot">© {SEARCH_NAME}</footer>
    </article>
  )
}
