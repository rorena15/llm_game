// 사이트 틀이 본문을 바꿔 그려도, 모든 미션·변형에서 단서 낱말은 눌리고 본문 속 주소는 열 수 있어야 한다.
// 언어마다 돈다: 틀이 찾는 표시 낱말(i18n sites.marks)은 그 언어의 내용과 맞아야 한다
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Llm } from '../../engine/llm'
import { applyVariant } from '../../engine/scenario'
import type { Lang, ScenarioSpec } from '../../engine/types'
import { MissionRun, normalizeUrl } from '../../game/run'
import { save } from '../../game/save'
import { findPage } from '../../game/sites'
import koShared from '../../../story/sites.json'
import enShared from '../../../story/en/sites.json'
import { Site } from '.'

const noLlm: Llm = { chat: async () => '' }
const CONTENT: { lang: Lang; all: ScenarioSpec[]; shared: Record<string, string> }[] = [
  {
    lang: 'ko',
    all: Object.values(import.meta.glob<ScenarioSpec>('../../../scenarios/*.json', { eager: true, import: 'default' })),
    shared: koShared,
  },
  {
    lang: 'en',
    all: Object.values(import.meta.glob<ScenarioSpec>('../../../scenarios/en/*.json', { eager: true, import: 'default' })),
    shared: enShared,
  },
]
const useLang = (lang: Lang) => {
  save.data = { ...save.data, settings: { ...save.data.settings, lang } }
}
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')

for (const { lang, all, shared } of CONTENT)
describe(`site templates keep clues and links (${lang})`, () => {
  for (const s of all)
    for (const v of s.variants)
      it(`${s.id} ${v.id}`, () => {
        useLang(lang)
        const sc = applyVariant(s, v)
        const run = new MissionRun(sc, noLlm)
        const pages = { ...shared, ...sc.websites }
        for (const [key, body] of Object.entries(pages)) {
          const k = normalizeUrl(key)
          const clues = sc.clues.filter((c) => normalizeUrl(c.source.replace(/^web:/, '')) === k)
          const html = renderToStaticMarkup(
            <Site
              pageKey={k}
              host={k.split('/')[0].replace(/^www\./, '')}
              path={k.split('/').slice(1).join('/')}
              body={body}
              clues={clues}
              run={run}
              go={() => {}}
              find={(u) => findPage(sc.websites, u)?.body ?? null}
            />,
          )
          for (const c of clues.filter((c) => c.keyword))
            expect(html, `${key} 단서 ${c.id}`).toMatch(new RegExp(`class="clue-word[^"]*"[^>]*>${escRe(esc(c.keyword!))}</button>`))
          for (const m of body.matchAll(/www\.[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[\w\-./]*)?/gi)) {
            const u = m[0].replace(/[.,)]+$/, '')
            expect(html.includes(`data-url="${u}"`) || html.includes(`>${u}</button>`), `${key} 주소 ${u}`).toBe(true)
          }
        }
      })
})

function escRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 회사 홈페이지는 모든 미션에 같이 보인다. 어느 변형의 정답 조각도 들어 있으면 안 된다
for (const { lang, all, shared } of CONTENT)
describe(`shared site does not leak variant values (${lang})`, () => {
  const text = Object.values(shared).join('\n').toLowerCase()
  const isYear = (v: string) => /^\d{4}$/.test(v) && Number(v) >= 1990 && Number(v) <= 2030
  // 영어판 변형의 날짜 읽기용 달 이름(bday_m 등)은 그것만으로는 정답 조각이 아니다
  const isMonth = (v: string) => /^(january|february|march|april|may|june|july|august|september|october|november|december)$/i.test(v)
  for (const s of all)
    it(s.id, () => {
      for (const v of s.variants)
        for (const [k, value] of Object.entries({ ...v.values, password: v.password })) {
          const digits = /^\d+$/.test(value)
          if (value.includes('●') || isMonth(value) || (digits ? value.length < 4 || isYear(value) : value.length < 2)) continue
          expect(text.includes(value.toLowerCase()), `${v.id}.${k} = ${value}`).toBe(false)
        }
    })
})
