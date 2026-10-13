import { describe, expect, it } from 'vitest'
import { SCENARIOS } from './scenarios'
import { ENDING } from './story'

describe('ending data', () => {
  it('follows an existing mission and every branch ends', () => {
    expect(SCENARIOS[ENDING.afterMission]).toBeDefined()
    expect(ENDING.reveal.length).toBeGreaterThan(0)
    expect(ENDING.choices.length).toBeGreaterThanOrEqual(2)
    for (const c of ENDING.choices) expect(c.epilogue.length).toBeGreaterThan(0)
    expect(new Set(ENDING.choices.map((c) => c.id)).size).toBe(ENDING.choices.length)
  })
})
