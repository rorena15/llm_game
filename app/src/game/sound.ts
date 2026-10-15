// 소리 (§10, {sound}). 출처를 확인할 수 없는 옛 효과음 대신 Web Audio로 직접 합성한다.
// 브라우저는 사용자가 한 번 누르기 전에는 소리를 막으므로, 첫 클릭·키 입력 때 AudioContext를 깨운다
import { save } from './save'

export type Sfx = 'key' | 'notice' | 'clue' | 'inference' | 'error' | 'granted' | 'alarm' | 'slip' | 'link' | 'stamp'

/** 볼륨 종류. 전체가 나머지 셋에 곱해진다 */
export type VolumeKind = 'master' | 'bgm' | 'sfx' | 'key'
export const VOLUMES: { id: VolumeKind; fallback: number }[] = [
  { id: 'master', fallback: 80 },
  { id: 'bgm', fallback: 70 },
  { id: 'sfx', fallback: 80 },
  { id: 'key', fallback: 60 },
]

/** 볼륨 100일 때 실제 크기 */
const SCALE: Record<VolumeKind, number> = { master: 0.6, bgm: 1, sfx: 1, key: 1 }
const BGM_GAIN = 0.05

let ctx: AudioContext | null = null
let buses: Record<VolumeKind, GainNode> | null = null
let bgm: { stop: () => void } | null = null
let wantBgm = false

/** 음소거 (작업 표시줄 단추). 볼륨 값은 그대로 둔다 */
export const soundOn = () => save.data.settings.sound !== false

/** 0~100 */
export function volume(kind: VolumeKind): number {
  const v = save.data.settings[`vol_${kind}`]
  return typeof v === 'number' ? v : VOLUMES.find((x) => x.id === kind)!.fallback
}

const gainOf = (kind: VolumeKind) => (kind === 'master' && !soundOn() ? 0 : (volume(kind) / 100) * SCALE[kind])

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  if (!ctx) {
    ctx = new AudioContext()
    const c = ctx
    const make = (kind: VolumeKind) => {
      const g = c.createGain()
      g.gain.value = gainOf(kind)
      return g
    }
    buses = { master: make('master'), bgm: make('bgm'), sfx: make('sfx'), key: make('key') }
    buses.master.connect(c.destination)
    ;[buses.bgm, buses.sfx, buses.key].forEach((b) => b.connect(buses!.master))
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function applyGain(kind: VolumeKind) {
  if (buses && ctx) buses[kind].gain.setTargetAtTime(gainOf(kind), ctx.currentTime, 0.05)
}

/** 첫 사용자 입력에 AudioContext를 깨우고, 기다리던 배경음을 튼다 */
export function unlockAudio() {
  const once = () => {
    audio()
    if (wantBgm) startBgm()
    window.removeEventListener('pointerdown', once)
    window.removeEventListener('keydown', once)
  }
  window.addEventListener('pointerdown', once)
  window.addEventListener('keydown', once)
}

export function setSoundOn(on: boolean) {
  save.setSetting('sound', on)
  applyGain('master')
}

export function setVolume(kind: VolumeKind, v: number) {
  save.setSetting(`vol_${kind}`, Math.max(0, Math.min(100, Math.round(v))))
  applyGain(kind)
}

/** 짧은 음 하나: 주파수, 시작(초), 길이(초), 파형, 크기 */
function tone(c: AudioContext, freq: number, at: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
  const out = buses!.sfx
  const o = c.createOscillator()
  const g = c.createGain()
  const t = c.currentTime + at
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + dur + 0.02)
}

/** 걸러 낸 잡음 한 토막 (키보드 딸깍). 효과음으로 쓸 때는 out을 준다 */
function tick(c: AudioContext, vol: number, out?: GainNode) {
  const len = Math.floor(c.sampleRate * 0.025)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3
  const src = c.createBufferSource()
  const f = c.createBiquadFilter()
  const g = c.createGain()
  src.buffer = buf
  f.type = 'bandpass'
  f.frequency.value = 2500 + Math.random() * 1500
  g.gain.value = vol
  src.connect(f).connect(g).connect(out ?? buses!.key)
  src.start()
}

