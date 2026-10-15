import { describe, expect, it } from 'vitest'
import { achieved, CALM_MAX, QUICK_TURNS } from './challenge'
import { SaveStore, type SaveBackend } from './save'

const base = { turns: 5, maxSuspicion: 20, retries: 0, loginFails: 0, pretext: false }
const mem: SaveBackend = { load: async () => null, write: async () => {} }

describe('challenges', () => {
  it('a clean, short run gets all four', () => {
    expect(achieved(base)).toEqual(['quick', 'calm', 'oneShot', 'honest'])
  })
  it('each condition fails on its own', () => {
    expect(achieved({ ...base, turns: QUICK_TURNS + 1 })).not.toContain('quick')
    expect(achieved({ ...base, maxSuspicion: CALM_MAX + 1 })).not.toContain('calm')
    expect(achieved({ ...base, retries: 1 })).not.toContain('calm')
    expect(achieved({ ...base, loginFails: 1 })).not.toContain('oneShot')
    expect(achieved({ ...base, pretext: true })).not.toContain('honest')
  })
  it('save keeps the union and reports only first-time ones', () => {
    const s = new SaveStore(mem)
    expect(s.recordClear('m', 'B', 70, ['honest'])).toEqual(['honest'])
    expect(s.recordClear('m', 'C', 50, ['quick', 'honest'])).toEqual(['quick'])
    expect(s.mission('m').challenges).toEqual(['quick', 'honest'])
    expect(s.mission('m').best).toBe('B')
  })
})
