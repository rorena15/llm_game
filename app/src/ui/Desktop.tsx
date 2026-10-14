import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ALARM_AT } from '../engine/rules'
import { useRun, type MissionRun, type Notice } from '../game/run'
import { useSave } from '../game/save'
import { localeTag, useT } from '../i18n'
import { play, setSoundOn, soundOn, startBgm, stopBgm, VOLUMES, type Sfx } from '../game/sound'
import { Volume } from './Settings'
import { BoardApp } from './apps/BoardApp'
import { BrowserApp } from './apps/BrowserApp'
import { EmailApp } from './apps/EmailApp'
import { MessengerApp } from './apps/MessengerApp'
import { ServerApp } from './apps/ServerApp'
import { Window, type WinPos, type WinSize } from './Window'

type AppId = 'messenger' | 'email' | 'browser' | 'board' | 'server'

const APPS: Record<AppId, { icon: string; w: number; h: number; at: WinPos }> = {
  email: { icon: '✉', w: 780, h: 440, at: { x: 130, y: 40 } },
  messenger: { icon: '💬', w: 460, h: 560, at: { x: 520, y: 70 } },
  browser: { icon: '🌐', w: 760, h: 500, at: { x: 170, y: 70 } },
  board: { icon: '📌', w: 640, h: 460, at: { x: 220, y: 90 } },
  server: { icon: '🖥', w: 420, h: 320, at: { x: 600, y: 160 } },
}
const ORDER: AppId[] = ['email', 'messenger', 'browser', 'board', 'server']

interface OpenWin {
  id: AppId
  pos: WinPos
  size: WinSize
  z: number
  min: boolean
  max: boolean
}

const newWin = (id: AppId, z: number): OpenWin => ({
  id,
  pos: APPS[id].at,
  size: { w: APPS[id].w, h: APPS[id].h },
  z,
  min: false,
  max: false,
})

/** 창을 맨 앞으로. 최소화돼 있으면 되살리고, 닫혀 있으면 연다 */
function raise(ws: OpenWin[], id: AppId): OpenWin[] {
  const z = Math.max(0, ...ws.map((w) => w.z)) + 1
  return ws.some((w) => w.id === id) ? ws.map((w) => (w.id === id ? { ...w, z, min: false } : w)) : [...ws, newWin(id, z)]
}

