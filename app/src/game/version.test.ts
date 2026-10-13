import { describe, expect, it } from 'vitest'
import { newer } from './version'

describe('new version check', () => {
  it('compares release tags with the app version', () => {
    expect(newer('v0.2.0', '0.1.0')).toBe(true)
    expect(newer('v0.1.0', '0.1.0')).toBe(false)
    expect(newer('0.1.10', '0.1.9')).toBe(true)
    expect(newer('v1.0.0-beta', '1.0.0')).toBe(false)
    expect(newer('v0.0.9', '0.1.0')).toBe(false)
  })
})
