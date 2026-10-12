import type { Scenario, ScenarioSpec, VariantSpec } from './types'

const SLOT = /\{\{(\w+)\}\}/g

export function fill(text: string, values: Record<string, string>): string {
  return text.replace(SLOT, (m, key: string) => (key in values ? values[key] : m))
}

function fillDeep<T>(value: T, values: Record<string, string>): T {
  if (typeof value === 'string') return fill(value, values) as T
  if (Array.isArray(value)) return value.map((v) => fillDeep(v, values)) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[fill(k, values)] = fillDeep(v, values)
    return out as T
  }
  return value
}

/** 이전 변형과 다른 것을 고른다 (변형이 하나뿐이면 그것) */
export function pickVariant(spec: ScenarioSpec, previous?: string, rand = Math.random): VariantSpec {
  const pool = spec.variants.length > 1 ? spec.variants.filter((v) => v.id !== previous) : spec.variants
  return pool[Math.floor(rand() * pool.length)]
}

export function applyVariant(spec: ScenarioSpec, variant: VariantSpec): Scenario {
  const rest: Omit<ScenarioSpec, 'variants'> & { variants?: unknown } = { ...spec }
  delete rest.variants
  const filled = fillDeep(rest, variant.values)
  return { ...filled, variantId: variant.id, passwordValue: variant.password }
}

/** 채워지지 않은 자리 표시 목록 (검증용) */
export function unfilledSlots(s: Scenario): string[] {
  const found = new Set<string>()
  const walk = (v: unknown) => {
    if (typeof v === 'string') for (const m of v.matchAll(SLOT)) found.add(m[1])
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => (walk(k), walk(x)))
  }
  walk(s)
  return [...found]
}
