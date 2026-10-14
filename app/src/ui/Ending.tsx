// 엔딩 흐름: 마지막 메일 → 단서 연결 → 선택 → 후일담 → 크레딧 (docs/이야기.md §5~§6)
import { useState } from 'react'
import { useT } from '../i18n'
import type { EndingChoice, EndingSpec } from '../game/story'

type Step =
  | { name: 'mail' }
  | { name: 'reveal'; shown: number }
  | { name: 'choice' }
  | { name: 'epilogue'; choice: EndingChoice; page: number }
  | { name: 'credits' }

export function EndingScreen({ ending, onDone }: { ending: EndingSpec; onDone: () => void }) {
  const [step, setStep] = useState<Step>({ name: 'mail' })
  const t = useT().screens.ending

  if (step.name === 'mail') {
    const m = ending.finalMail
    return (
      <div className="screen ending">
        <div className="dialog">
          <p className="sub">{t.newMail}</p>
          <MailCard sender={m.sender} subject={m.subject} body={m.body} />
          <div className="actions">
            <button onClick={() => setStep({ name: 'reveal', shown: 1 })}>{t.next}</button>
          </div>
        </div>
      </div>
    )
  }

  if (step.name === 'reveal') {
    const done = step.shown >= ending.reveal.length
    return (
      <div className="screen ending">
        <div className="dialog">
          <pre key={step.shown} className="epilogue reveal">
            {ending.reveal[step.shown - 1]}
          </pre>
          <div className="actions">
            <button
              onClick={() => setStep(done ? { name: 'choice' } : { name: 'reveal', shown: step.shown + 1 })}
            >
              {t.next}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step.name === 'choice') {
    return (
      <div className="screen ending">
        <div className="dialog">
          <div className="choices">
            {ending.choices.map((c) => (
              <button key={c.id} onClick={() => setStep({ name: 'epilogue', choice: c, page: 0 })}>
                <b>{c.label}</b>
                <span>{c.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (step.name === 'epilogue') {
    const last = step.page >= step.choice.epilogue.length - 1
    return (
      <div className="screen ending">
        <div className="dialog">
          <pre className="epilogue">{step.choice.epilogue[step.page]}</pre>
          <div className="actions">
            <button
              onClick={() => setStep(last ? { name: 'credits' } : { ...step, page: step.page + 1 })}
            >
              {t.next}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen ending">
      <div className="dialog credits">
        <h2>SOCIAL_ENGINEER</h2>
        <dl>
          {ending.credits.map((c) => (
            <div key={c.role}>
              <dt>{c.role}</dt>
              {c.names.map((n) => (
                <dd key={n}>{n}</dd>
              ))}
            </div>
          ))}
        </dl>
        <p className="sub">{t.thanks}</p>
        <div className="actions">
          <button onClick={onDone}>{t.toTitle}</button>
        </div>
      </div>
    </div>
  )
}

export function MailCard({ sender, subject, body }: { sender: string; subject: string; body: string }) {
  const t = useT().screens.ending
  return (
    <article className="mail-card">
      <header>
        <b>{subject}</b>
        <small>{t.from(sender)}</small>
      </header>
      <pre>{body}</pre>
    </article>
  )
}
