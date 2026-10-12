import { useState } from 'react'
import { useRun, type MissionRun } from '../../game/run'
import { ClueText } from '../ClueText'

export function EmailApp({ run }: { run: MissionRun }) {
  useRun(run)
  const { emails, clues } = run.scenario
  const [sel, setSel] = useState(0)
  const [read, setRead] = useState<Set<number>>(() => new Set([0]))
  const mail = emails[sel]
  const mailClues = clues.filter((c) => c.source === `email:${sel}`)

  return (
    <div className="email">
      <ul className="mail-list">
        {emails.map((m, i) => (
          <li
            key={i}
            className={`${i === sel ? 'sel' : ''}${read.has(i) ? '' : ' unread'}`}
            onClick={() => {
              setSel(i)
              setRead((r) => new Set(r).add(i))
            }}
          >
            <b>{m.sender}</b>
            <span>{m.subject}</span>
          </li>
        ))}
      </ul>
      {mail ? (
        <article className="mail-body">
          <h3>{mail.subject}</h3>
          <p className="from">보낸 사람: {mail.sender}</p>
          <p className="text">
            <ClueText text={mail.body} clues={mailClues} collected={(id) => run.hasCard(id)} onClue={(id) => run.collectClue(id)} />
          </p>
        </article>
      ) : (
        <p className="hint">받은 메일이 없습니다.</p>
      )}
    </div>
  )
}