export function play(s: Sfx) {
  if (!soundOn()) return
  const c = audio()
  if (!c || !buses || c.state !== 'running') return
  if (s !== 'key' && volume('sfx') === 0) return
  switch (s) {
    case 'key':
      return tick(c, 0.35)
    case 'notice':
      tone(c, 660, 0, 0.12, 'sine', 0.18)
      return tone(c, 880, 0.09, 0.18, 'sine', 0.15)
    case 'clue':
      tone(c, 520, 0, 0.1, 'triangle', 0.2)
      return tone(c, 780, 0.07, 0.2, 'triangle', 0.18)
    case 'inference':
      ;[523, 659, 784].forEach((f, i) => tone(c, f, i * 0.08, 0.25, 'triangle', 0.16))
      return
    case 'error':
      tone(c, 180, 0, 0.18, 'square', 0.12, 120)
      return tone(c, 140, 0.16, 0.22, 'square', 0.1, 90)
    case 'granted':
      ;[392, 523, 659, 784].forEach((f, i) => tone(c, f, i * 0.1, 0.35, 'sine', 0.18))
      return
    case 'alarm':
      for (let i = 0; i < 3; i++) tone(c, 880, i * 0.32, 0.22, 'sawtooth', 0.08, 620)
      return
    case 'slip':
      // NPC가 비밀을 흘린 순간: 낮게 떨어졌다가 밝게 올라가는 두 음
      tone(c, 330, 0, 0.14, 'sine', 0.16, 247)
      tone(c, 740, 0.12, 0.28, 'triangle', 0.2)
      return tone(c, 1109, 0.2, 0.36, 'sine', 0.12)
    case 'link':
      // 보드 카드가 맞물리는 딸깍
      tick(c, 0.9, buses.sfx)
      return tone(c, 1320, 0, 0.05, 'square', 0.05)
    case 'stamp':
      // 등급이 찍히는 쿵
      tone(c, 110, 0, 0.3, 'sine', 0.35, 55)
      return tick(c, 0.6, buses.sfx)
  }
}

let heartbeat: ReturnType<typeof setInterval> | null = null

/** 경계가 높을 때 깔리는 심장 소리. bpm이 0이면 멈춘다 */
export function setHeartbeat(bpm: number) {
  if (heartbeat) clearInterval(heartbeat)
  heartbeat = null
  if (bpm <= 0) return
  const beat = () => {
    if (!soundOn()) return
    const c = audio()
    if (!c || !buses || c.state !== 'running' || volume('sfx') === 0) return
    tone(c, 62, 0, 0.16, 'sine', 0.3, 45)
    tone(c, 58, 0.2, 0.2, 'sine', 0.22, 42)
  }
  beat()
  heartbeat = setInterval(beat, 60000 / bpm)
}

/** 낮게 깔리는 배경음: 어긋난 두 음과 걸러 낸 잡음 (사무실 기계 소리 느낌) */
export function startBgm() {
  wantBgm = true
  const c = audio()
  if (!c || !buses || bgm || c.state !== 'running') return
  const out = c.createGain()
  out.gain.setValueAtTime(0, c.currentTime)
  out.gain.linearRampToValueAtTime(BGM_GAIN, c.currentTime + 3)
  out.connect(buses.bgm)

  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 420
  lp.connect(out)
  const oscs = [55, 55.4, 82.5].map((f) => {
    const o = c.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = f
    o.connect(lp)
    o.start()
    return o
  })
  // 필터를 아주 천천히 흔들어 숨 쉬는 느낌
  const lfo = c.createOscillator()
  const depth = c.createGain()
  lfo.frequency.value = 0.07
  depth.gain.value = 140
  lfo.connect(depth).connect(lp.frequency)
  lfo.start()

  bgm = {
    stop: () => {
      const t = c.currentTime
      out.gain.cancelScheduledValues(t)
      out.gain.setValueAtTime(out.gain.value, t)
      out.gain.linearRampToValueAtTime(0, t + 1)
      ;[...oscs, lfo].forEach((o) => o.stop(t + 1.1))
    },
  }
}

export function stopBgm() {
  wantBgm = false
  bgm?.stop()
  bgm = null
}
