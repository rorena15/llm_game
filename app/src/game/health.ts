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

export const HEALTH_TEXT: Record<Exclude<Health, 'ok'>, string> = {
  checking: '대화 모델을 확인하는 중입니다…',
  down: '대화 모델 서버에 연결할 수 없습니다. 모델 서버가 실행 중인지 확인해 주세요. 튜토리얼은 모델 없이 할 수 있습니다.',
  nomodel: '모델 서버는 켜져 있지만 대화 모델이 올라와 있지 않습니다. 설정에서 모델을 확인해 주세요.',
}
