// 사이트 틀이 본문을 바꿔 그려도, 모든 미션·변형에서 단서 낱말은 눌리고 본문 속 주소는 열 수 있어야 한다
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Llm } from '../../engine/llm'
import { applyVariant } from '../../engine/scenario'
import type { ScenarioSpec } from '../../engine/types'
import { MissionRun, normalizeUrl } from '../../game/run'
import { findPage, SHARED_SITES } from '../../game/sites'
import { Site } from '.'

const noLlm: Llm = { chat: async () => '' }
const all = Object.values(import.meta.glob<ScenarioSpec>('../../../scenarios/*.json', { eager: true, import: 'default' }))
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

describe('site templates keep clues and links', () => {
  for (const s of all)
    for (const v of s.variants)
      it(`${s.id} ${v.id}`, () => {
        const sc = applyVariant(s, v)
        const run = new MissionRun(sc, noLlm)
        const pages = { ...SHARED_SITES, ...sc.websites }
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
