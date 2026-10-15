// 설정 ({pack}): 값은 진행 저장의 settings에 둔다. 기본값과 화면에 적용하는 일만 여기서
import { applyLang } from '../i18n'
import { checkHealth } from './health'
import { SIDECAR, switchModel } from './runtime'
import { save } from './save'
import { llm } from './scenarios'

export const MODELS = [
  { id: 'se-kanana-8b' },
  { id: 'se-kanana-2.1b' },
] as const

export const TEXT_SPEEDS = [
  { id: 'slow', ms: 45 },
  { id: 'normal', ms: 28 },
  { id: 'fast', ms: 12 },
  { id: 'instant', ms: 0 },
] as const

export const TEXT_SIZES = [
  { id: 'small', zoom: 0.9 },
  { id: 'normal', zoom: 1 },
  { id: 'large', zoom: 1.15 },
] as const

const get = (key: string, fallback: string) => {
  const v = save.data.settings[key]
  return typeof v === 'string' ? v : fallback
}

export const textSpeed = () => get('textSpeed', 'normal')
export const textSize = () => get('textSize', 'normal')
export const modelId = () => get('model', llm.modelName)

/** 대사 한 글자 간격(ms). 0이면 한 번에 */
export const typeMs = () => TEXT_SPEEDS.find((s) => s.id === textSpeed())?.ms ?? 28

export function applyTextSize() {
  const zoom = TEXT_SIZES.find((s) => s.id === textSize())?.zoom ?? 1
  document.body.style.setProperty('zoom', String(zoom))
}

/** 저장된 설정을 화면과 모델 연결에 적용한다 (시작할 때 한 번) */
export function applySettings() {
  applyLang()
  applyTextSize()
  llm.setModel(modelId())
}

export function setSetting(key: 'textSpeed' | 'textSize' | 'model', value: string) {
  save.setSetting(key, value)
  if (key === 'textSize') applyTextSize()
  if (key === 'model') {
    llm.setModel(value)
    if (SIDECAR) void switchModel(value)
    else void checkHealth()
  }
}
