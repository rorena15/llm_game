import { useState, type ReactNode } from 'react'
import type { ClueSpec } from '../../engine/types'
import { normalizeUrl, useRun, type MissionRun } from '../../game/run'
import { findPage, HOME, SHARED_SITES, URL_IN_TEXT } from '../../game/sites'
import { ClueText } from '../ClueText'

/** 사이트별 머리띠 색. 없는 도메인은 이름으로 색을 정한다 */
const BRAND: Record<string, string> = {
  'corpx.com': '#1d3c78',
  'instargram.com': 'linear-gradient(90deg, #7b3fe4, #e1306c, #f77737)',
  'hanbit-es.kr': '#2f7d4f',
  'greenhill-cc.com': '#23422f',
}

const host = (key: string) => key.split('/')[0].replace(/^www\./, '')

function brand(h: string): string {
  if (BRAND[h]) return BRAND[h]
  let n = 0
  for (const ch of h) n = (n * 31 + ch.charCodeAt(0)) % 360
  return `hsl(${n} 45% 32%)`
}

/** 페이지 첫 줄이 사이트 제목 */
const titleOf = (body: string) => body.split('\n')[0].trim()

/** "이름  www.주소" 꼴의 줄 (메뉴, 돌아가기) */
const NAV_LINE = /^(.+?)\s{2,}(www\.\S+)$/

interface PageProps {
  body: string
  pageKey: string
  clues: ClueSpec[]
  run: MissionRun
  go: (u: string) => void
}

/** 일반 텍스트 본문을 웹페이지처럼: 첫 줄은 사이트 머리, [제목]은 소제목, "- "는 목록, 메뉴 줄은 링크 */
function SitePage({ body, pageKey, clues, run, go }: PageProps) {
  const [head, ...lines] = body.split('\n')
  const h = host(pageKey)
  const text = (t: string) => (
    <ClueText text={t} clues={clues} collected={(id) => run.hasCard(id)} onClue={(id) => run.collectClue(id)} onLink={go} />
  )
  const blocks: ReactNode[] = []
  let navRun: { label: string; url: string }[] = []
  const flushNav = () => {
    if (!navRun.length) return
    const items = navRun
    blocks.push(
      <nav key={`n${blocks.length}`} className="site-nav">
        {items.map((l) => (
          <button key={l.url} className="link-word" data-url={l.url} onClick={() => go(l.url)}>
            {l.label}
          </button>
        ))}
      </nav>,
    )
    navRun = []
  }
  lines.forEach((raw, i) => {
    const line = raw.trimEnd()
    const nav = line.match(NAV_LINE)
    if (nav && !clues.some((c) => c.keyword && line.includes(c.keyword))) {
      navRun.push({ label: nav[1].trim(), url: nav[2] })
      return
    }
    flushNav()
    if (!line.trim()) return
    const sec = line.match(/^\[(.+)\]\s*(.*)$/)
    // 바로 아래가 메뉴 줄이면 "[메뉴]" 같은 제목은 빼고 메뉴만 보인다
    const below = lines.slice(i + 1).find((l) => l.trim())
    if (sec && !sec[2] && below && NAV_LINE.test(below.trimEnd())) return
    if (sec)
      blocks.push(
        <h3 key={i}>
          <span className="tag">{sec[1]}</span>
          {sec[2] && text(sec[2])}
        </h3>,
      )
    else if (line.startsWith('- '))
      blocks.push(
        <p key={i} className="li">
          {text(line.slice(2))}
        </p>,
      )
    else blocks.push(<p key={i}>{text(line)}</p>)
  })
  flushNav()

  return (
    <article className="site">
      <header className="site-head" style={{ background: brand(h) }}>
        <b>{text(head)}</b>
        <small>{h}</small>
      </header>
      <div className="site-body">{blocks}</div>
      <footer className="site-foot">© 2024 {h}. All rights reserved.</footer>
    </article>
  )
}

