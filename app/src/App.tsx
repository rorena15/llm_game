import { useState } from 'react'
import { applyVariant, pickVariant } from './engine/scenario'
import { MissionRun, useRun } from './game/run'
import { llm, SCENARIOS } from './game/scenarios'
import { Desktop } from './ui/Desktop'
import { BriefingScreen, ResultScreen, TitleScreen } from './ui/Screens'

type Screen = { name: 'title' } | { name: 'briefing'; id: string } | { name: 'play'; run: MissionRun }

const debug = new URLSearchParams(location.search).has('debug')
const PLAYER = '나'

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'title' })
  const missions = Object.values(SCENARIOS).sort((a, b) => a.difficulty - b.difficulty)

  if (screen.name === 'title') return <TitleScreen missions={missions} onPick={(id) => setScreen({ name: 'briefing', id })} />

  if (screen.name === 'briefing') {
    const spec = SCENARIOS[screen.id]
    return (
      <BriefingScreen
        spec={spec}
        onBack={() => setScreen({ name: 'title' })}
        onStart={() => setScreen({ name: 'play', run: new MissionRun(applyVariant(spec, pickVariant(spec)), llm) })}
      />
    )
  }

  return <Play run={screen.run} onQuit={() => setScreen({ name: 'title' })} />
}

function Play({ run, onQuit }: { run: MissionRun; onQuit: () => void }) {
  useRun(run)
  if (run.status === 'cleared') return <ResultScreen run={run} onBack={onQuit} />
  return (
    <>
      <Desktop run={run} playerName={PLAYER} debug={debug} onQuit={onQuit} />
      {debug && <div className="debug-badge">변형 {run.scenario.variantId} · 비밀번호 {run.scenario.passwordValue}</div>}
    </>
  )
}
