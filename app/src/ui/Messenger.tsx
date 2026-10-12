import { useEffect, useRef, useState } from 'react'
import type { Llm } from '../engine/llm'
import { ALARM_AT } from '../engine/rules'
import { Session } from '../engine/session'
import type { FactSpec, Scenario } from '../engine/types'

interface Msg {
  id: number
  from: 'player' | 'npc' | 'system'
  text: string
  clues?: FactSpec[]
}

const TYPE_MS = 28

interface Props {
  scenario: Scenario
  llm: Llm
  playerName: string
  onClue?: (fact: FactSpec) => void
  /** 개발용: 판정·수치를 메시지 아래에 보여 준다 */
  debug?: boolean
}

export function Messenger({ scenario, llm, playerName, onClue, debug }: Props) {
  const session = useRef<Session>(null)
  session.current ??= new Session(scenario, llm)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [typing, setTyping] = useState<{ id: number; shown: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [input, setInput] = useState('')
  const [suspicion, setSuspicion] = useState(0)
  const [over, setOver] = useState(false)
  const [debugLine, setDebugLine] = useState('')
  const logRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(0)

  const push = (m: Omit<Msg, 'id'>) => {
    const id = nextId.current++
    setMsgs((xs) => [...xs, { ...m, id }])
    return id
  }

  // 타자 효과
  useEffect(() => {
    if (!typing) return
    const msg = msgs.find((m) => m.id === typing.id)
    if (!msg || typing.shown >= msg.text.length) {
      setTyping(null)
      return
    }
    const t = setTimeout(() => setTyping({ ...typing, shown: typing.shown + 1 }), TYPE_MS)
    return () => clearTimeout(t)
  }, [typing, msgs])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [msgs, typing])

  async function send() {
    const text = input.trim()
    if (!text || busy || over) return
    setInput('')
    push({ from: 'player', text })
    setBusy(true)
    try {
      const r = await session.current!.turn(text)
      const id = push({ from: 'npc', text: r.dialogue, clues: r.revealedNow })
      setTyping({ id, shown: 0 })
      setSuspicion(r.state.suspicion)
      r.revealedNow.forEach((f) => onClue?.(f))
      setDebugLine(
        `${r.judgment.tactic}${r.judgment.topic ? `·${r.judgment.topic}` : ''}${r.judgment.meta ? '·META' : ''} fit${r.judgment.fit}` +
          ` → ${r.directive} | 의심 ${r.state.suspicion} 친밀 ${r.state.rapport} | ${r.attempts}회${r.usedFallback ? ' 대체' : ''}` +
          (r.guardFailures.length ? ` (${r.guardFailures.join(',')})` : ''),
      )
      if (r.gameOver) {
        setOver(true)
        push({ from: 'system', text: '[보안 경보] 수상한 접근이 감지되어 접속이 차단되었습니다.' })
      }
    } catch (e) {
      push({ from: 'system', text: `연결 오류: 모델 서버에 닿지 않습니다. (${(e as Error).message.slice(0, 80)})` })
    } finally {
      setBusy(false)
    }
  }

  function retry() {
    session.current!.retryKeepClues()
    setMsgs([])
    setSuspicion(0)
    setOver(false)
    setDebugLine('')
  }

  const alarm = suspicion >= ALARM_AT

  return (
    <section className={`messenger${alarm ? ' alarm' : ''}`}>
      <header className="messenger-head">
        <span className="npc-name">{scenario.npc.name}</span>
        <div className="suspicion" title={`의심도 ${suspicion}`}>
          <span>의심</span>
          <div className="bar">
            <div className="fill" style={{ width: `${suspicion}%` }} />
          </div>
        </div>
      </header>

      <div className="log" ref={logRef}>
        {msgs.map((m) => {
          const text = typing?.id === m.id ? m.text.slice(0, typing.shown) : m.text
          const done = typing?.id !== m.id
          return (
            <div key={m.id} className={`msg ${m.from}`}>
              {m.from !== 'system' && <span className="who">{m.from === 'player' ? playerName : scenario.npc.name}</span>}
              <p>{text}</p>
              {done && m.clues?.map((c) => (
                <button key={c.id} className="clue-chip" onClick={() => onClue?.(c)} title={c.text}>
                  단서: {c.label}
                </button>
              ))}
            </div>
          )
        })}
        {busy && <div className="msg npc pending">입력 중…</div>}
      </div>

      {debug && debugLine && <div className="debug">{debugLine}</div>}

      {over ? (
        <div className="over">
          <button onClick={retry}>단서 유지하고 다시 접근</button>
        </div>
      ) : (
        <form
          className="input"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지 입력"
            maxLength={200}
            disabled={busy}
            autoFocus
          />
          <button disabled={busy || !input.trim()}>보내기</button>
        </form>
      )}
    </section>
  )
}
