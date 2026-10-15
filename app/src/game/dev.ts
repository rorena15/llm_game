// 개발자 패널 설정. 개발 빌드(npm run dev·web)이거나 주소에 ?debug가 있을 때만 켜진다.
// 배포 빌드에서는 enabled가 false라 패널도 잠금 해제도 없다
import { useSyncExternalStore } from 'react'

export const DEV_ENABLED = import.meta.env.DEV || new URLSearchParams(location.search).has('debug')

export interface DevFlags {
  /** 잠긴 미션도 고를 수 있게 */
  unlockAll: boolean
  /** 매 턴의 판정·수치, 변형과 비밀번호를 화면에 보이기 */
  showDebug: boolean
  /** 브리핑을 건너뛰고 바로 데스크톱으로 */
  skipBriefing: boolean
  /** 켤 때 시작 트레일러를 건너뛰기 */
  skipIntro: boolean
  /** 패널을 펼쳐 둘지 */
  open: boolean
}

const KEY = 'social-engineer.dev'
const DEFAULTS: DevFlags = { unlockAll: true, showDebug: true, skipBriefing: false, skipIntro: false, open: false }

function load(): DevFlags {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<DevFlags>) }
  } catch {
    return { ...DEFAULTS }
  }
}

let flags: DevFlags = DEV_ENABLED ? load() : { ...DEFAULTS, unlockAll: false, showDebug: false }
let version = 0
const listeners = new Set<() => void>()

export function devFlags(): DevFlags {
  return flags
}

export function setDevFlag<K extends keyof DevFlags>(key: K, value: DevFlags[K]) {
  if (!DEV_ENABLED) return
  flags = { ...flags, [key]: value }
  try {
    localStorage.setItem(KEY, JSON.stringify(flags))
  } catch {
    /* 이번 실행 동안만 기억한다 */
  }
  version++
  listeners.forEach((f) => f())
}

export function useDevFlags(): DevFlags {
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => version,
  )
  return flags
}
