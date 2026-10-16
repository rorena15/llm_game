// 대화 모델 실행기 ({pack}, 설계안 §12). 배포본(데스크톱)은 함께 든 llama-server를 띄우고,
// 개발 빌드와 브라우저 실행은 Ollama(VITE_LLM_URL)를 쓴다. 개발 빌드에서도 VITE_SIDECAR=1이면 llama-server로.
import { invoke, isTauri } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useSyncExternalStore } from 'react'
import { checkHealth } from './health'
import { logError } from './log'
import { llm } from './scenarios'

export const SIDECAR = isTauri() && (!import.meta.env.DEV || import.meta.env.VITE_SIDECAR === '1')

/** 고품질 모델을 권하는 VRAM (설계안 §11) */
export const VRAM_FOR_8B_MIB = 6 * 1024
const START_TIMEOUT_MS = 120_000

export interface ModelInfo {
  id: string
  size: number
  have: number
  ready: boolean
}
export interface Gpu {
  name: string
  total_mib: number
  free_mib: number
}
export interface Progress {
  id: string
  done: number
  total: number
  phase: 'download' | 'verify'
}
/** off 아직 안 띄움 · starting 띄우는 중 · gpu/cpu 준비됨 · failed 띄우지 못함 */
export type ServerState = 'off' | 'starting' | 'gpu' | 'cpu' | 'failed'

interface RuntimeState {
  models: ModelInfo[]
  /** null이면 아직 모름 */
  gpus: Gpu[] | null
  progress: Progress | null
  /** 받다가 난 오류 (취소는 오류가 아니다) */
  error: string | null
  server: ServerState
}

let state: RuntimeState = { models: [], gpus: null, progress: null, error: null, server: 'off' }
const listeners = new Set<() => void>()
const set = (patch: Partial<RuntimeState>) => {
  state = { ...state, ...patch }
  listeners.forEach((f) => f())
}

export const runtime = () => state

export function useRuntime(): RuntimeState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => state,
  )
}

export const modelInfo = (id: string) => state.models.find((m) => m.id === id)
export const isReady = (id: string) => !SIDECAR || !!modelInfo(id)?.ready

/** VRAM이 넉넉하면 8B, 아니면 2.1B */
export function recommended(): string {
  const vram = Math.max(0, ...(state.gpus ?? []).map((g) => g.total_mib))
  return vram >= VRAM_FOR_8B_MIB ? 'se-kanana-8b' : 'se-kanana-2.1b'
}

/** 고른 모델이 이 PC에 무거울 때 ({robust}). cpu: CPU로 도는 중 · vram: 그래픽카드 메모리가 모자람 (gb는 가장 큰 VRAM) */
export function specWarning(
  model: string,
  rt: Pick<RuntimeState, 'gpus' | 'server'> = state,
): { kind: 'cpu' } | { kind: 'vram'; gb: string } | null {
  if (model !== 'se-kanana-8b') return null
  if (rt.server === 'cpu') return { kind: 'cpu' }
  if (!rt.gpus) return null
  const vram = Math.max(0, ...rt.gpus.map((g) => g.total_mib))
  return vram < VRAM_FOR_8B_MIB ? { kind: 'vram', gb: (vram / 1024).toFixed(1) } : null
}

async function refreshModels() {
  set({ models: await invoke<ModelInfo[]>('model_status') })
}

/** 시작할 때 한 번: 받은 모델과 GPU를 확인하고, 지금 모델이 있으면 서버를 띄운다 */
export async function initRuntime(model: string) {
  if (!SIDECAR) return
  try {
    await refreshModels()
    void invoke<Gpu[]>('gpu_info')
      .then((gpus) => set({ gpus }))
      .catch(() => set({ gpus: [] }))
    if (isReady(model)) await startServer(model)
    else void checkHealth()
  } catch (e) {
    logError('runtime init', e)
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** 띄운 서버가 응답할 때까지 기다린다. 프로세스가 죽거나 시간이 지나면 false */
async function waitUp(): Promise<boolean> {
  const t0 = Date.now()
  while (Date.now() - t0 < START_TIMEOUT_MS) {
    if ((await llm.ping(2000)) === 'ok') return true
    if (!(await invoke<boolean>('server_alive'))) return false
    await sleep(1000)
  }
  return false
}

let starting: Promise<void> | null = null

/** 모델 서버를 (다시) 띄운다. GPU(Vulkan)로 먼저, 안 되면 CPU로 */
export function startServer(model: string): Promise<void> {
  const job = (async () => {
    set({ server: 'starting' })
    void checkHealth()
    llm.setModel(model)
    for (const cpu of [false, true]) {
      try {
        const { port, key } = await invoke<{ port: number; key: string }>('start_server', { id: model, cpu })
        llm.setServer(`http://127.0.0.1:${port}`, key)
        if (await waitUp()) {
          set({ server: cpu ? 'cpu' : 'gpu' })
          return
        }
        logError('llama-server', `${cpu ? 'cpu' : 'gpu'} 시작 실패 (llama-server.log 참고)`)
      } catch (e) {
        logError('llama-server', e)
      }
    }
    set({ server: 'failed' })
  })().finally(() => {
    if (starting === job) starting = null
    void checkHealth()
  })
  starting = job
  return job
}

/** 설정에서 모델을 바꿨을 때 */
export async function switchModel(model: string) {
  if (!SIDECAR) return
  if (isReady(model)) await startServer(model)
  else void checkHealth()
}

/** 모델을 받는다. 다 받으면 지금 고른 모델일 때 서버를 띄운다 */
export async function download(id: string, current: () => string) {
  if (!SIDECAR || state.progress) return
  set({ error: null, progress: { id, done: modelInfo(id)?.have ?? 0, total: modelInfo(id)?.size ?? 0, phase: 'download' } })
  const unlisten = await listen<Progress>('model-progress', (e) => set({ progress: e.payload }))
  try {
    await invoke('download_model', { id })
    await refreshModels()
    if (id === current()) void startServer(id)
  } catch (e) {
    const msg = String(e)
    if (msg !== 'cancelled') {
      logError(`model download ${id}`, msg)
      set({ error: msg })
    }
    await refreshModels().catch(() => {})
  } finally {
    unlisten()
    set({ progress: null })
  }
}

export function cancelDownload() {
  void invoke('cancel_download')
}
