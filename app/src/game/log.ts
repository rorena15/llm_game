// 오류 기록 ({robust}). 데스크톱 앱은 앱 로그 폴더의 game.log, 브라우저 실행은 콘솔에만
import { invoke, isTauri } from '@tauri-apps/api/core'

export function logError(where: string, err: unknown) {
  const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err)
  const line = `${new Date().toISOString()} [${where}] ${msg}`.trim()
  console.error(line)
  if (isTauri()) invoke('append_log', { line }).catch(() => {})
}

/** 잡히지 않은 오류도 남긴다 */
export function installErrorLog() {
  window.addEventListener('error', (e) => logError('window', e.error ?? e.message))
  window.addEventListener('unhandledrejection', (e) => logError('promise', e.reason))
}
