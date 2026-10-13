// 소리 (§10, {sound}). 출처를 확인할 수 없는 옛 효과음 대신 Web Audio로 직접 합성한다.
// 브라우저는 사용자가 한 번 누르기 전에는 소리를 막으므로, 첫 클릭·키 입력 때 AudioContext를 깨운다
import { save } from './save'

export type Sfx = 'key' | 'notice' | 'clue' | 'inference' | 'error' | 'granted' | 'alarm'

const MASTER = 0.5
const BGM_GAIN = 0.05

let ctx: AudioContext | null = null
let master: GainNode | null = null
let bgm: { stop: () => void } | null = null
let wantBgm = false

export const soundOn = () => save.data.settings.sound !== false

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = soundOn() ? MASTER : 0
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
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
  if (master && ctx) master.gain.setTargetAtTime(on ? MASTER : 0, ctx.currentTime, 0.05)
}

/** 짧은 음 하나: 주파수, 시작(초), 길이(초), 파형, 크기 */
function tone(c: AudioContext, freq: number, at: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
  const o = c.createOscillator()
  const g = c.createGain()
  const t = c.currentTime + at
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(master!)
  o.start(t)
  o.stop(t + dur + 0.02)
}

/** 걸러 낸 잡음 한 토막 (키보드 딸깍) */
function tick(c: AudioContext, vol: number) {
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
  src.connect(f).connect(g).connect(master!)
  src.start()
}

export function play(s: Sfx) {
  if (!soundOn()) return
  const c = audio()
  if (!c || !master || c.state !== 'running') return
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
  }
}

/** 낮게 깔리는 배경음: 어긋난 두 음과 걸러 낸 잡음 (사무실 기계 소리 느낌) */
export function startBgm() {
  wantBgm = true
  const c = audio()
  if (!c || !master || bgm || c.state !== 'running') return
  const out = c.createGain()
  out.gain.setValueAtTime(0, c.currentTime)
  out.gain.linearRampToValueAtTime(BGM_GAIN, c.currentTime + 3)
  out.connect(master)

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
