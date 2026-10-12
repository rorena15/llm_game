import { useMemo, useState } from 'react'
import { applyVariant, pickVariant } from './engine/scenario'
import type { FactSpec } from './engine/types'
import { llm, SCENARIOS } from './game/scenarios'
import { Messenger } from './ui/Messenger'

// 1단계: 메신저 하나만 띄운다. 데스크톱·창 관리는 {ui}에서
export default function App() {
  const scenario = useMemo(() => {
    const spec = SCENARIOS.mission_1
    return applyVariant(spec, pickVariant(spec))
  }, [])
  const [clues, setClues] = useState<FactSpec[]>([])
  const debug = new URLSearchParams(location.search).has('debug')

  return (
    <main className="stage">
      <Messenger
        scenario={scenario}
        llm={llm}
        playerName="나"
        debug={debug}
        onClue={(f) => setClues((cs) => (cs.some((c) => c.id === f.id) ? cs : [...cs, f]))}
      />
      <aside className="clues">
        <h2>수집한 단서</h2>
        {clues.length === 0 && <p className="empty">아직 없음</p>}
        {clues.map((c) => (
          <div key={c.id} className="card">
            <b>{c.label}</b>
            <p>{c.text}</p>
          </div>
        ))}
        {debug && <p className="empty">변형 {scenario.variantId}</p>}
      </aside>
    </main>
  )
}
