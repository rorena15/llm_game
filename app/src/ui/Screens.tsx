import type { ScenarioSpec } from '../engine/types'
import { CALM_MAX, CHALLENGES, QUICK_TURNS } from '../game/challenge'
import type { MissionRun } from '../game/run'
import { useSave } from '../game/save'
import { useEffect } from 'react'
import { play } from '../game/sound'
import { APP_VERSION, useNewVersion } from '../game/version'
import { checkHealth, useHealth } from '../game/health'
import { useT } from '../i18n'
import { MailCard } from './Ending'
import { ModelSetup } from './ModelSetup'

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n))

interface TitleProps {
  missions: ScenarioSpec[]
  /** 개발용: 잠긴 미션도 고를 수 있게 */
  unlockAll?: boolean
  onPick: (id: string) => void
  onSettings: () => void
}

/** 미션은 난이도 순. 앞 미션을 깨야 다음이 열린다 (§2) */
export function TitleScreen({ missions, unlockAll, onPick, onSettings }: TitleProps) {
  const save = useSave()
  const t = useT()
  const latest = useNewVersion()
  return (
    <div className="screen title">
      {latest && <p className="banner-info">{t.screens.title.newVersion(latest)}</p>}
      <h1>
        SOCIAL<span>_</span>ENGINEER
      </h1>
      <p className="sub">{t.screens.title.tagline}</p>
      <ModelSetup />
      <ul className="missions">
        {missions.map((m, i) => {
          const rec = save.mission(m.id)
          const open = unlockAll || i === 0 || save.mission(missions[i - 1].id).cleared
          return (
            <li key={m.id}>
              <button onClick={() => onPick(m.id)} disabled={!open} className={rec.cleared ? 'cleared' : ''}>
                <b>{open ? m.title : t.screens.title.locked}</b>
                <span>
                  {m.difficulty > 0 ? stars(m.difficulty) : t.screens.title.tutorial}
                  {rec.cleared && !m.script && (
                    <small className={`challenge-count${rec.challenges?.length === CHALLENGES.length ? ' all' : ''}`}>
                      {t.screens.title.challengeCount(rec.challenges?.length ?? 0, CHALLENGES.length)}
                    </small>
                  )}
                  {rec.best && <em className={`grade g${rec.best}`}>{rec.best}</em>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <button className="ghost title-settings" onClick={onSettings}>
        {t.screens.title.settings}
      </button>
      <small className="version">v{APP_VERSION}</small>
    </div>
  )
}

export function BriefingScreen({ spec, onStart, onBack }: { spec: ScenarioSpec; onStart: () => void; onBack: () => void }) {
  const t = useT()
  return (
    <div className="screen briefing">
      <div className="dialog">
        {spec.request && <MailCard {...spec.request} />}
        {!spec.script && <HealthBanner />}
        <h2>{spec.title}</h2>
        <pre>{spec.briefing}</pre>
        <div className="actions">
          <button onClick={onStart}>{t.screens.briefing.start}</button>
          <button className="ghost" onClick={onBack}>
            {t.common.back}
          </button>
        </div>
      </div>
    </div>
  )
}

interface ResultProps {
  run: MissionRun
  onBack: () => void
  /** 있으면 엔딩으로 이어지는 마지막 미션 */
  onEnding?: () => void
}

export function ResultScreen({ run, onBack, onEnding }: ResultProps) {
  const save = useSave()
  const t = useT()
  const r = t.screens.result
  const sc = run.scenario
  const mins = Math.max(1, Math.round(((run.clearedAt ?? Date.now()) - run.startedAt) / 60000))
  const grade = run.grade
  useEffect(() => {
    play('granted')
    // 등급 도장이 찍히는 때에 맞춰 (CSS stamp 0.55초 뒤)
    const timer = setTimeout(() => play('stamp'), 750)
    return () => clearTimeout(timer)
  }, [])
  const turns = run.session.state.history.filter((l) => l.role === 'player').length
  return (
    <div className="screen result">
      <div className="dialog">
        <h2>ACCESS GRANTED</h2>
        <p className="sub">{sc.title}</p>
        <div className={`grade-big stamp g${grade}`}>
          <b>{grade}</b>
          <small>{r.points(run.score)}</small>
        </div>
        {sc.secretDocuments.map((d, i) => (
          <pre key={i} className="secret">
            {d}
          </pre>
        ))}
        {!sc.script && (
          <div className="challenges">
            <b>{r.challenges}</b>
            <ul>
              {CHALLENGES.map((c) => {
                const now = run.challenges.includes(c)
                const ever = now || (save.mission(sc.id).challenges ?? []).includes(c)
                const isNew = run.newChallenges.includes(c)
                return (
                  <li key={c} className={`${now ? 'done' : ever ? 'past' : ''}${isNew ? ' new' : ''}`}>
                    <span>{now || ever ? '✓' : '·'}</span>
                    {r.challenge[c](c === 'quick' ? QUICK_TURNS : CALM_MAX)}
                    {isNew && <em>{r.newChallenge}</em>}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
        <dl className="stats">
          <dt>{r.time}</dt>
          <dd>{r.minutes(mins)}</dd>
          <dt>{r.turns}</dt>
          <dd>{r.turnsValue(turns)}</dd>
          <dt>{r.maxSuspicion}</dt>
          <dd>{run.session.state.maxSuspicion}</dd>
          <dt>{r.loginFails}</dt>
          <dd>{r.times(run.loginFails)}</dd>
          <dt>{r.wrongLinks}</dt>
          <dd>{r.times(run.wrongLinks)}</dd>
          <dt>{r.retries}</dt>
          <dd>{r.times(run.retries)}</dd>
        </dl>
        <div className="actions">
          {onEnding && <button onClick={onEnding}>{r.newMail}</button>}
          <button className={onEnding ? 'ghost' : ''} onClick={onBack}>
            {t.common.toMissions}
          </button>
        </div>
      </div>
    </div>
  )
}

/** 대화 모델이 준비되지 않았으면 알리고 다시 확인할 수 있게 한다 */
export function HealthBanner() {
  const h = useHealth()
  const t = useT()
  if (h === 'ok') return null
  return (
    <div className={`banner-warn${h === 'checking' ? ' dim' : ''}`}>
      <span>{t.common.health[h]}</span>
      {h !== 'checking' && <button onClick={() => void checkHealth()}>{t.common.retryCheck}</button>}
    </div>
  )
}
