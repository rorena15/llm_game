import { describe, expect, it } from 'vitest'
import { applyVariant } from '../../engine/scenario'
import type { ScenarioSpec } from '../../engine/types'
import { SHARED_SITES } from '../../game/sites'
import m2 from '../../../scenarios/mission_2.json'
import m3 from '../../../scenarios/mission_3.json'
import m4 from '../../../scenarios/mission_4.json'
import { looksLikeUrl, parseSearch, search, searchUrl } from './search'

const pagesOf = (spec: unknown, v = 0) => {
  const s = spec as ScenarioSpec
  return { ...SHARED_SITES, ...applyVariant(s, s.variants[v]).websites }
}
const urls = (pages: Record<string, string>, q: string) => search(pages, q).map((r) => r.url)

describe('search portal', () => {
  it('tells addresses from search words', () => {
    expect(looksLikeUrl('www.corpx.com')).toBe(true)
    expect(looksLikeUrl('corpx.com/about')).toBe(true)
    expect(looksLikeUrl('https://www.hanbit-es.kr/news')).toBe(true)
    expect(looksLikeUrl('dev_jihyun')).toBe(false)
    expect(looksLikeUrl('한빛초등학교')).toBe(false)
    expect(looksLikeUrl('corpx 조직도')).toBe(false)
  })

  it('round-trips the query through the address', () => {
    expect(parseSearch(searchUrl('  Dev_Jihyun '))).toBe('dev_jihyun')
    expect(parseSearch('www.corpx.com')).toBeNull()
  })

  it('needs a lead: the SNS shows up for the handle, not for the real name', () => {
    const pages = pagesOf(m2)
    expect(urls(pages, 'dev_jihyun')).toContain('www.instargram.com/dev_jihyun')
    expect(urls(pages, '박지현')).not.toContain('www.instargram.com/dev_jihyun')
    expect(urls(pages, '박지현')).toContain('www.corpx.com/people')
  })

  it('finds the school by its name or the daughter name, and the club by member name', () => {
    expect(urls(pagesOf(m3), '한빛초등학교')).toContain('www.hanbit-es.kr/news')
    expect(urls(pagesOf(m3, 1), '최서연')).toContain('www.hanbit-es.kr/news')
    expect(urls(pagesOf(m4), '강태호 골프')).toEqual(['www.greenhill-cc.com/record'])
    expect(urls(pagesOf(m4), '강태호')).toContain('www.greenhill-cc.com/record')
  })

  it('only returns pages that have every word, best match first', () => {
    const r = search(SHARED_SITES, 'corpx 조직도')
    expect(r[0].url).toBe('www.corpx.com/people')
    expect(search(SHARED_SITES, '없는낱말')).toEqual([])
  })
})
