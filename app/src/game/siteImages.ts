// 사이트 사진 ({d.images}). src/assets/sites/<주소>/<이름>.webp 를 찾는다. 예: instargram.com/dev_jihyun/p1
// 그림은 SDXL로 직접 만든 것이다 (출처와 프롬프트는 art/README.md). 없는 그림은 각 틀이 그라데이션으로 대신한다
const files = import.meta.glob<string>('../assets/sites/**/*.webp', { eager: true, import: 'default', query: '?url' })

const BY_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.replace(/^.*\/assets\/sites\//, '').replace(/\.webp$/, ''), url]),
)

/** 페이지 주소(www. 없이)와 그림 이름으로 그림 주소. 없으면 null */
export function siteImage(page: string, name: string): string | null {
  return BY_KEY[`${page.replace(/^www\./, '')}/${name}`] ?? null
}
