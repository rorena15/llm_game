// 개발자 패널: 모든 화면·미션·변형으로 바로 가고, 진행 중인 미션의 상태를 바꾼다.
// 개발 빌드나 ?debug에서만 그린다 (DEV_ENABLED). Ctrl+Shift+D로 펼치고 접는다
import { useEffect, useState } from 'react'
import type { ScenarioSpec } from '../engine/types'
import { DEV_ENABLED, setDevFlag, useDevFlags, type DevFlags } from '../game/dev'
import { useRun, type MissionRun } from '../game/run'
import { useSave } from '../game/save'

export type DevJump = 'title' | 'settings' | 'licenses' | 'ending'

interface Props {
  missions: ScenarioSpec[]
  screen: string
  run?: MissionRun
  onJump: (to: DevJump) => void
  onBriefing: (id: string) => void
  onStart: (id: string, variant?: string) => void
}

const FLAGS: { key: Exclude<keyof DevFlags, 'open'>; label: string }[] = [
  { key: 'unlockAll', label: '미션 잠금 해제' },
  { key: 'showDebug', label: '판정·정답 표시' },
  { key: 'skipBriefing', label: '브리핑 건너뛰기' },
]

export function DevPanel(props: Props) {
  const flags = useDevFlags()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault()
        setDevFlag('open', !flags.open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flags.open])

  if (!DEV_ENABLED) return null
  if (!flags.open)
    return (
      <button className="dev-toggle" title="개발자 패널 (Ctrl+Shift+D)" onClick={() => setDevFlag('open', true)}>
        DEV
      </button>
    )
  return <Body {...props} flags={flags} />
}

function Body({ missions, screen, run, onJump, onBriefing, onStart, flags }: Props & { flags: DevFlags }) {
  const save = useSave()
  const [mission, setMission] = useState(missions[0]?.id ?? '')
  const spec = missions.find((m) => m.id === mission)
  const [variant, setVariant] = useState('')
  const variants = spec?.variants ?? []

  return (
    <aside className="dev-panel">
      <header>
        <b>DEV</b>
        <small>{screen}</small>
        <button className="ghost" onClick={() => setDevFlag('open', false)} title="접기 (Ctrl+Shift+D)">
          ✕
        </button>
      </header>

      <section>
        <h4>설정</h4>
        {FLAGS.map((f) => (
          <label key={f.key}>
            <input type="checkbox" checked={flags[f.key]} onChange={(e) => setDevFlag(f.key, e.target.checked)} />
            {f.label}
          </label>
        ))}
      </section>

      <section>
        <h4>화면</h4>
        <div className="row">
          <button onClick={() => onJump('title')}>타이틀</button>
          <button onClick={() => onJump('settings')}>설정</button>
          <button onClick={() => onJump('licenses')}>라이선스</button>
          <button onClick={() => onJump('ending')}>엔딩</button>
        </div>
      </section>

      <section>
        <h4>미션</h4>
        <div className="row">
          <select
            value={mission}
            onChange={(e) => {
              setMission(e.target.value)
              setVariant('')
            }}
          >
            {missions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
          <select value={variant} onChange={(e) => setVariant(e.target.value)}>
            <option value="">변형: 무작위</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                변형 {v.id} · {v.password}
              </option>
            ))}
          </select>
        </div>
        <div className="row">
          <button onClick={() => onStart(mission, variant || undefined)}>바로 시작</button>
          <button onClick={() => onBriefing(mission)}>브리핑</button>
        </div>
      </section>

      <section>
        <h4>저장</h4>
        <div className="row">
          <button onClick={() => save.devClearAll(missions.map((m) => m.id))}>모두 클리어(S)</button>
          <button onClick={() => save.devResetProgress()}>기록 초기화</button>
        </div>
      </section>

      {run && <RunControls run={run} />}
    </aside>
  )
}

function RunControls({ run }: { run: MissionRun }) {
  useRun(run)
  const st = run.session.state
  return (
    <section>
      <h4>
        진행 중 · 변형 {run.scenario.variantId} · <code>{run.scenario.passwordValue}</code>
      </h4>
      <p className="dim">
        {run.status} · 경계 {st.suspicion} (최대 {st.maxSuspicion}) · 친밀 {st.rapport} · 카드 {run.cards.length} ·{' '}
        {run.score}점 {run.grade}
      </p>
      <div className="row">
        <button onClick={() => run.devCollectAll()}>단서 모두</button>
        <button onClick={() => run.devSolveBoard()}>보드 풀기</button>
      </div>
      <div className="row">
        <span className="dim">경계</span>
        {[0, 50, 80, 100].map((n) => (
          <button key={n} onClick={() => run.devSetSuspicion(n)}>
            {n}
          </button>
        ))}
      </div>
      <div className="row">
        <span className="dim">친밀</span>
        {[0, 30, 60].map((n) => (
          <button key={n} onClick={() => run.devSetRapport(n)}>
            {n}
          </button>
        ))}
      </div>
      <div className="row">
        <button onClick={() => run.devClear()}>즉시 클리어</button>
        <button className="danger" onClick={() => run.devFail()}>
          접속 차단
        </button>
      </div>
    </section>
  )
}
