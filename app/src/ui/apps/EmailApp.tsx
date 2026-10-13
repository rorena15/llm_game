import { useState } from 'react'
import type { MailFolder } from '../../engine/types'
import { useRun, type MissionRun } from '../../game/run'
import { ClueText } from '../ClueText'

const FOLDERS: { id: MailFolder; label: string }[] = [
  { id: 'inbox', label: '받은편지함' },
  { id: 'sent', label: '보낸편지함' },
  { id: 'drafts', label: '임시보관함' },
  { id: 'trash', label: '휴지통' },
]

export function EmailApp({ run }: { run: MissionRun }) {
  useRun(run)
  const { emails, clues } = run.scenario
  const [folder, setFolder] = useState<MailFolder>('inbox')
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState(0)

  // 메일 번호(단서의 email:N)는 원래 순서 그대로 쓴다
  const all = emails.map((m, i) => ({ m, i }))
  const q = query.trim()
  const shown = all.filter(
    ({ m }) =>
      (q ? true : (m.folder ?? 'inbox') === folder) &&
      (!q || `${m.sender} ${m.subject} ${m.body}`.toLowerCase().includes(q.toLowerCase())),
  )
  const unread = (f: MailFolder) => all.filter(({ m, i }) => (m.folder ?? 'inbox') === f && !run.readMails.has(i)).length
  const mail = emails[sel]
  const open = (i: number) => {
    setSel(i)
    run.markRead(i)
  }

  return (
    <div className="email">
      <nav className="mail-folders">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="메일 검색" spellCheck={false} />
        {FOLDERS.map((f) => {
          const n = unread(f.id)
          const count = all.filter(({ m }) => (m.folder ?? 'inbox') === f.id).length
          return (
            <button
              key={f.id}
              className={!q && folder === f.id ? 'on' : ''}
              onClick={() => {
                setQuery('')
                setFolder(f.id)
              }}
            >
              {f.label}
              <span>{n ? <b>{n}</b> : count || ''}</span>
            </button>
          )
        })}
      </nav>
      <ul className="mail-list">
        {shown.length === 0 && <li className="empty">{q ? '찾는 메일이 없습니다.' : '메일이 없습니다.'}</li>}
        {shown.map(({ m, i }) => (
          <li key={i} className={`${i === sel ? 'sel' : ''}${run.readMails.has(i) ? '' : ' unread'}`} onClick={() => open(i)}>
            <b>{m.sender}</b>
            {m.date && <time>{m.date}</time>}
            <span>{m.subject}</span>
          </li>
        ))}
      </ul>
      {mail ? (
        <article className="mail-body">
          <h3>{mail.subject}</h3>
          <p className="from">
            {mail.folder === 'sent' || mail.folder === 'drafts' ? '작성' : '보낸 사람'}: {mail.sender}
            {mail.date && <time> · {mail.date}</time>}
          </p>
          <p className="text">
            <ClueText
              text={mail.body}
              clues={clues.filter((c) => c.source === `email:${sel}`)}
              collected={(id) => run.hasCard(id)}
              onClue={(id) => run.collectClue(id)}
              onLink={(url) => run.openUrl(url)}
            />
          </p>
        </article>
      ) : (
        <p className="hint">받은 메일이 없습니다.</p>
      )}
    </div>
  )
}
