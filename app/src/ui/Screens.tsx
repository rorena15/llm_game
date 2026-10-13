import type { ScenarioSpec } from '../engine/types'
import type { MissionRun } from '../game/run'
import { useSave } from '../game/save'

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n))

interface TitleProps {
  missions: ScenarioSpec[]
  /** 개발용: 잠긴 미션도 고를 수 있게 */
  unlockAll?: boolean
  onPick: (id: string) => void
}

/** 미션은 난이도 순. 앞 미션을 깨야 다음이 열린다 (§2) */
export function TitleScreen({ missions, unlockAll, onPick }: TitleProps) {
  const save = useSave()
  return (
    <div className="screen title">
      <h1>
        SOCIAL<span>_</span>ENGINEER
      </h1>
      <p className="sub">말 몇 마디로 열리는 문</p>
      <ul className="missions">
        {missions.map((m, i) => {
          const rec = save.mission(m.id)
          const open = unlockAll || i === 0 || save.mission(missions[i - 1].id).cleared
          return (
            <li key={m.id}>
              <button onClick={() => onPick(m.id)} disabled={!open} className={rec.cleared ? 'cleared' : ''}>
                <b>{open ? m.title : '잠김: 앞 미션을 완료하세요'}</b>
                <span>
                  {m.difficulty > 0 ? stars(m.difficulty) : '튜토리얼'}
                  {rec.best && <em className={`grade g${rec.best}`}>{rec.best}</em>}
                </span>
              </button>
            </li>
          )
        })}
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
  const mins = Math.max(1, Math.round(((run.clearedAt ?? Date.now()) - run.startedAt) / 60000))
  const grade = run.grade
  const turns = run.session.state.history.filter((l) => l.role === 'player').length
  return (
    <div className="screen result">
      <div className="dialog">
        <h2>ACCESS GRANTED</h2>
        <p className="sub">{sc.title}</p>
        <div className={`grade-big g${grade}`}>
          <b>{grade}</b>
          <small>{run.score}점</small>
        </div>
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
          <dt>헛짚은 연결</dt>
          <dd>{run.wrongLinks}회</dd>
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
