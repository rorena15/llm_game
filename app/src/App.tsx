import { useEffect, useState, type ReactNode } from 'react'
import { applyVariant, pickVariant } from './engine/scenario'
import { useDevFlags } from './game/dev'
import { MissionRun, useRun } from './game/run'
import { save, useSave } from './game/save'
import { llm, scenarios } from './game/scenarios'
import { ENDING } from './game/story'
import { msg } from './i18n'
import { DevPanel } from './ui/DevPanel'
import { Desktop } from './ui/Desktop'
import { EndingScreen } from './ui/Ending'
import { LicenseScreen, SettingsScreen } from './ui/Settings'
import { BriefingScreen, ResultScreen, TitleScreen } from './ui/Screens'

type Screen =
  | { name: 'title' }
  | { name: 'briefing'; id: string }
  | { name: 'play'; run: MissionRun }
  | { name: 'ending' }
  | { name: 'settings' }
  | { name: 'licenses' }

/** 새로 시작할 때마다 지난번과 다른 변형 (§7.1). 고른 변형은 저장한다. variantId는 개발자 패널이 정할 때만 */
function startRun(id: string, variantId?: string): MissionRun {
  const spec = scenarios()[id]
  const variant = spec.variants.find((v) => v.id === variantId) ?? pickVariant(spec, save.mission(id).variant)
  save.startVariant(id, variant.id)
  return new MissionRun(applyVariant(spec, variant), llm)
}

export default function App() {
  useSave()
  const dev = useDevFlags()
  const [screen, setScreen] = useState<Screen>({ name: 'title' })
  const missions = Object.values(scenarios()).sort((a, b) => a.difficulty - b.difficulty)
  const play = (id: string, variant?: string) => setScreen({ name: 'play', run: startRun(id, variant) })

  let body: ReactNode
  if (screen.name === 'title')
    body = (
      <TitleScreen
        missions={missions}
        unlockAll={dev.unlockAll}
        onPick={(id) => (dev.skipBriefing ? play(id) : setScreen({ name: 'briefing', id }))}
        onSettings={() => setScreen({ name: 'settings' })}
      />
    )
  else if (screen.name === 'briefing') {
    const spec = scenarios()[screen.id]
    body = (
      <BriefingScreen spec={spec} onBack={() => setScreen({ name: 'title' })} onStart={() => play(spec.id)} />
    )
  } else if (screen.name === 'settings')
    body = (
      <SettingsScreen onBack={() => setScreen({ name: 'title' })} onLicenses={() => setScreen({ name: 'licenses' })} />
    )
  else if (screen.name === 'licenses') body = <LicenseScreen onBack={() => setScreen({ name: 'settings' })} />
  else if (screen.name === 'ending') body = <EndingScreen ending={ENDING} onDone={() => setScreen({ name: 'title' })} />
  else
    body = (
      <Play
        key={screen.run.startedAt}
        run={screen.run}
        debug={dev.showDebug}
        onQuit={() => setScreen({ name: 'title' })}
        onRestart={() => play(screen.run.scenario.id)}
        onEnding={screen.run.scenario.id === ENDING.afterMission ? () => setScreen({ name: 'ending' }) : undefined}
      />
    )

  return (
    <>
      {body}
      <DevPanel
        missions={missions}
        screen={screen.name === 'play' ? `play:${screen.run.scenario.id}` : screen.name}
        run={screen.name === 'play' ? screen.run : undefined}
        onJump={(to) => setScreen({ name: to } as Screen)}
        onBriefing={(id) => setScreen({ name: 'briefing', id })}
        onStart={play}
      />
    </>
  )
}

interface PlayProps {
  run: MissionRun
  debug: boolean
  onQuit: () => void
  onRestart: () => void
  onEnding?: () => void
}

function Play({ run, debug, onQuit, onRestart, onEnding }: PlayProps) {
  useRun(run)
  const cleared = run.status === 'cleared'
  useEffect(() => {
    if (cleared) save.recordClear(run.scenario.id, run.grade, run.score)
  }, [cleared, run])
  if (cleared) return <ResultScreen run={run} onBack={onQuit} onEnding={onEnding} />
  return (
    <>
      <Desktop
        run={run}
        playerName={msg().desktop.playerName}
        debug={debug}
        onQuit={onQuit}
        onRestart={onRestart}
        answerChanges={scenarios()[run.scenario.id].variants.length > 1}
      />
      {debug && <div className="debug-badge">{msg().desktop.debugBadge(run.scenario.variantId, run.scenario.passwordValue)}</div>}
    </>
  )
}
