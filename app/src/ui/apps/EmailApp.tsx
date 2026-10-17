import { useState } from 'react'
import type { MailFolder } from '../../engine/types'
import { useRun, type MissionRun } from '../../game/run'
import { useT } from '../../i18n'
import { ClueText } from '../ClueText'

const FOLDERS: MailFolder[] = ['inbox', 'sent', 'drafts', 'trash']

export function EmailApp({ run }: { run: MissionRun }) {
  useRun(run)
  const t = useT().apps.mail
  const { emails, clues } = run.scenario
  const files = run.scenario.files ?? []
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
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} spellCheck={false} />
        {FOLDERS.map((id) => {
          const n = unread(id)
          const count = all.filter(({ m }) => (m.folder ?? 'inbox') === id).length
          return (
            <button
              key={id}
              className={!q && folder === id ? 'on' : ''}
              onClick={() => {
                setQuery('')
                setFolder(id)
              }}
            >
              {t[id]}
              <span>{n ? <b>{n}</b> : count || ''}</span>
            </button>
          )
        })}
      </nav>
      <ul className="mail-list">
        {shown.length === 0 && <li className="empty">{q ? t.noMatch : t.empty}</li>}
        {shown.map(({ m, i }) => (
          <li key={i} className={`${i === sel ? 'sel' : ''}${run.readMails.has(i) ? '' : ' unread'}`} onClick={() => open(i)}>
            <b>{m.sender}</b>
            {m.date && <time>{m.date}</time>}
            <span>
              {m.attachments?.length ? '📎 ' : ''}
              {m.subject}
            </span>
          </li>
        ))}
      </ul>
      {mail ? (
        <article className="mail-body">
          <h3>{mail.subject}</h3>
          <p className="from">
            {mail.folder === 'sent' || mail.folder === 'drafts' ? t.author : t.sender}: {mail.sender}
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
          {mail.attachments?.length ? (
            <div className="mail-attach">
              <small>{t.attachments}</small>
              {mail.attachments.map((id) => {
                const f = files.find((x) => x.id === id)
                return f ? (
                  <button key={id} onClick={() => run.openFile(id)}>
                    📎 {f.name}
                  </button>
                ) : null
              })}
            </div>
          ) : null}
        </article>
      ) : (
        <p className="hint">{t.noMail}</p>
      )}
    </div>
  )
}
