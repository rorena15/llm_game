import { useState } from 'react'
import { useRun, type MissionRun } from '../../game/run'
import { ClueText } from '../ClueText'

const HOME = 'www.corpx.com'

/** 주소 정리: http(s)://, 대소문자, 끝 슬래시 무시 */
const normalize = (u: string) =>
  u
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')

export function BrowserApp({ run }: { run: MissionRun }) {
  useRun(run)
  const sites = run.scenario.websites
  const [url, setUrl] = useState('')
  const [page, setPage] = useState<string | null>(null)

  const go = (target: string) => {
    const key = normalize(target)
    setUrl(key)
    setPage(key)
  }

  const known = page !== null ? Object.keys(sites).find((k) => normalize(k) === page) : undefined
  const body =
    page === null
      ? null
      : known
        ? sites[known]
        : page === HOME
          ? 'CorpX 공식 홈페이지입니다.\n\n함께 성장하는 회사, CorpX.'
          : null

  return (
    <div className="browser">
      <form
        className="urlbar"
        onSubmit={(e) => {
          e.preventDefault()
          if (url.trim()) go(url)
        }}
      >
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="주소를 입력하세요 (예: www.corpx.com)" />
        <button>이동</button>
      </form>
      <div className="page">
        {page === null && <p className="hint">접속할 주소를 입력하세요.</p>}
        {page !== null && body === null && (
          <div className="notfound">
            <b>404 Not Found</b>
            <p>{page} 를 찾을 수 없습니다.</p>
          </div>
        )}
        {body !== null && (
          <p className="text">
            <ClueText
              text={body}
              clues={run.scenario.clues.filter((c) => known && normalize(c.source.replace(/^web:/, '')) === normalize(known))}
              collected={(id) => run.hasCard(id)}
              onClue={(id) => run.collectClue(id)}
            />
          </p>
        )}
      </div>
    </div>
  )
}
