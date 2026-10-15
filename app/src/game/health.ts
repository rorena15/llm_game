// 모델 서버 연결 상태 ({robust}). 미션 시작 전과 대화 실패 때 확인하고, 화면에 안내를 띄운다
import { useSyncExternalStore } from 'react'
import type { LlmHealth } from '../engine/llm'
import { isReady, runtime, SIDECAR } from './runtime'
import { llm } from './scenarios'

/** missing 모델을 아직 받지 않음 · failed 함께 든 모델 서버를 띄우지 못함 (배포본만) */
export type Health = LlmHealth | 'checking' | 'missing' | 'failed'

let status: Health = 'checking'
const listeners = new Set<() => void>()
const set = (s: Health) => {
  status = s
  listeners.forEach((f) => f())
}

export async function checkHealth() {
  if (SIDECAR) {
    const server = runtime().server
    if (!isReady(llm.modelName)) return set('missing')
    if (server === 'starting') return set('checking')
    if (server === 'failed') return set('failed')
  }
  set('checking')
  set(await llm.ping())
}

export function markDown() {
  set('down')
}

export function useHealth(): Health {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => status,
  )
}

