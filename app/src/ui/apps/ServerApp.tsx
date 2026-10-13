import { useState } from 'react'
import { LOGIN_FAIL_SUSPICION, useRun, type MissionRun } from '../../game/run'
import { play } from '../../game/sound'

export function ServerApp({ run }: { run: MissionRun }) {
  useRun(run)
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const hints = run.loginHints

  return (
    <div className="server">
      <pre className="banner">{`CorpX Intranet  ::  secure login\n대상 계정: ${run.scenario.npc.name}`}</pre>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!pw.trim() || run.status !== 'playing') return
          const ok = run.tryLogin(pw)
          setMsg(ok ? '접속 성공' : `접속 거부 (보안 경고 +${LOGIN_FAIL_SUSPICION})`)
          if (!ok) setPw('')
        }}
      >
        <input
          onKeyDown={() => play('key')}
          type="text"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="비밀번호"
          spellCheck={false}
          autoComplete="off"
          disabled={run.status !== 'playing'}
        />
        <button disabled={run.status !== 'playing'}>로그인</button>
      </form>
      {msg && <p className={msg === '접속 성공' ? 'ok' : 'err'}>{msg}</p>}
      {hints.length > 0 && (
        <div className="login-hints">
          <small>형식 힌트</small>
          {hints.map((h) => (
            <code key={h}>{h}</code>
          ))}
        </div>
      )}
      <p className="hint">로그인 실패 {run.loginFails}회. 실패할 때마다 보안 시스템의 의심이 오릅니다.</p>
    </div>
  )
}