export function BrowserApp({ run }: { run: MissionRun }) {
  useRun(run)
  const { history, index } = run.browser
  const current = index >= 0 ? history[index] : null
  // 주소창은 이동할 때마다 지금 주소로 맞추고, 그 사이에는 플레이어가 고친다
  const [draft, setDraft] = useState<{ for: string | null; text: string }>({ for: current, text: current ?? '' })
  const url = draft.for === current ? draft.text : (current ?? '')
  const [showHistory, setShowHistory] = useState(false)
  const [hover, setHover] = useState<string | null>(null)

  const sites = run.scenario.websites
  const page = current ? findPage(sites, current) : null
  const knownHosts = new Set([...Object.keys(sites), ...Object.keys(SHARED_SITES)].map((k) => host(normalizeUrl(k))))
  const visited = [...new Set(history)].reverse()
  const go = (u: string) => {
    if (!u.trim()) return
    setShowHistory(false)
    setHover(null)
    run.navigate(u)
  }

  const tabTitle = showHistory
    ? '방문 기록'
    : current === null
      ? '새 탭'
      : page
        ? titleOf(page.body)
        : knownHosts.has(host(current))
          ? '404 Not Found'
          : '사이트에 연결할 수 없음'
  const tabHost = showHistory || current === null ? null : host(current)

  let content: ReactNode
  if (showHistory)
    content = (
      <div className="newtab history">
        <h2>방문 기록</h2>
        <ul>
          {visited.map((u) => {
            const p = findPage(sites, u)
            return (
              <li key={u}>
                <button className="link-word" data-url={u} onClick={() => go(u)}>
                  {p ? titleOf(p.body) : u}
                </button>
                <small>{u}</small>
              </li>
            )
          })}
        </ul>
      </div>
    )
  else if (current === null) {
    const tiles = [HOME, ...visited.filter((u) => u !== HOME && findPage(sites, u))].slice(0, 8)
    content = (
      <div className="newtab">
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
            placeholder="주소 입력 (예: www.corpx.com)"
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
  } else if (page)
    content = (
      <SitePage
        key={current}
        body={page.body}
        pageKey={page.key}
        run={run}
        go={go}
        clues={run.scenario.clues.filter((c) => normalizeUrl(c.source.replace(/^web:/, '')) === normalizeUrl(page.key))}
      />
    )
  else if (knownHosts.has(host(current)))
    content = (
      <div className="site-404">
        <h1>404</h1>
        <p>요청하신 페이지를 찾을 수 없습니다.</p>
        <small>{current}</small>
        <button className="link-word" onClick={() => go(host(current) === host(HOME) ? HOME : `www.${host(current)}`)}>
          첫 화면으로
        </button>
      </div>
    )
  else
    content = (
      <div className="neterr">
        <div className="neterr-icon">☹</div>
        <h2>사이트에 연결할 수 없음</h2>
        <p>
          <b>{host(current)}</b>의 서버 IP 주소를 찾을 수 없습니다.
        </p>
        <ul>
          <li>주소에 오타가 있는지 확인하세요.</li>
          <li>방문 기록에서 전에 열었던 주소를 찾아보세요.</li>
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
        <button type="button" className="nav" title="뒤로" disabled={index <= 0} onClick={() => run.goBack()}>
          ←
        </button>
        <button
          type="button"
          className="nav"
          title="앞으로"
          disabled={index >= history.length - 1}
          onClick={() => run.goForward()}
        >
          →
        </button>
        <button type="button" className="nav" title="홈" onClick={() => go(HOME)}>
          ⌂
        </button>
        <div className="omnibox">
          <span className="lock" title={current ? '보안 연결' : undefined}>
            {current && page ? '🔒' : current ? 'ⓘ' : '🔍'}
          </span>
          <input
            value={url}
            onChange={(e) => setDraft({ for: current, text: e.target.value })}
            onFocus={(e) => e.currentTarget.select()}
            placeholder="주소 입력"
            spellCheck={false}
          />
        </div>
        <button
          type="button"
          className={`nav${showHistory ? ' on' : ''}`}
          title="방문 기록"
          disabled={!visited.length}
          onClick={() => setShowHistory((v) => !v)}
        >
          ☰
        </button>
      </form>
      {current && !showHistory && <div key={`${current}#${index}`} className="loadbar" />}
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
      {hover && <div className="statusbar">https://{hover}</div>}
    </div>
  )
}
