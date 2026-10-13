// 새 버전 알림 (§12). 자동 업데이트는 하지 않고, 시작할 때 최신 릴리스 번호만 확인한다. 실패하면 조용히 넘어간다
import { useEffect, useState } from 'react'

export const APP_VERSION = __APP_VERSION__
const LATEST_URL = 'https://api.github.com/repos/rorena15/llm_game/releases/latest'

/** "v1.2.0" > "1.1.9" 같은 비교. 숫자가 아닌 꼬리(-beta 등)는 무시한다 */
export function newer(latest: string, current: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split(/[.-]/).slice(0, 3).map((n) => parseInt(n, 10) || 0)
  const [a, b] = [parse(latest), parse(current)]
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i]
  return false
}

let cached: Promise<string | null> | null = null

function fetchLatest(): Promise<string | null> {
  cached ??= fetch(LATEST_URL, { signal: AbortSignal.timeout(5000) })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { tag_name?: string } | null) => d?.tag_name ?? null)
    .catch(() => null)
  return cached
}

/** 더 새 버전이 있으면 그 번호, 없거나 확인 못 하면 null */
export function useNewVersion(): string | null {
  const [v, setV] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    void fetchLatest().then((tag) => alive && tag && newer(tag, APP_VERSION) && setV(tag))
    return () => {
      alive = false
    }
  }, [])
  return v
}
