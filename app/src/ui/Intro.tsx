// 시작 트레일러 ({x.title}). 아무 키나 누르면 (소리를 깨운 뒤) 약 14초짜리 장면이 흐르고, 언제든 키를 누르면 건너뛴다.
// 흐름: 브라운관이 켜짐 → 접속 기록 → 메신저 대화 → 화면이 깨짐 → 로고
import { useEffect, useRef, useState } from 'react'
import { play } from '../game/sound'
import { useT } from '../i18n'

type Phase = 'press' | 'boot' | 'chat' | 'glitch' | 'logo'

/** 장면마다 시작 시각(ms, 키를 누른 때부터) */
const AT = { boot: 0, chat: 4200, glitch: 9600, logo: 10400, end: 15000 }
const BOOT_LINE_MS = 650
const CHAT_LINE_MS = 1500

export function Intro({ onDone }: { onDone: () => void }) {
  const all = useT()
  const t = all.screens.intro
  const [phase, setPhase] = useState<Phase>('press')
  const [elapsed, setElapsed] = useState(0)
  const start = useRef(0)
  const done = useRef(false)
  const finish = useRef(onDone)
  finish.current = onDone

  // 키·클릭: 첫 번째는 시작, 그다음은 건너뛰기
  useEffect(() => {
    const onKey = () => {
      if (phase === 'press') {
        start.current = performance.now()
        setPhase('boot')
        play('boot')
      } else if (!done.current) {
        done.current = true
        finish.current()
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onKey)
    }
  }, [phase])

  // 시간에 따라 장면을 넘긴다
  useEffect(() => {
    if (phase === 'press') return
    let raf = 0
    const step = () => {
      const ms = performance.now() - start.current
      setElapsed(ms)
      const next: Phase = ms >= AT.logo ? 'logo' : ms >= AT.glitch ? 'glitch' : ms >= AT.chat ? 'chat' : 'boot'
      setPhase((p) => (p === next ? p : next))
      if (ms >= AT.end && !done.current) {
        done.current = true
        finish.current()
        return
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [phase === 'press']) // eslint-disable-line react-hooks/exhaustive-deps

  // 장면이 바뀔 때 소리
  useEffect(() => {
    if (phase === 'glitch') play('glitch')
    if (phase === 'logo') play('boom')
  }, [phase])

  const bootShown = Math.min(t.boot.length, Math.floor((elapsed - 400) / BOOT_LINE_MS) + 1)
  const chatShown = Math.min(t.chat.length, Math.floor((elapsed - AT.chat - 300) / CHAT_LINE_MS) + 1)
  // 새 줄이 보일 때마다 짧은 삑
  const lines = phase === 'boot' ? bootShown : phase === 'chat' ? chatShown : 0
  const prevLines = useRef(0)
  useEffect(() => {
    if (lines > prevLines.current) play(phase === 'chat' ? 'notice' : 'blip')
    prevLines.current = lines
  }, [lines, phase])

  if (phase === 'press')
    return (
      <div className="intro scene-press">
        <p className="press-key">{t.press}</p>
      </div>
    )

  // 장면 이름을 그대로 클래스로 쓰면 'logo'가 .logo 스타일과 겹친다
  return (
    <div className={`intro scene-${phase}`}>
      <div className="crt-on" />
      {phase === 'boot' && (
        <pre className="intro-boot">
          {t.boot.slice(0, Math.max(0, bootShown)).map((l, i) => (
            <div key={i} className={i === t.boot.length - 1 ? 'last' : ''}>
              {'> '}
              {l}
            </div>
          ))}
          <span className="cursor">_</span>
        </pre>
      )}
      {(phase === 'chat' || phase === 'glitch') && (
        <div className="intro-chat">
          {t.chat.slice(0, Math.max(0, chatShown)).map((m, i) => (
            <p key={i} className={`bubble ${m.from}`}>
              {m.text}
            </p>
          ))}
        </div>
      )}
      {phase === 'logo' && (
        <div className="intro-logo">
          <h1 className="logo" data-text="SOCIAL_ENGINEER">
            SOCIAL<span>_</span>ENGINEER
          </h1>
          <p className="tagline">{all.screens.title.tagline}</p>
        </div>
      )}
      <small className="intro-skip">{t.skip}</small>
    </div>
  )
}
