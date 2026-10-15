// 메인 화면 ({x.title}): 움직이는 사람 관계망 배경, 깨지는 로고, 세로 메뉴(↑↓·Enter), 배경음
import { getCurrentWindow } from '@tauri-apps/api/window'
import { isTauri } from '@tauri-apps/api/core'
import { useEffect, useRef, useState } from 'react'
import type { ScenarioSpec } from '../engine/types'
import { useSave } from '../game/save'
import { play, startBgm, stopBgm } from '../game/sound'
import { APP_VERSION, useNewVersion } from '../game/version'
import { useT } from '../i18n'
import { ModelSetup } from './ModelSetup'

interface Props {
  missions: ScenarioSpec[]
  /** 이어하기: 아직 깨지 않은 첫 미션 (모두 깼으면 null) */
  onContinue: (id: string) => void
  onMissions: () => void
  onSettings: () => void
}

/** 점과 선으로 된 관계망이 천천히 떠다니고, 가끔 한 점이 "뚫린" 듯 빨갛게 깜빡인다 */
function Backdrop() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    const g = cv?.getContext('2d')
    if (!cv || !g) return
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    const resize = () => {
      w = cv.width = cv.clientWidth * devicePixelRatio
      h = cv.height = cv.clientHeight * devicePixelRatio
    }
    resize()
    addEventListener('resize', resize)
    const nodes = Array.from({ length: 46 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00012,
      vy: (Math.random() - 0.5) * 0.00012,
      hot: 0,
    }))
    let raf = 0
    let last = performance.now()
    const draw = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now
      g.clearRect(0, 0, w, h)
      const link = 0.17 * Math.max(w, h)
      if (Math.random() < 0.004) nodes[Math.floor(Math.random() * nodes.length)].hot = 1
      for (const n of nodes) {
        if (!still) {
          n.x = (n.x + n.vx * dt + 1) % 1
          n.y = (n.y + n.vy * dt + 1) % 1
        }
        n.hot = Math.max(0, n.hot - dt / 2200)
      }
      for (let i = 0; i < nodes.length; i++)
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]
          const b = nodes[j]
          const d = Math.hypot((a.x - b.x) * w, (a.y - b.y) * h)
          if (d > link) continue
          const hot = Math.max(a.hot, b.hot)
          g.strokeStyle = hot > 0 ? `rgba(255,90,90,${0.08 + hot * 0.4})` : `rgba(56,212,122,${0.12 * (1 - d / link)})`
          g.lineWidth = devicePixelRatio
          g.beginPath()
          g.moveTo(a.x * w, a.y * h)
          g.lineTo(b.x * w, b.y * h)
          g.stroke()
        }
      for (const n of nodes) {
        g.fillStyle = n.hot > 0 ? `rgba(255,90,90,${0.4 + n.hot * 0.6})` : 'rgba(56,212,122,0.45)'
        g.beginPath()
        g.arc(n.x * w, n.y * h, (n.hot > 0 ? 3.2 : 2) * devicePixelRatio, 0, Math.PI * 2)
        g.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', resize)
    }
  }, [])
  return <canvas ref={ref} className="backdrop" aria-hidden />
}

export function TitleScreen({ missions, onContinue, onMissions, onSettings }: Props) {
  const save = useSave()
  const t = useT().screens.title
  const latest = useNewVersion()
  const started = missions.some((m) => save.mission(m.id).cleared)
  const next = missions.find((m) => !save.mission(m.id).cleared)

  useEffect(() => {
    startBgm()
    return stopBgm
  }, [])

  const items = [
    ...(next ? [{ id: 'continue', label: started ? t.continue : t.newGame, run: () => onContinue(next.id) }] : []),
    { id: 'missions', label: t.missions, run: onMissions },
    { id: 'settings', label: t.settings, run: onSettings },
    ...(isTauri() ? [{ id: 'quit', label: t.quit, run: () => void getCurrentWindow().close() }] : []),
  ]
  const [sel, setSel] = useState(0)
  const pick = (i: number) => {
    play('select')
    items[i].run()
  }

  // 키보드로 메뉴 고르기
  const keys = useRef({ items, sel })
  keys.current = { items, sel }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { items, sel } = keys.current
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setSel((sel + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length)
        play('hover')
      } else if (e.key === 'Enter') {
        e.preventDefault()
        play('select')
        items[sel].run()
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="screen title main-title">
      <Backdrop />
      <div className="title-body">
        {latest && <p className="banner-info">{t.newVersion(latest)}</p>}
        <h1 className="logo" data-text="SOCIAL_ENGINEER">
          SOCIAL<span>_</span>ENGINEER
        </h1>
        <p className="tagline">{t.tagline}</p>
        <ModelSetup />
        <nav className="menu">
          {items.map((it, i) => (
            <button
              key={it.id}
              className={i === sel ? 'on' : ''}
              onMouseEnter={() => {
                if (i !== sel) play('hover')
                setSel(i)
              }}
              onClick={() => pick(i)}
            >
              {it.label}
            </button>
          ))}
        </nav>
        <small className="menu-hint">{t.hint}</small>
      </div>
      <small className="version corner">v{APP_VERSION}</small>
    </div>
  )
}
