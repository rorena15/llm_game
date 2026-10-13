import { useState } from 'react'
import { normalizeUrl, useRun, type MissionRun } from '../../game/run'
import { findPage, HOME } from '../../game/sites'
import { ClueText } from '../ClueText'

export function BrowserApp({ run }: { run: MissionRun }) {
  useRun(run)
  const { history, index } = run.browser
  const current = index >= 0 ? history[index] : null
  // 주소창은 이동할 때마다 지금 주소로 맞추고, 그 사이에는 플레이어가 고친다
  const [draft, setDraft] = useState<{ for: string | null; text: string }>({ for: current, text: current ?? '' })
  const url = draft.for === current ? draft.text : (current ?? '')
  const [showHistory, setShowHistory] = useState(false)

  const page = current ? findPage(run.scenario.websites, current) : null
  const visited = [...new Set(history)].reverse()
  const go = (u: string) => {
    if (!u.trim()) return
    setShowHistory(false)
    run.navigate(u)
  }

  return (
    <div className="browser">
      <form
        className="urlbar"
        onSubmit={(e) => {
          e.preventDefault()
          go(url)
        }}
      >
        <button type="button" className="nav" title="뒤로" disabled={index <= 0} onClick={() => run.goBack()}>
          ◀
        </button>
        <button
          type="button"
          className="nav"
          title="앞으로"
          disabled={index >= history.length - 1}
          onClick={() => run.goForward()}
        >
          ▶
        </button>
        <button type="button" className="nav" title="홈" onClick={() => go(HOME)}>
          ⌂
        </button>
        <input
          value={url}
          onChange={(e) => setDraft({ for: current, text: e.target.value })}
          placeholder="주소를 입력하세요 (예: www.corpx.com)"
          spellCheck={false}
        />
        <button>이동</button>
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
      <div className="page">
        {showHistory ? (
          <div className="history">
            <b>방문 기록</b>
            {visited.map((u) => (
              <button key={u} className="link-word" onClick={() => go(u)}>
                {u}
              </button>
            ))}
          </div>
        ) : current === null ? (
          <p className="hint">
            주소를 입력하세요. 회사 홈페이지는{' '}
            <button className="link-word" onClick={() => go(HOME)}>
              {HOME}
            </button>
            입니다.
          </p>
        ) : page ? (
          <p className="text">
            <ClueText
              text={page.body}
              clues={run.scenario.clues.filter((c) => normalizeUrl(c.source.replace(/^web:/, '')) === normalizeUrl(page.key))}
              collected={(id) => run.hasCard(id)}
              onClue={(id) => run.collectClue(id)}
              onLink={go}
            />
          </p>
        ) : (
          <div className="notfound">
            <b>404 Not Found</b>
            <p>{current} 를 찾을 수 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}
