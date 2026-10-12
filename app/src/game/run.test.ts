import { describe, expect, it } from 'vitest'
import m1 from '../../scenarios/mission_1.json'
import type { Llm } from '../engine/llm'
import { applyVariant } from '../engine/scenario'
import type { ScenarioSpec } from '../engine/types'
import { MissionRun } from './run'

const spec = m1 as unknown as ScenarioSpec
const sc = applyVariant(spec, spec.variants[0])
const noLlm: Llm = { chat: async () => '' }
const fact = (id: string) => sc.facts.find((f) => f.id === id)!

describe('board', () => {
  it('only links materials of the same inference, and counts wrong links', () => {
    const run = new MissionRun(sc, noLlm)
    run.collectClue('wife_mail')
    run.collectClue('policy')
    expect(run.link('wife_mail', 'policy')).toEqual({ ok: false, reason: 'wrong' })
    expect(run.wrongLinks).toBe(1)
    expect(run.link('wife_mail', 'wife_mail')).toEqual({ ok: false, reason: 'self' })
  })

  it('makes inferences, unlocks hints, and chains to the final one', () => {
    const run = new MissionRun(sc, noLlm)
    for (const id of ['wife_mail', 'memo', 'policy']) run.collectClue(id)
    const r1 = run.link('wife_mail', 'memo')
    expect(r1.ok && r1.made.map((i) => i.id)).toEqual(['inf_memory'])
    expect(run.loginHints).toEqual(['●●●●_●●●_2024'])
    expect(run.solved).toBe(false)

    run.collectFact(fact('first_meet'))
    run.link('first_meet', 'inf_memory')
    const r2 = run.link('policy', 'first_meet')
    expect(r2.ok && r2.made.map((i) => i.id)).toEqual(['inf_final'])
    expect(run.solved).toBe(true)
    expect(run.loginHints).toEqual(['●●●●_●●●_2024', 'b●●●_s●●_2024'])
    expect(run.link('memo', 'wife_mail')).toEqual({ ok: false, reason: 'dup' })
  })

  it('passes owned leverage inferences into the conversation judge', async () => {
    const seen: string[] = []
    const llm: Llm = {
      chat: async (msgs, opts) => {
        if (opts?.json) seen.push(msgs[0].content)
        return opts?.json ? '{"tactic":"chat","topic":null,"meta":false,"fit":1,"leverage":null}' : '음, 그런가.'
      },
    }
    const run = new MissionRun(sc, llm)
    run.collectClue('wife_mail')
    run.collectClue('memo')
    run.link('wife_mail', 'memo')
    await run.say('부장님 안녕하세요')
    expect(seen[0]).toContain('inf_memory')
  })

  it('login failures raise suspicion and clearing works', () => {
    const run = new MissionRun(sc, noLlm)
    expect(run.tryLogin('wrong')).toBe(false)
    expect(run.suspicion).toBe(10)
    expect(run.tryLogin('blue_sky_2024')).toBe(true)
    expect(run.status).toBe('cleared')
  })
})
