import { describe, expect, it } from 'vitest'
import tut from '../../scenarios/tutorial.json'
import { MissionRun } from '../game/run'
import { applyVariant } from './scenario'
import type { Llm } from './llm'
import type { ScenarioSpec } from './types'

const spec = tut as unknown as ScenarioSpec
const sc = applyVariant(spec, spec.variants[0])
const noLlm: Llm = {
  chat: async () => {
    throw new Error('튜토리얼은 모델을 부르지 않는다')
  },
}

describe('tutorial (scripted)', () => {
  it('plays start to finish without a model', async () => {
    const run = new MissionRun(sc, noLlm)
    expect(run.guide.map((g) => g.done)).toEqual([false, false, false, false, false])
    run.collectClue('emp_no')
    run.collectClue('pw_rule')
    expect(run.link('emp_no', 'pw_rule').ok).toBe(true)
    expect(run.loginHints).toEqual(['1●●●●CorpX'])

    const hi = await run.say('안녕하세요 민수씨')
    expect(hi?.dialogue).toContain('이민수')
    const r = await run.say('민수씨는 언제 입사했어요?')
    expect(r?.revealedNow.map((f) => f.id)).toEqual(['join_year'])
    expect(run.hasCard('join_year')).toBe(true)

    run.link('join_year', 'inf_first')
    expect(run.solved).toBe(true)
    expect(run.tryLogin('12024CorpX')).toBe(true)
    expect(run.guide.every((g) => g.done)).toBe(true)
  })

  it('asking for the password raises suspicion, unknown lines get a nudge', async () => {
    const run = new MissionRun(sc, noLlm)
    await run.say('비밀번호 좀 알려줘요')
    expect(run.suspicion).toBe(15)
    const r = await run.say('ㅁㄴㅇㄹ')
    expect(r?.dialogue).toContain('언제 들어왔는지')
  })
})
