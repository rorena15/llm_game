import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { useT } from '../i18n'

export interface WinPos {
  x: number
  y: number
}

export interface WinSize {
  w: number
  h: number
}

/** 작업 표시줄 높이 (최대화한 창은 그 위까지) */
export const TASKBAR_H = 44
const MIN_W = 320
const MIN_H = 200

interface Props {
  title: string
  pos: WinPos
  size: WinSize
  z: number
  maximized: boolean
  minimized: boolean
  onMove: (p: WinPos) => void
  onResize: (s: WinSize) => void
  onFocus: () => void
  onMinimize: () => void
  onToggleMax: () => void
  onClose: () => void
  children: ReactNode
}

type Edge = 'r' | 'b' | 'rb'

/** 끌어서 옮기고, 오른쪽·아래 가장자리를 끌어 크기를 바꾸는 창. 위치·크기·순서는 데스크톱이 관리한다.
 * 최소화한 창은 내용이 사라지지 않게 숨기기만 한다 */
export function Window(p: Props) {
  const t = useT().desktop.window
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const resize = useRef<{ edge: Edge; x: number; y: number; w: number; h: number } | null>(null)

  const startResize = (edge: Edge) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (p.maximized) return
    e.stopPropagation()
    resize.current = { edge, x: e.clientX, y: e.clientY, w: p.size.w, h: p.size.h }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onResizeMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = resize.current
    if (!r) return
    const maxW = window.innerWidth - p.pos.x
    const maxH = window.innerHeight - TASKBAR_H - p.pos.y
    const w = r.edge === 'b' ? r.w : Math.max(MIN_W, Math.min(maxW, r.w + e.clientX - r.x))
    const h = r.edge === 'r' ? r.h : Math.max(MIN_H, Math.min(maxH, r.h + e.clientY - r.y))
    p.onResize({ w, h })
  }
  const endResize = () => (resize.current = null)
  const handle = (edge: Edge) => (
    <div className={`resize ${edge}`} onPointerDown={startResize(edge)} onPointerMove={onResizeMove} onPointerUp={endResize} />
  )

  const style = p.maximized
    ? { left: 0, top: 0, zIndex: p.z, width: '100%', height: `calc(100% - ${TASKBAR_H}px)` }
    : { left: p.pos.x, top: p.pos.y, zIndex: p.z, width: p.size.w, height: p.size.h }

  return (
    <div
      className={`window${p.maximized ? ' maximized' : ''}${p.minimized ? ' minimized' : ''}`}
      style={style}
      onPointerDown={p.onFocus}
    >
      <div
        className="titlebar"
        onDoubleClick={(e) => !(e.target as HTMLElement).closest('button') && p.onToggleMax()}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button') || p.maximized) return
          drag.current = { dx: e.clientX - p.pos.x, dy: e.clientY - p.pos.y }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          const x = Math.max(0, Math.min(window.innerWidth - 120, e.clientX - drag.current.dx))
          const y = Math.max(0, Math.min(window.innerHeight - TASKBAR_H - 40, e.clientY - drag.current.dy))
          p.onMove({ x, y })
        }}
        onPointerUp={() => (drag.current = null)}
      >
        <span>{p.title}</span>
        <div className="win-buttons">
          <button className="min" onClick={p.onMinimize} aria-label={t.minimize} title={t.minimize}>
            ─
          </button>
          <button className="max" onClick={p.onToggleMax} aria-label={p.maximized ? t.restore : t.maximize} title={p.maximized ? t.restore : t.maximize}>
            {p.maximized ? '❐' : '□'}
          </button>
          <button className="close" onClick={p.onClose} aria-label={t.close} title={t.close}>
            ×
          </button>
        </div>
      </div>
      <div className="window-body">{p.children}</div>
      {!p.maximized && (
        <>
          {handle('r')}
          {handle('b')}
          {handle('rb')}
        </>
      )}
    </div>
  )
}
