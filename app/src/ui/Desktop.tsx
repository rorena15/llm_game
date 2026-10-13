import { useEffect, useState, type ReactNode } from 'react'
import { ALARM_AT } from '../engine/rules'
import { useRun, type MissionRun } from '../game/run'
import { BoardApp } from './apps/BoardApp'
import { BrowserApp } from './apps/BrowserApp'
import { EmailApp } from './apps/EmailApp'
import { MessengerApp } from './apps/MessengerApp'
import { ServerApp } from './apps/ServerApp'
import { Window, type WinPos } from './Window'

type AppId = 'messenger' | 'email' | 'browser' | 'board' | 'server'

const APPS: Record<AppId, { title: string; icon: string; w: number; h: number; at: WinPos }> = {
  email: { title: '메일', icon: '✉', w: 640, h: 420, at: { x: 140, y: 40 } },
  messenger: { title: '사내 메신저', icon: '💬', w: 460, h: 560, at: { x: 520, y: 70 } },
  browser: { title: '브라우저', icon: '🌐', w: 620, h: 440, at: { x: 180, y: 110 } },
  board: { title: '수사보드', icon: '📌', w: 640, h: 460, at: { x: 220, y: 90 } },
  server: { title: '사내망 접속', icon: '🖥', w: 420, h: 320, at: { x: 600, y: 160 } },
}
const ORDER: AppId[] = ['email', 'messenger', 'browser', 'board', 'server']

interface OpenWin {
  id: AppId
  pos: WinPos
  z: number
}

interface Props {
  run: MissionRun
  playerName: string
  debug: boolean
  onQuit: () => void
  /** 완전히 새로: 다른 변형으로 처음부터 (§6.4) */
  onRestart: () => void
  /** 완전히 새로 하면 정답이 바뀌나 (변형이 둘 이상) */
  answerChanges: boolean
}

export function Desktop({ run, playerName, debug, onQuit, onRestart, answerChanges }: Props) {
  useRun(run)
  const [wins, setWins] = useState<OpenWin[]>([{ id: 'email', pos: APPS.email.at, z: 1 }])
  const [now, setNow] = useState(() => new Date())
  // 경계가 오르면 막대를 잠깐 흔든다
  const [prevS, setPrevS] = useState(run.suspicion)
  const [bump, setBump] = useState(false)
  if (run.suspicion !== prevS) {
    setPrevS(run.suspicion)
    if (run.suspicion > prevS) setBump(true)
  }
  useEffect(() => {
    if (!bump) return
    const t = setTimeout(() => setBump(false), 600)
    return () => clearTimeout(t)
  }, [bump])
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(t)
  }, [])

  const top = () => Math.max(0, ...wins.map((w) => w.z)) + 1
  const open = (id: AppId) =>
    setWins((ws) => {
      const z = Math.max(0, ...ws.map((w) => w.z)) + 1
      return ws.some((w) => w.id === id) ? ws.map((w) => (w.id === id ? { ...w, z } : w)) : [...ws, { id, pos: APPS[id].at, z }]
    })
  const focus = (id: AppId) => setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z: top() } : w)))
  const close = (id: AppId) => setWins((ws) => ws.filter((w) => w.id !== id))
  const move = (id: AppId, pos: WinPos) => setWins((ws) => ws.map((w) => (w.id === id ? { ...w, pos } : w)))

  const body = (id: AppId): ReactNode => {
    switch (id) {
      case 'messenger':
        return <MessengerApp run={run} playerName={playerName} debug={debug} />
      case 'email':
        return <EmailApp run={run} />
      case 'browser':
        return <BrowserApp run={run} />
      case 'board':
        return <BoardApp run={run} />
      case 'server':
        return <ServerApp run={run} />
    }
  }

  const s = run.suspicion
  return (
    <div className={`desktop${s >= ALARM_AT ? ' alarm' : ''}`}>
      <div className="icons">
        {ORDER.map((id) => (
          <button key={id} className="icon" onDoubleClick={() => open(id)} onClick={(e) => e.detail === 0 && open(id)}>
            <span>{APPS[id].icon}</span>
            {APPS[id].title}
          </button>
        ))}
      </div>

      {wins.map((w) => (
        <Window
          key={w.id}
          title={APPS[w.id].title}
          pos={w.pos}
          z={w.z}
          width={APPS[w.id].w}
          height={APPS[w.id].h}
          onMove={(p) => move(w.id, p)}
          onFocus={() => focus(w.id)}
          onClose={() => close(w.id)}
        >
          {body(w.id)}
        </Window>
      ))}

      <footer className="taskbar">
        <button className="quit" onClick={onQuit}>
          미션 포기
        </button>
        <div className="tasks">
          {ORDER.map((id) => (
            <button key={id} className={wins.some((w) => w.id === id) ? 'on' : ''} onClick={() => open(id)}>
              {APPS[id].icon} {APPS[id].title}
              {id === 'board' && run.unseen > 0 && <span className="badge">{run.unseen}</span>}
            </button>
          ))}
        </div>
        <div className={`suspicion${bump ? ' bump' : ''}`} title={`의심도 ${s}`}>
          <span>보안 경계</span>
          <div className="bar">
            <div className="fill" style={{ width: `${s}%` }} />
          </div>
        </div>
        <time>{now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</time>
      </footer>

      <div className="notices">
        {run.notices.map((n) => (
          <div key={n.id} className={`notice ${n.kind}`} onClick={() => (n.kind === 'warn' ? null : open('board'))}>
            <b>{n.title}</b>
            <span>{n.text}</span>
          </div>
        ))}
      </div>

      {run.guide.length > 0 && (
        <aside className="guide">
          <h3>안내</h3>
          <ol>
            {run.guide.map((g, i) => {
              const current = !g.done && run.guide.slice(0, i).every((x) => x.done)
              return (
                <li key={i} className={g.done ? 'done' : current ? 'now' : ''}>
                  {g.text}
                </li>
              )
            })}
          </ol>
        </aside>
      )}

      {run.status === 'failed' && (
        <div className="overlay">
          <div className="dialog danger">
            <h2>접속 차단</h2>
            <p>{run.scenario.npc.name}이(가) 수상함을 느끼고 보안팀에 알렸습니다.</p>
            <div className="choices">
              <button onClick={() => run.retryKeepClues()}>
                <b>이어서 다시</b>
                <span>모은 단서와 추론은 그대로, 대화와 경계는 처음으로. 등급이 한 단계 내려갑니다.</span>
              </button>
              <button onClick={onRestart}>
                <b>완전히 새로</b>
                <span>
                  {answerChanges
                    ? '단서도 대화도 처음부터. 대상의 사정이 달라져 정답도 바뀝니다. 감점은 없습니다.'
                    : '단서도 대화도 처음부터 시작합니다. 감점은 없습니다.'}
                </span>
              </button>
            </div>
            <div className="actions">
              <button className="ghost" onClick={onQuit}>
                미션 선택으로
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
