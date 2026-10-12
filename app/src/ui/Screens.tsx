import type { ScenarioSpec } from '../engine/types'
import type { MissionRun } from '../game/run'

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n))

export function TitleScreen({ missions, onPick }: { missions: ScenarioSpec[]; onPick: (id: string) => void }) {
  return (
    <div className="screen title">
      <h1>
        SOCIAL<span>_</span>ENGINEER
      </h1>
      <p className="sub">말 몇 마디로 열리는 문</p>
      <ul className="missions">
        {missions.map((m) => (
          <li key={m.id}>
            <button onClick={() => onPick(m.id)}>
              <b>{m.title}</b>
              <span>{m.difficulty > 0 ? stars(m.difficulty) : '튜토리얼'}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function BriefingScreen({ spec, onStart, onBack }: { spec: ScenarioSpec; onStart: () => void; onBack: () => void }) {
  return (
    <div className="screen briefing">
      <div className="dialog">
        <h2>{spec.title}</h2>
        <pre>{spec.briefing}</pre>
        <div className="actions">
          <button onClick={onStart}>작전 시작</button>
          <button className="ghost" onClick={onBack}>
            돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}

export function ResultScreen({ run, onBack }: { run: MissionRun; onBack: () => void }) {
  const sc = run.scenario
  const mins = Math.max(1, Math.round((Date.now() - run.startedAt) / 60000))
  const turns = run.session.state.history.filter((l) => l.role === 'player').length
  return (
    <div className="screen result">
      <div className="dialog">
        <h2>ACCESS GRANTED</h2>
        <p className="sub">{sc.title}</p>
        {sc.secretDocuments.map((d, i) => (
          <pre key={i} className="secret">
            {d}
          </pre>
        ))}
        <dl className="stats">
          <dt>걸린 시간</dt>
          <dd>{mins}분</dd>
          <dt>대화</dt>
          <dd>{turns}마디</dd>
          <dt>최대 경계</dt>
          <dd>{run.session.state.maxSuspicion}</dd>
          <dt>로그인 실패</dt>
          <dd>{run.loginFails}회</dd>
          <dt>다시 접근</dt>
          <dd>{run.retries}회</dd>
        </dl>
        <div className="actions">
          <button onClick={onBack}>미션 선택으로</button>
        </div>
      </div>
    </div>
  )
}
