// 진행 저장 (§12): 클리어 기록, 최고 등급, 미션별 지금 변형, 설정.
// 데스크톱 앱에서는 앱 데이터 폴더의 save.json, 브라우저 실행에서는 localStorage
import { invoke, isTauri } from '@tauri-apps/api/core'
import { useSyncExternalStore } from 'react'
import { better, type Grade } from './grade'

export interface MissionRecord {
  cleared: boolean
  best?: Grade
  bestScore?: number
  /** 지금 진행 중인(마지막으로 시작한) 변형. 다음에 새로 시작할 때 이것과 다른 변형을 고른다 */
  variant?: string
}

/** 설정 화면({pack})이 채운다 */
export type Settings = Record<string, string | number | boolean>

export interface SaveData {
  version: 1
  missions: Record<string, MissionRecord>
  settings: Settings
}

export interface SaveBackend {
  load(): Promise<string | null>
  write(text: string): Promise<void>
}

const KEY = 'social-engineer.save'

export const tauriBackend: SaveBackend = {
  load: () => invoke<string | null>('load_save'),
  write: (data) => invoke('write_save', { data }),
}

export const localBackend: SaveBackend = {
  load: async () => {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return null
    }
  },
  write: async (text) => {
    try {
      localStorage.setItem(KEY, text)
    } catch {
      /* 저장소를 못 쓰는 환경이면 이번 실행 동안만 기억한다 */
    }
  },
}

export const emptySave = (): SaveData => ({ version: 1, missions: {}, settings: {} })

export function parseSave(text: string | null): SaveData {
  if (!text) return emptySave()
  try {
    const d = JSON.parse(text) as Partial<SaveData>
    if (d.version !== 1 || typeof d.missions !== 'object' || !d.missions) return emptySave()
    return { version: 1, missions: d.missions, settings: d.settings ?? {} }
  } catch {
    return emptySave()
  }
}

export class SaveStore {
  data: SaveData = emptySave()
  private backend: SaveBackend
  private version = 0
  private listeners = new Set<() => void>()
  private writing: Promise<void> = Promise.resolve()

  constructor(backend: SaveBackend) {
    this.backend = backend
  }

  async load() {
    try {
      this.data = parseSave(await this.backend.load())
    } catch (e) {
      console.error('저장 파일을 읽지 못했습니다', e)
    }
    this.emit()
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  getVersion = () => this.version
  private emit() {
    this.version++
    this.listeners.forEach((f) => f())
  }

  mission(id: string): MissionRecord {
    return this.data.missions[id] ?? { cleared: false }
  }

  private update(id: string, patch: Partial<MissionRecord>) {
    this.data = { ...this.data, missions: { ...this.data.missions, [id]: { ...this.mission(id), ...patch } } }
    this.persist()
  }

  private persist() {
    this.emit()
    // 쓰기는 차례대로. 앞 쓰기가 끝나기 전에 뒤 쓰기가 덮어쓰지 않게
    const text = JSON.stringify(this.data, null, 2)
    this.writing = this.writing.then(() => this.backend.write(text)).catch((e) => console.error('저장 실패', e))
  }

  setSetting(key: string, value: string | number | boolean) {
    this.data = { ...this.data, settings: { ...this.data.settings, [key]: value } }
    this.persist()
  }

  /** 미션을 새로 시작할 때 고른 변형 */
  startVariant(id: string, variant: string) {
    this.update(id, { variant })
  }

  /** 클리어 기록. 더 좋은 등급일 때만 최고 기록을 바꾼다. 다음 판은 다른 변형이 되도록 지금 변형은 그대로 둔다 */
  recordClear(id: string, grade: Grade, points: number) {
    const m = this.mission(id)
    const patch: Partial<MissionRecord> = { cleared: true }
    if (better(grade, m.best) || (grade === m.best && points > (m.bestScore ?? -1))) {
      patch.best = grade
      patch.bestScore = points
    }
    this.update(id, patch)
  }

  /** 개발자 패널: 주어진 미션을 모두 S로 클리어한 기록 */
  devClearAll(ids: string[]) {
    const missions = { ...this.data.missions }
    for (const id of ids) missions[id] = { ...this.mission(id), cleared: true, best: 'S', bestScore: 100 }
    this.data = { ...this.data, missions }
    this.persist()
  }

  /** 개발자 패널: 클리어 기록만 지운다 (설정은 남긴다) */
  devResetProgress() {
    this.data = { ...this.data, missions: {} }
    this.persist()
  }

  /** 쓰기가 다 끝날 때까지 (테스트용) */
  flush() {
    return this.writing
  }
}

export const save = new SaveStore(isTauri() ? tauriBackend : localBackend)

export function useSave(store: SaveStore = save) {
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion)
  return store
}
