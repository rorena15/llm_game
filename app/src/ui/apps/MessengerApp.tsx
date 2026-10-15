import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ALARM_AT } from '../../engine/rules'
import { useRun, type ChatMsg, type MissionRun } from '../../game/run'
import { typeMs } from '../../game/settings'
import { play } from '../../game/sound'
import { useT, localeTag } from '../../i18n'
import { HealthBanner } from '../Screens'

const hhmm = (t: number) => new Date(t).toLocaleTimeString(localeTag(), { hour: 'numeric', minute: '2-digit' })
const sameMinute = (a: number, b: number) => Math.floor(a / 60000) === Math.floor(b / 60000)

/** 이름 끝의 직급을 뺀 소속 ("CorpX 인사팀 부장, 20년차…" → "인사팀") */
function department(persona: string, name: string): string {
  const head = persona.split(/[,.]/)[0].replace(/^CorpX\s*/, '').trim()
  const rank = name.split(' ').slice(1).join(' ')
  return rank && head.endsWith(rank) ? head.slice(0, -rank.length).trim() : head
}

/** 대사 속에서 흘린 핵심 낱말(사실의 keys)을 강조한다 */
function withSlips(text: string, clues: ChatMsg['clues']): ReactNode {
  const keys = (clues ?? []).flatMap((c) => c.keys ?? []).filter((k) => k && text.includes(k))
  if (!keys.length) return text
  const esc = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length)
  return text.split(new RegExp(`(${esc.join('|')})`)).map((part, i) =>
    keys.includes(part) ? (
      <mark key={i} className="slip">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

/** 이름으로 정하는 아바타 색 */
function avatarColor(name: string) {
  let n = 0
  for (const ch of name) n = (n * 17 + ch.charCodeAt(0)) % 360
  return `hsl(${n} 40% 48%)`
}

export function MessengerApp({ run, playerName, debug }: { run: MissionRun; playerName: string; debug: boolean }) {
  useRun(run)
  const t = useT().apps.messenger
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState<{ id: number; shown: number } | null>(null)
  const seen = useRef(run.chat.length ? run.chat[run.chat.length - 1].id : -1)
  // 상대가 읽은 마지막 내 메시지. 창을 새로 열면 지난 메시지는 모두 읽은 것으로 본다
  const [readUpTo, setReadUpTo] = useState(seen.current)
  const logRef = useRef<HTMLDivElement>(null)
  const npc = run.scenario.npc.name
  const dept = department(run.scenario.npc.persona, npc)

  // 새로 온 NPC 대사만 타자 효과
  const last = run.chat[run.chat.length - 1]
  useEffect(() => {
    if (last && last.id > seen.current) {
      seen.current = last.id
      if (last.from === 'npc') setTyping({ id: last.id, shown: 0 })
    }
  }, [last])

  // 내 메시지는 잠깐 뒤에 읽음 (숫자 1이 사라짐)
  const lastMine = [...run.chat].reverse().find((m) => m.from === 'player')
  useEffect(() => {
    if (!lastMine || lastMine.id <= readUpTo) return
    const timer = setTimeout(() => setReadUpTo(lastMine.id), 600 + Math.random() * 900)
    return () => clearTimeout(timer)
  }, [lastMine, readUpTo])

  // 비밀을 흘린 대사는 다 보인 순간 소리로 알린다
  const slipped = useRef(seen.current)
  useEffect(() => {
    if (typing || !last || last.from !== 'npc' || !last.clues?.length || last.id <= slipped.current) return
    slipped.current = last.id
    play('slip')
  }, [typing, last])

  useEffect(() => {
    if (!typing) return
    const msg = run.chat.find((m) => m.id === typing.id)
    if (!msg || typing.shown >= msg.text.length || typeMs() === 0) return setTyping(null)
    const timer = setTimeout(() => {
      if (typing.shown % 2 === 0 && msg.text[typing.shown] !== ' ') play('key')
      setTyping({ ...typing, shown: typing.shown + 1 })
    }, typeMs())
    return () => clearTimeout(timer)
  }, [typing, run.chat])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [run.chat, typing, run.busy, readUpTo])

  const playing = run.status === 'playing'
  const send = () => {
    const text = input.trim()
    if (!text || run.busy || !playing) return
    setInput('')
    void run.say(text)
  }

  const isRead = (m: ChatMsg) => m.id <= readUpTo || run.chat.some((x) => x.from === 'npc' && x.id > m.id)
  const showDots = run.busy && !!lastMine && isRead(lastMine)
  const presence = !playing ? 'off' : showDots || typing ? 'typing' : 'on'

  return (
    <div className={`messenger${run.suspicion >= ALARM_AT ? ' alarm' : ''}`}>
      <header className="messenger-head">
        <span className="avatar" style={{ background: avatarColor(npc) }}>
          {npc[0]}
        </span>
        <div className="who-box">
          <b className="npc-name">{npc}</b>
          <small>
            CorpX {dept && `· ${dept}`}
          </small>
        </div>
        <span className={`presence ${presence}`}>
          {presence === 'off' ? t.off : presence === 'typing' ? t.typing : t.online}
        </span>
      </header>

      {!run.scenario.script && <HealthBanner />}
      <div className="log" ref={logRef}>
        <div className="day">{t.today}</div>
        {run.chat.length === 0 && <p className="hint">{t.sayHello(npc)}</p>}
        {run.chat.map((m, i) => {
          if (m.from === 'system')
            return (
              <div key={m.id} className="msg system">
                {m.text}
              </div>
            )
          const prev = run.chat[i - 1]
          const next = run.chat[i + 1]
          const first = !prev || prev.from !== m.from || !sameMinute(prev.at, m.at)
          const lastOfGroup = !next || next.from !== m.from || !sameMinute(next.at, m.at)
          const isTyping = typing?.id === m.id
          const mine = m.from === 'player'
          return (
            <div key={m.id} className={`msg ${m.from}${first ? ' first' : ''}`} title={mine ? playerName : npc}>
              {!mine && (
                <span className="avatar sm" style={{ background: first ? avatarColor(npc) : 'transparent' }}>
                  {first ? npc[0] : ''}
                </span>
              )}
              <div className="msg-col">
                {first && !mine && <span className="who">{npc}</span>}
                <div className="bubble-row">
                  <p className="bubble">{isTyping ? m.text.slice(0, typing.shown) : withSlips(m.text, m.clues)}</p>
                  <span className="meta">
                    {mine && !isRead(m) && <b className="unread">1</b>}
                    {lastOfGroup && !isTyping && <time>{hhmm(m.at)}</time>}
                  </span>
                </div>
                {!isTyping &&
                  m.clues?.map((c) => (
                    <button key={c.id} className="clue-chip" onClick={() => run.collectFact(c)} title={c.text}>
                      {t.clue(c.label)}
                    </button>
                  ))}
                {debug && !isTyping && m.debug && <small className="debug">{m.debug}</small>}
              </div>
            </div>
          )
        })}
        {showDots && (
          <div className="msg npc first">
            <span className="avatar sm" style={{ background: avatarColor(npc) }}>
              {npc[0]}
            </span>
            <div className="msg-col">
              <p className="bubble dots" aria-label={t.typingLabel}>
                <i />
                <i />
                <i />
              </p>
            </div>
          </div>
        )}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            play('key')
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send()
            }
          }}
          placeholder={playing ? t.placeholder(npc) : t.disconnected}
          maxLength={200}
          disabled={run.busy || !playing}
          autoFocus
        />
        <div className="composer-bar">
          <small>{input.length ? `${input.length}/200` : t.sendHint}</small>
          <button disabled={run.busy || !playing || !input.trim()}>{t.send}</button>
        </div>
      </form>
    </div>
  )
}