/** 보이는 창 가운데 맨 앞 */
const frontmost = (ws: OpenWin[]) => ws.filter((w) => !w.min).sort((a, b) => b.z - a.z)[0]?.id

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
  const tt = useT()
  const t = tt.desktop
  const [wins, setWins] = useState<OpenWin[]>([newWin('email', 1)])
  const [now, setNow] = useState(() => new Date())
  const [volOpen, setVolOpen] = useState(false)
  // 경계가 오르면 막대를 잠깐 흔든다
  const [prevS, setPrevS] = useState(run.suspicion)
  const [bump, setBump] = useState(false)
  if (run.suspicion !== prevS) {
    setPrevS(run.suspicion)
    if (run.suspicion > prevS) setBump(true)
  }
  useSave()
  useEffect(() => {
    startBgm()
    return stopBgm
  }, [])
  // 새 알림마다 소리, 경계가 위험 수위를 넘으면 경보
  const last = run.notices[run.notices.length - 1]
  const heard = useRef(last?.id ?? -1)
  useEffect(() => {
    if (!last || last.id <= heard.current) return
    heard.current = last.id
    play(NOTICE_SFX[last.kind])
  }, [last])
  const alarmed = run.suspicion >= ALARM_AT
  const wasAlarmed = useRef(alarmed)
  useEffect(() => {
    if (alarmed && !wasAlarmed.current) play('alarm')
    wasAlarmed.current = alarmed
  }, [alarmed])
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
  const open = (id: AppId) => setWins((ws) => raise(ws, id))
  // 메일 속 주소를 누르면 브라우저 창을 연다 (요청 번호가 바뀔 때만)
  const browserReq = useRef(run.browserRequest)
  useEffect(() => {
    if (run.browserRequest === browserReq.current) return
    browserReq.current = run.browserRequest
    setWins((ws) => raise(ws, 'browser'))
  }, [run.browserRequest])
  const focus = (id: AppId) => setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z: top() } : w)))
  const close = (id: AppId) => setWins((ws) => ws.filter((w) => w.id !== id))
  const patch = (id: AppId, p: Partial<OpenWin>) => setWins((ws) => ws.map((w) => (w.id === id ? { ...w, ...p } : w)))
  const move = (id: AppId, pos: WinPos) => patch(id, { pos })
  // 작업 표시줄 단추: 맨 앞에 있는 창이면 최소화, 아니면 앞으로 (윈도우와 같게)
  const taskClick = (id: AppId) =>
    setWins((ws) => (frontmost(ws) === id ? ws.map((w) => (w.id === id ? { ...w, min: true } : w)) : raise(ws, id)))

  const body = (id: AppId, visible: boolean): ReactNode => {
    switch (id) {
      case 'messenger':
        return <MessengerApp run={run} playerName={playerName} debug={debug} />
      case 'email':
        return <EmailApp run={run} />
      case 'browser':
        return <BrowserApp run={run} />
      case 'board':
        return <BoardApp run={run} visible={visible} />
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
            {t.apps[id]}
          </button>
        ))}
      </div>

      {wins.map((w) => (
        <Window
          key={w.id}
          title={t.apps[w.id]}
          pos={w.pos}
          size={w.size}
          z={w.z}
          minimized={w.min}
          maximized={w.max}
          onMove={(p) => move(w.id, p)}
          onResize={(size) => patch(w.id, { size })}
          onFocus={() => focus(w.id)}
          onMinimize={() => patch(w.id, { min: true })}
          onToggleMax={() => patch(w.id, { max: !w.max })}
          onClose={() => close(w.id)}
        >
          {body(w.id, !w.min)}
        </Window>
      ))}

      <footer className="taskbar">
        <button className="quit" onClick={onQuit}>
          {t.quit}
        </button>
        <div className="tasks">
          {ORDER.map((id) => (
            <button
              key={id}
              className={(() => {
                const w = wins.find((x) => x.id === id)
                return !w ? '' : w.min ? 'on min' : frontmost(wins) === id ? 'on front' : 'on'
              })()}
              onClick={() => taskClick(id)}
            >
              {APPS[id].icon} {t.apps[id]}
              {id === 'board' && run.unseen > 0 && <span className="badge">{run.unseen}</span>}
            </button>
          ))}
        </div>
        <div className={`suspicion${bump ? ' bump' : ''}`} title={t.suspicionTitle(s)}>
          <span>{t.alert}</span>
          <div className="bar">
            <div className="fill" style={{ width: `${s}%` }} />
          </div>
        </div>
        <div className="tray-sound">
          <button
            className={`sound-toggle${volOpen ? ' on' : ''}`}
            title={t.volume}
            onClick={() => setVolOpen((v) => !v)}
          >
            {soundOn() ? '🔊' : '🔇'}
          </button>
          {volOpen && (
            <div className="volume-pop">
              <label className="mute">
                <input type="checkbox" checked={!soundOn()} onChange={(e) => setSoundOn(!e.target.checked)} />
                {t.mute}
              </label>
              <div className={`volumes${soundOn() ? '' : ' muted'}`}>
                {VOLUMES.map((v) => (
                  <Volume key={v.id} kind={v.id} label={tt.screens.settings.volumes[v.id]} />
                ))}
              </div>
            </div>
          )}
        </div>
        <time>{now.toLocaleTimeString(localeTag(), { hour: '2-digit', minute: '2-digit' })}</time>
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
          <h3>{t.guide}</h3>
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
            <h2>{t.blocked.title}</h2>
            <p>{t.blocked.body(run.scenario.npc.name)}</p>
            <div className="choices">
              <button onClick={() => run.retryKeepClues()}>
                <b>{t.blocked.keepTitle}</b>
                <span>{t.blocked.keepDesc}</span>
              </button>
              <button onClick={onRestart}>
                <b>{t.blocked.freshTitle}</b>
                <span>
                  {answerChanges
                    ? t.blocked.freshDescChanges
                    : t.blocked.freshDesc}
                </span>
              </button>
            </div>
            <div className="actions">
              <button className="ghost" onClick={onQuit}>
                {tt.common.toMissions}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const NOTICE_SFX: Record<Notice['kind'], Sfx> = {
  clue: 'clue',
  fact: 'clue',
  inference: 'inference',
  hint: 'notice',
  warn: 'error',
}
