import { describe, expect, it } from 'vitest'
import { gradeOf, score } from './grade'
import { parseSave, SaveStore, type SaveBackend } from './save'

function memBackend(initial: string | null = null) {
  const b = { text: initial, writes: 0 }
  const backend: SaveBackend = {
    load: async () => b.text,
    write: async (t) => {
      b.text = t
      b.writes++
    },
  }
  return { b, backend }
}

describe('grade', () => {
  it('follows the §6.5 formula and floors', () => {
    expect(score({ maxSuspicion: 0, loginFails: 0, wrongLinks: 0, retries: 0 })).toBe(100)
    expect(score({ maxSuspicion: 50, loginFails: 1, wrongLinks: 2, retries: 0 })).toBe(66)
    expect(score({ maxSuspicion: 100, loginFails: 9, wrongLinks: 9, retries: 3 })).toBe(0)
    expect([95, 90, 89, 75, 74, 60, 59].map(gradeOf)).toEqual(['S', 'S', 'A', 'A', 'B', 'B', 'C'])
  })

  it('one keep-clues retry drops about one grade', () => {
    const base = { maxSuspicion: 10, loginFails: 0, wrongLinks: 0 }
    expect(gradeOf(score({ ...base, retries: 0 }))).toBe('S')
    expect(gradeOf(score({ ...base, retries: 1 }))).toBe('A')
  })
})

describe('save', () => {
  it('starts empty on missing or broken data', () => {
    expect(parseSave(null).missions).toEqual({})
    expect(parseSave('{oops').missions).toEqual({})
    expect(parseSave('{"version":9,"missions":{}}').missions).toEqual({})
  })

  it('keeps only the best grade and remembers the variant', async () => {
    const { b, backend } = memBackend()
    const s = new SaveStore(backend)
    await s.load()
    s.startVariant('mission_1', 'b')
    s.recordClear('mission_1', 'B', 65)
    s.recordClear('mission_1', 'C', 40)
    s.recordClear('mission_1', 'B', 70)
    await s.flush()
    const again = new SaveStore(backend)
    await again.load()
    expect(again.mission('mission_1')).toEqual({ cleared: true, best: 'B', bestScore: 70, variant: 'b' })
    expect(again.mission('mission_2')).toEqual({ cleared: false })
    expect(b.writes).toBe(4)
  })
})
