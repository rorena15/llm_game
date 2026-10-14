import { describe, expect, it } from 'vitest'
import m1 from '../../scenarios/mission_1.json'
import type { Llm } from '../engine/llm'
import { applyVariant, pickVariant } from '../engine/scenario'
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

describe('grade and restart', () => {
  it('scores the run and keep-clues retry costs a grade', () => {
    const run = new MissionRun(sc, noLlm)
    expect(run.grade).toBe('S')
    for (let i = 0; i < 10; i++) run.tryLogin('wrong')
    expect(run.status).toBe('failed')
    run.retryKeepClues()
    expect(run.status).toBe('playing')
    expect(run.suspicion).toBe(0)
    // 실패 10회 -100, 이어서 다시 -15
    expect(run.score).toBe(0)
    expect(run.tryLogin('blue_sky_2024')).toBe(true)
    expect(run.grade).toBe('C')
  })

  it('a fresh start picks a different variant', () => {
    for (let i = 0; i < 20; i++) expect(pickVariant(spec, 'a').id).not.toBe('a')
  })
})

describe('every mission and variant can be solved on the board', () => {
  const all = Object.values(
    import.meta.glob<ScenarioSpec>('../../scenarios/*.json', { eager: true, import: 'default' }),
  )
  for (const s of all)
    for (const v of s.variants)
      it(`${s.id} ${v.id}`, () => {
        const sc = applyVariant(s, v)
        const run = new MissionRun(sc, noLlm)
        sc.clues.forEach((c) => run.collectClue(c.id))
        sc.facts.filter((f) => f.level !== 'secret').forEach((f) => run.collectFact(f))
        for (const inf of sc.inferences)
          for (let i = 0; i + 1 < inf.requires.length; i++) run.link(inf.requires[i], inf.requires[i + 1])
        expect(run.solved).toBe(true)
        expect(run.wrongLinks).toBe(0)
        expect(run.loginHints).not.toContain(sc.passwordValue)
        expect(run.tryLogin(sc.passwordValue)).toBe(true)
      })
})

describe('browser and mail state', () => {
  it('keeps history, drops forward pages on a new visit, and asks to open the browser', () => {
    const run = new MissionRun(sc, noLlm)
    run.navigate('https://WWW.corpx.com/')
    run.navigate('www.corpx.com/people')
    run.navigate('www.corpx.com/people')
    expect(run.browser).toEqual({ history: ['www.corpx.com', 'www.corpx.com/people'], index: 1 })
    run.goBack()
    run.navigate('www.corpx.com/about')
    expect(run.browser.history).toEqual(['www.corpx.com', 'www.corpx.com/about'])
    run.goForward()
    expect(run.browser.index).toBe(1)
    const before = run.browserRequest
    run.openUrl('www.corpx.com/notice')
    expect(run.browserRequest).toBe(before + 1)
    run.markRead(2)
    expect(run.readMails.has(2)).toBe(true)
  })
})

describe('dev panel shortcuts', () => {
  const all = Object.values(
    import.meta.glob<ScenarioSpec>('../../scenarios/*.json', { eager: true, import: 'default' }),
  )
  for (const s of all)
    it(`solves ${s.id} on every variant`, () => {
      for (const v of s.variants) {
        const run = new MissionRun(applyVariant(s, v), noLlm)
        run.devSolveBoard()
        expect(run.solved).toBe(true)
        expect(run.wrongLinks).toBe(0)
      }
    })

  it('sets suspicion, fails at 100, and clears from a failed run', () => {
    const run = new MissionRun(sc, noLlm)
    run.devSetSuspicion(80)
    expect(run.suspicion).toBe(80)
    expect(run.status).toBe('playing')
    run.devSetSuspicion(100)
    expect(run.status).toBe('failed')
    run.devClear()
    expect(run.status).toBe('cleared')
  })
})
