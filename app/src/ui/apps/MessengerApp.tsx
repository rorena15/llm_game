import { useEffect, useRef, useState } from 'react'
import { ALARM_AT } from '../../engine/rules'
import { useRun, type MissionRun } from '../../game/run'
import { typeMs } from '../../game/settings'
import { play } from '../../game/sound'
import { HealthBanner } from '../Screens'


export function MessengerApp({ run, playerName, debug }: { run: MissionRun; playerName: string; debug: boolean }) {
  useRun(run)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState<{ id: number; shown: number } | null>(null)
  const seen = useRef(run.chat.length ? run.chat[run.chat.length - 1].id : -1)
  const logRef = useRef<HTMLDivElement>(null)
  const npc = run.scenario.npc.name

  // 새로 온 NPC 대사만 타자 효과
  const last = run.chat[run.chat.length - 1]
  useEffect(() => {
    if (last && last.id > seen.current) {
      seen.current = last.id
      if (last.from === 'npc') setTyping({ id: last.id, shown: 0 })
    }
  }, [last])

  useEffect(() => {
    if (!typing) return
    const msg = run.chat.find((m) => m.id === typing.id)
    if (!msg || typing.shown >= msg.text.length || typeMs() === 0) return setTyping(null)
    const t = setTimeout(() => {
      if (typing.shown % 2 === 0 && msg.text[typing.shown] !== ' ') play('key')
      setTyping({ ...typing, shown: typing.shown + 1 })
    }, typeMs())
    return () => clearTimeout(t)
  }, [typing, run.chat])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [run.chat, typing, run.busy])

  const playing = run.status === 'playing'
  const send = () => {
    const text = input.trim()
    if (!text || run.busy || !playing) return
    setInput('')
    void run.say(text)
  }

  return (
    <div className={`messenger${run.suspicion >= ALARM_AT ? ' alarm' : ''}`}>
      <header className="messenger-head">
        <span className="npc-name">{npc}</span>
        <span className="presence">● 온라인</span>
      </header>

      {!run.scenario.script && <HealthBanner />}
      <div className="log" ref={logRef}>
        {run.chat.length === 0 && <p className="hint">{npc}에게 메시지를 보내 보세요.</p>}
        {run.chat.map((m) => {
          const isTyping = typing?.id === m.id
          return (
            <div key={m.id} className={`msg ${m.from}`}>
              {m.from !== 'system' && <span className="who">{m.from === 'player' ? playerName : npc}</span>}
              <p>{isTyping ? m.text.slice(0, typing.shown) : m.text}</p>
              {!isTyping &&
                m.clues?.map((c) => (
                  <button key={c.id} className="clue-chip" onClick={() => run.collectFact(c)} title={c.text}>
                    단서: {c.label}
                  </button>
                ))}
              {debug && !isTyping && m.debug && <small className="debug">{m.debug}</small>}
            </div>
          )
        })}
        {run.busy && <div className="msg npc pending">입력 중…</div>}
      </div>

      <form
        className="input"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <input
          onKeyDown={() => play('key')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={playing ? '메시지 입력' : '접속이 끊겼습니다'}
          maxLength={200}
          disabled={run.busy || !playing}
          autoFocus
        />
        <button disabled={run.busy || !playing || !input.trim()}>보내기</button>
      </form>
    </div>
  )
}
