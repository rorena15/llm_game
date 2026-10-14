// SNS 프로필 (instargram): 프로필 머리, 하이라이트 동그라미와 스토리 보기, 게시물 격자
import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../../i18n'
import { T } from './common'
import { firstEmoji, sections, seeded, type SiteProps } from './parse'

const GRADIENTS = [
  'linear-gradient(135deg, #f6d365, #fda085)',
  'linear-gradient(135deg, #84fab0, #8fd3f4)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fccb90, #d57eeb)',
  'linear-gradient(135deg, #89f7fe, #66a6ff)',
  'linear-gradient(135deg, #fddb92, #d1fdff)',
]

export function InstaSite(p: SiteProps) {
  const t = useT().sites.insta
  const { parts } = sections(p.body)
  const intro = parts.find((s) => s.tag === null)?.lines ?? []
  const handleLine = intro.find((l) => l.trim().startsWith('@'))
  const handle = handleLine?.trim().slice(1) ?? p.path.split('/').pop() ?? p.host
  const bio = intro.filter((l) => l !== handleLine)

  const hlSec = parts.find((s) => s.tag?.includes('하이라이트'))
  const highlights = (hlSec?.title ?? '').split('·').map((h) => h.trim()).filter(Boolean)
  // 하이라이트 덩어리 안에서 하이라이트 이름으로 시작하는 줄 아래가 그 스토리
  const stories: Record<string, string[]> = {}
  let cur: string | null = null
  for (const l of hlSec?.lines ?? []) {
    if (highlights.includes(l.trim())) cur = l.trim()
    else if (cur) (stories[cur] ??= []).push(l)
  }
  const posts = parts.filter((s) => s.tag && s !== hlSec).flatMap((s) => s.lines)
  const others = parts.filter((s) => s.tag && s !== hlSec && !s.tag.includes('게시물'))

  const [open, setOpen] = useState<string | null>(null)
  const overlay = (node: ReactNode) => (p.layer ? createPortal(node, p.layer) : node)
  const [following, setFollowing] = useState(false)
  const avatar = firstEmoji(bio.join(' ')) ?? handle[0]?.toUpperCase()
  const followers = Math.round(180 + seeded(handle) * 900) + (following ? 1 : 0)
  const followingN = Math.round(120 + seeded(handle, 7) * 400)

  return (
    <article className="s-insta">
      <header className="ig-top">
        <span className="ig-logo">Instargram</span>
        <span className="ig-search">🔍 {t.search}</span>
        <span className="ig-icons">⌂ ✈ ♡</span>
      </header>

      <section className="ig-profile">
        <div className="ig-avatar ring">
          <span>{avatar}</span>
        </div>
        <div className="ig-info">
          <div className="ig-name">
            <b>{handle}</b>
            <button className={`ig-btn${following ? '' : ' primary'}`} onClick={() => setFollowing((f) => !f)}>
              {following ? t.followingBtn : t.follow}
            </button>
            <button className="ig-btn">{t.message}</button>
          </div>
          <ul className="ig-stats">
            <li>
              {t.posts} <b>{posts.length}</b>
            </li>
            <li>
              {t.followers} <b>{t.count(followers)}</b>
            </li>
            <li>
              {t.following} <b>{t.count(followingN)}</b>
            </li>
          </ul>
          <div className="ig-bio">
            {bio.map((l, i) => (
              <p key={i}>
                <T p={p} text={l} />
              </p>
            ))}
          </div>
        </div>
      </section>

      {highlights.length > 0 && (
        <section className="ig-highlights">
          {highlights.map((h, i) => (
            <div key={h} className="ig-hl">
              <button
                className="ig-avatar small"
                title={stories[h] ? t.viewStory : h}
                onClick={() => stories[h] && setOpen(h)}
                style={{ background: GRADIENTS[i % GRADIENTS.length] }}
              >
                <span>{firstEmoji(h) ?? h[0]}</span>
              </button>
              <small>
                <T p={p} text={h} />
              </small>
            </div>
          ))}
        </section>
      )}

      <div className="ig-tabs">
        <span className="on">▦ {t.tabPosts}</span>
        <span>▶ {t.reels}</span>
        <span>◫ {t.tagged}</span>
      </div>
      <section className="ig-grid">
        {posts.map((l, i) => {
          const tags = l.match(/#\S+/g) ?? []
          const caption = l.replace(/#\S+\s*/g, '').trim()
          return (
            <figure key={i} className="ig-post">
              <div className="ig-img" style={{ background: GRADIENTS[(i + 2) % GRADIENTS.length] }}>
                <span>{firstEmoji(l) ?? '📷'}</span>
                <i>♡ {Math.round(8 + seeded(l) * 90)}</i>
              </div>
              <figcaption>
                <b>{handle}</b> <T p={p} text={caption} />
                {tags.length > 0 && (
                  <span className="tags">
                    {' '}
                    <T p={p} text={tags.join(' ')} />
                  </span>
                )}
              </figcaption>
            </figure>
          )
        })}
      </section>
      {others.map((s, i) => (
        <section key={i} className="ig-extra">
          <b>{s.tag}</b>
          {s.lines.map((l, j) => (
            <p key={j}>
              <T p={p} text={l} />
            </p>
          ))}
        </section>
      ))}

      {open && overlay(
        <div className="ig-story" onClick={() => setOpen(null)}>
          <div className="ig-story-card" onClick={(e) => e.stopPropagation()}>
            <div className="ig-progress">
              <i />
            </div>
            <div className="ig-story-head">
              <span className="ig-avatar tiny">
                <span>{avatar}</span>
              </span>
              <b>{handle}</b>
              <small>
                <T p={p} text={open} />
              </small>
              <button onClick={() => setOpen(null)} aria-label={t.close}>
                ×
              </button>
            </div>
            <div className="ig-story-body">
              {stories[open].map((l, i) => (
                <p key={i}>
                  <T p={p} text={l} />
                </p>
              ))}
            </div>
          </div>
        </div>,
      )}
    </article>
  )
}
