// 뉴스 사이트 (비즈데일리, 테크나우): 제호·분야 메뉴, 첫 화면(헤드라인·분야별 기사·많이 본 뉴스), 기사(분류·기자·입력, 본문, 관련 기사)
import { siteImage } from '../../game/siteImages'
import { useT } from '../../i18n'
import { Go, T } from './common'
import { brand, NAV_LINE, sections, seeded, type Section, type SiteProps } from './parse'

interface Link {
  label: string
  url: string
}

const links = (s: Section | undefined): Link[] =>
  (s?.lines ?? [])
    .map((l) => l.trim().match(NAV_LINE))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ label: m[1].trim(), url: m[2] }))

/** "분류: 경제" 꼴 */
const KV = /^([^:：]{1,12})[:：]\s*(.+)$/

/** 사진 자리: 기사 사진이 있으면 그것, 없으면 제목으로 정한 색 */
const thumb = (seed: string, url?: string) => {
  const src = url && siteImage(url, 'photo')
  return src ? { backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' } : gradient(seed)
}
const gradient = (seed: string) => ({
  background: `linear-gradient(${Math.round(seeded(seed) * 180)}deg, hsl(${Math.round(seeded(seed, 1) * 360)} 35% 45%), hsl(${Math.round(seeded(seed, 2) * 360)} 30% 25%))`,
})

export function NewsSite(p: SiteProps) {
  const t = useT().sites.news
  const mk = useT().sites.marks
  const home = `www.${p.host}`
  const homeDoc = sections(p.find(home) ?? '')
  const [name, tagline] = [homeDoc.head, homeDoc.parts.find((s) => s.tag === null)?.lines[0]?.trim() ?? '']
  const cats = homeDoc.parts.filter((s) => s.tag && s.tag !== mk.headline && s.tag !== mk.mostRead)
  const mostRead = links(homeDoc.parts.find((s) => s.tag === mk.mostRead))
  const isHome = p.path === ''
  const { head, parts } = sections(p.body)

  // 기사: 첫 덩어리의 "키: 값" 줄은 정보, 나머지는 문단
  const article = parts.find((s) => s.tag !== null && s.tag !== mk.related)
  const info: Record<string, string> = {}
  const paras: string[] = []
  for (const l of article?.lines ?? []) {
    const m = l.trim().match(KV)
    if (m && !paras.length) info[m[1].trim()] = m[2]
    else paras.push(l.trim())
  }
  const [catLabel, byline, published] = Object.values(info)
  const related = links(parts.find((s) => s.tag === mk.related))

  return (
    <article className={`s-news${isHome ? ' home' : ''}`} style={{ ['--n-main' as string]: brand(p.host) }}>
      <div className="news-util">
        <span>{t.date}</span>
        <span>
          {t.login} · {t.subscribe}
        </span>
      </div>
      <header className="news-mast">
        <Go p={p} url={home} className="news-logo">
          {name}
        </Go>
        {isHome && tagline && <small>{tagline}</small>}
      </header>
      <nav className="news-nav">
        <Go p={p} url={home} className={isHome ? 'on' : ''}>
          {t.all}
        </Go>
        {cats.map((c) => (
          <span key={c.tag} className={catLabel === c.tag ? 'on' : ''}>
            {c.tag}
          </span>
        ))}
      </nav>

      <div className="news-wrap">
        <main>
          {isHome ? (
            parts.map((s, i) => {
              if (s.tag === null || s.tag === mk.mostRead) return null
              const ls = links(s)
              if (s.tag === mk.headline)
                return (
                  <section key={i} className="news-headline">
                    {ls.map((l) => (
                      <Go key={l.url} p={p} url={l.url} className="news-lead">
                        <span className="pic" style={thumb(l.label, l.url)} />
                        <b>{l.label}</b>
                      </Go>
                    ))}
                  </section>
                )
              return (
                <section key={i} className="news-cat">
                  <h2>{s.tag}</h2>
                  {ls.map((l, j) => (
                    <Go key={l.url} p={p} url={l.url} className={j === 0 ? 'first' : ''}>
                      {j === 0 && <span className="pic" style={thumb(l.label, l.url)} />}
                      {l.label}
                    </Go>
                  ))}
                </section>
              )
            })
          ) : (
            <>
              {catLabel && <span className="news-kicker">{catLabel}</span>}
              <h1>
                <T p={p} text={head} />
              </h1>
              <div className="news-byline">
                {byline && <span>{byline}</span>}
                {published && (
                  <time>
                    {t.published} {published}
                  </time>
                )}
                <span className="tools">
                  {t.fontSize} · {t.share}
                </span>
              </div>
              <span className="pic news-photo" style={thumb(head, p.pageKey)} />
              <div className="news-text">
                {paras.map((x, i) => (
                  <p key={i}>
                    <T p={p} text={x} />
                  </p>
                ))}
              </div>
              <p className="news-copy">{t.rights(name)}</p>
              {related.length > 0 && (
                <section className="news-related">
                  <h2>{mk.related}</h2>
                  {related.map((l) => (
                    <Go key={l.url} p={p} url={l.url}>
                      {l.label}
                    </Go>
                  ))}
                </section>
              )}
            </>
          )}
        </main>
        <aside>
          <h2>{mk.mostRead}</h2>
          <ol>
            {mostRead.map((l) => (
              <li key={l.url}>
                <Go p={p} url={l.url}>
                  {l.label}
                </Go>
              </li>
            ))}
          </ol>
          <div className="news-ad">
            <small>{t.ad}</small>
            <b>{t.adText}</b>
          </div>
        </aside>
      </div>
      <footer className="news-foot">
        <b>{name}</b>
        <small>{t.footer(name, p.host)}</small>
      </footer>
    </article>
  )
}
