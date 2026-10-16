// 사양 경고 ({robust}): 고품질 모델이 이 PC에 무거우면 가벼운 모델을 권한다
import { describe, expect, it } from 'vitest'
import { specWarning } from './runtime'

const gpu = (gb: number) => ({ name: 'GPU', total_mib: gb * 1024, free_mib: gb * 1024 })

describe('specWarning', () => {
  it('가벼운 모델은 경고하지 않는다', () => {
    expect(specWarning('se-kanana-2.1b', { gpus: [], server: 'cpu' })).toBeNull()
  })
  it('8B를 CPU로 돌리면 경고', () => {
    expect(specWarning('se-kanana-8b', { gpus: [gpu(12)], server: 'cpu' })).toEqual({ kind: 'cpu' })
  })
  it('VRAM이 6GB보다 작으면 경고', () => {
    expect(specWarning('se-kanana-8b', { gpus: [gpu(4)], server: 'gpu' })).toEqual({ kind: 'vram', gb: '4.0' })
    expect(specWarning('se-kanana-8b', { gpus: [], server: 'off' })).toEqual({ kind: 'vram', gb: '0.0' })
  })
  it('VRAM이 넉넉하거나 아직 모르면 경고하지 않는다', () => {
    expect(specWarning('se-kanana-8b', { gpus: [gpu(4), gpu(8)], server: 'gpu' })).toBeNull()
    expect(specWarning('se-kanana-8b', { gpus: null, server: 'starting' })).toBeNull()
  })
})
