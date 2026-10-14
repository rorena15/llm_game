// 모델 서버 연결 상태 ({robust}). 미션 시작 전과 대화 실패 때 확인하고, 화면에 안내를 띄운다
import { useSyncExternalStore } from 'react'
import type { LlmHealth } from '../engine/llm'
import { llm } from './scenarios'

export type Health = LlmHealth | 'checking'

let status: Health = 'checking'
const listeners = new Set<() => void>()
const set = (s: Health) => {
  status = s
  listeners.forEach((f) => f())
}

export async function checkHealth() {
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

