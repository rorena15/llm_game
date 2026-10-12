import { useRef, type ReactNode } from 'react'

export interface WinPos {
  x: number
  y: number
}

interface Props {
  title: string
  pos: WinPos
  z: number
  width: number
  height: number
  onMove: (p: WinPos) => void
  onFocus: () => void
  onClose: () => void
  children: ReactNode
}

/** 끌어서 옮길 수 있는 창. 위치·순서는 데스크톱이 관리한다 */
export function Window({ title, pos, z, width, height, onMove, onFocus, onClose, children }: Props) {
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  return (
    <div className="window" style={{ left: pos.x, top: pos.y, zIndex: z, width, height }} onPointerDown={onFocus}>
      <div
        className="titlebar"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return
          drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          const x = Math.max(0, Math.min(window.innerWidth - 120, e.clientX - drag.current.dx))
          const y = Math.max(0, Math.min(window.innerHeight - 80, e.clientY - drag.current.dy))
          onMove({ x, y })
        }}
        onPointerUp={() => (drag.current = null)}
      >
        <span>{title}</span>
        <button className="close" onClick={onClose} aria-label="닫기">
          ×
        </button>
      </div>
      <div className="window-body">{children}</div>
    </div>
  )
}
