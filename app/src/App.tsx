import { useEffect, useState } from 'react'
import { applyVariant, pickVariant } from './engine/scenario'
import { MissionRun, useRun } from './game/run'
import { save, useSave } from './game/save'
import { llm, SCENARIOS } from './game/scenarios'
import { Desktop } from './ui/Desktop'
import { BriefingScreen, ResultScreen, TitleScreen } from './ui/Screens'

type Screen = { name: 'title' } | { name: 'briefing'; id: string } | { name: 'play'; run: MissionRun }

const debug = new URLSearchParams(location.search).has('debug')
const PLAYER = '나'

/** 새로 시작할 때마다 지난번과 다른 변형 (§7.1). 고른 변형은 저장한다 */
function startRun(id: string): MissionRun {
  const spec = SCENARIOS[id]
  const variant = pickVariant(spec, save.mission(id).variant)
  save.startVariant(id, variant.id)
  return new MissionRun(applyVariant(spec, variant), llm)
}

export default function App() {
  useSave()
  const [screen, setScreen] = useState<Screen>({ name: 'title' })
  const missions = Object.values(SCENARIOS).sort((a, b) => a.difficulty - b.difficulty)

  if (screen.name === 'title')
    return (
      <TitleScreen missions={missions} unlockAll={debug} onPick={(id) => setScreen({ name: 'briefing', id })} />
    )

  if (screen.name === 'briefing') {
    const spec = SCENARIOS[screen.id]
    return (
      <BriefingScreen
        spec={spec}
        onBack={() => setScreen({ name: 'title' })}
        onStart={() => setScreen({ name: 'play', run: startRun(spec.id) })}
      />
    )
  }

  return (
    <Play
      key={screen.run.startedAt}
      run={screen.run}
      onQuit={() => setScreen({ name: 'title' })}
      onRestart={() => setScreen({ name: 'play', run: startRun(screen.run.scenario.id) })}
    />
  )
}

function Play({ run, onQuit, onRestart }: { run: MissionRun; onQuit: () => void; onRestart: () => void }) {
  useRun(run)
  const cleared = run.status === 'cleared'
  useEffect(() => {
    if (cleared) save.recordClear(run.scenario.id, run.grade, run.score)
  }, [cleared, run])
  if (cleared) return <ResultScreen run={run} onBack={onQuit} />
  return (
    <>
      <Desktop
        run={run}
        playerName={PLAYER}
        debug={debug}
        onQuit={onQuit}
        onRestart={onRestart}
        answerChanges={SCENARIOS[run.scenario.id].variants.length > 1}
      />
      {debug && <div className="debug-badge">변형 {run.scenario.variantId} · 비밀번호 {run.scenario.passwordValue}</div>}
    </>
  )
}
