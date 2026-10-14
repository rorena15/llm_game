import { useState } from 'react'
import { LOGIN_FAIL_SUSPICION, useRun, type MissionRun } from '../../game/run'
import { play } from '../../game/sound'
import { useT } from '../../i18n'

export function ServerApp({ run }: { run: MissionRun }) {
  useRun(run)
  const t = useT().apps.server
  const [pw, setPw] = useState('')
  const [result, setResult] = useState<'ok' | 'denied' | null>(null)
  const hints = run.loginHints

  return (
    <div className="server">
      <pre className="banner">{`CorpX Intranet  ::  secure login\n${t.target(run.scenario.npc.name)}`}</pre>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!pw.trim() || run.status !== 'playing') return
          const ok = run.tryLogin(pw)
          setResult(ok ? 'ok' : 'denied')
          if (!ok) setPw('')
        }}
      >
        <input
          onKeyDown={() => play('key')}
          type="text"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder={t.password}
          spellCheck={false}
          autoComplete="off"
          disabled={run.status !== 'playing'}
        />
        <button disabled={run.status !== 'playing'}>{t.login}</button>
      </form>
      {result && <p className={result === 'ok' ? 'ok' : 'err'}>{result === 'ok' ? t.success : t.denied(LOGIN_FAIL_SUSPICION)}</p>}
      {hints.length > 0 && (
        <div className="login-hints">
          <small>{t.formatHint}</small>
          {hints.map((h) => (
            <code key={h}>{h}</code>
          ))}
        </div>
      )}
      <p className="hint">{t.fails(run.loginFails)}</p>
    </div>
  )
}
