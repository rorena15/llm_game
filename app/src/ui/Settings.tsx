// 설정 화면과 라이선스 화면 ({pack}, 설계안 §10·§12)
import { isTauri } from '@tauri-apps/api/core'
import { appLogDir } from '@tauri-apps/api/path'
import { useEffect, useState } from 'react'
import { useSave } from '../game/save'
import { MODELS, modelId, setSetting, TEXT_SIZES, TEXT_SPEEDS, textSize, textSpeed } from '../game/settings'
import { play, setSoundOn, setVolume, soundOn, volume, VOLUMES, type VolumeKind } from '../game/sound'
import { APP_VERSION } from '../game/version'
import { CONTENT_READY, LANGS, lang, setLang, useT } from '../i18n'
import { DEV_ENABLED } from '../game/dev'
import { HealthBanner } from './Screens'
import { ModelSetup } from './ModelSetup'
import { modelInfo, SIDECAR, specWarning, useRuntime } from '../game/runtime'

function Choice<T extends { id: string; label: string }>({
  options,
  value,
  onPick,
}: {
  options: readonly T[]
  value: string
  onPick: (id: string) => void
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.id} className={o.id === value ? 'on' : ''} onClick={() => onPick(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** 미리 듣기 소리. 배경음은 미션 중에만 나와서 효과음으로 대신 들려준다 */
const PREVIEW: Record<VolumeKind, Parameters<typeof play>[0]> = { master: 'notice', bgm: 'notice', sfx: 'clue', key: 'key' }

export function Volume({ kind, label }: { kind: VolumeKind; label: string }) {
  const v = volume(kind)
  return (
    <label className="volume">
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={v}
        onChange={(e) => setVolume(kind, Number(e.target.value))}
        onPointerUp={() => kind !== 'bgm' && play(PREVIEW[kind])}
        onKeyUp={() => kind !== 'bgm' && play(PREVIEW[kind])}
      />
      <output>{v}</output>
    </label>
  )
}

export function SettingsScreen({ onBack, onLicenses }: { onBack: () => void; onLicenses: () => void }) {
  useSave()
  useRuntime()
  const tAll = useT()
  const t = tAll.screens
  const tc = tAll.common
  const [logDir, setLogDir] = useState<string | null>(null)
  useEffect(() => {
    if (isTauri()) void appLogDir().then(setLogDir).catch(() => setLogDir(null))
  }, [])
  const model = t.settings.models[modelId() as keyof typeof t.settings.models] as { note: string } | undefined

  return (
    <div className="screen settings">
      <div className="dialog">
        <h2>{t.settings.title}</h2>
        <dl className="settings-list">
          <dt>언어 · Language</dt>
          <dd>
            <Choice
              options={LANGS.filter((l) => DEV_ENABLED || CONTENT_READY.includes(l.id))}
              value={lang()}
              onPick={(id) => setLang(id as (typeof LANGS)[number]['id'])}
            />
            {!CONTENT_READY.includes(lang()) && <small>UI only. Mission text is not translated yet.</small>}
          </dd>
          <dt>{t.settings.model}</dt>
          <dd>
            <Choice
              options={MODELS.map((m) => ({
                id: m.id,
                label: t.settings.models[m.id].label + (SIDECAR && !modelInfo(m.id)?.ready ? ` · ${t.setup.notDownloaded}` : ''),
              }))}
              value={modelId()}
              onPick={(id) => setSetting('model', id)}
            />
            {model && <small>{model.note}</small>}
            <SpecWarning />
            <ModelSetup />
            <HealthBanner />
          </dd>
          <dt>{t.settings.speed}</dt>
          <dd>
            <Choice options={TEXT_SPEEDS.map((s) => ({ id: s.id, label: t.settings.speeds[s.id] }))} value={textSpeed()} onPick={(id) => setSetting('textSpeed', id)} />
          </dd>
          <dt>{t.settings.size}</dt>
          <dd>
            <Choice options={TEXT_SIZES.map((s) => ({ id: s.id, label: t.settings.sizes[s.id] }))} value={textSize()} onPick={(id) => setSetting('textSize', id)} />
          </dd>
          <dt>{t.settings.sound}</dt>
          <dd>
            <Choice
              options={[
                { id: 'on', label: t.settings.soundOn },
                { id: 'off', label: t.settings.soundOff },
              ]}
              value={soundOn() ? 'on' : 'off'}
              onPick={(id) => setSoundOn(id === 'on')}
            />
            <div className={`volumes${soundOn() ? '' : ' muted'}`}>
              {VOLUMES.map((v) => (
                <Volume key={v.id} kind={v.id} label={t.settings.volumes[v.id]} />
              ))}
            </div>
          </dd>
          <dt>{t.settings.report}</dt>
          <dd>
            <p>
              {t.settings.reportBody}
            </p>
            {logDir && <code className="path">{logDir}</code>}
          </dd>
        </dl>
        <div className="actions">
          <button onClick={onBack}>{tc.back}</button>
          <button className="ghost" onClick={onLicenses}>
            {t.settings.licenses}
          </button>
        </div>
        <small className="version">v{APP_VERSION}</small>
      </div>
    </div>
  )
}

/** 함께 배포하는 구성 요소. 전문은 public/licenses/에 원본 그대로 둔다 */
const COMPONENTS: { name: string; by: string; license: string | null; file: string }[] = [
  { name: 'Kanana 1.5', by: 'Kakao Corp.', license: 'Apache License 2.0', file: 'apache-2.0.txt' },
  { name: 'llama.cpp', by: 'The ggml authors', license: 'MIT License', file: 'llama.cpp.txt' },
  { name: 'Tauri', by: 'Tauri Apps Contributors', license: null, file: 'tauri-mit.txt' },
  { name: 'React', by: 'Meta Platforms, Inc. and affiliates', license: 'MIT License', file: 'react.txt' },
  { name: 'React Flow', by: 'webkid GmbH', license: 'MIT License', file: 'react-flow.txt' },
]

export function LicenseScreen({ onBack }: { onBack: () => void }) {
  const tAll = useT()
  const t = tAll.screens
  const tc = tAll.common
  const [open, setOpen] = useState<string | null>(null)
  const [text, setText] = useState('')
  useEffect(() => {
    if (!open) return
    let alive = true
    fetch(`licenses/${open}`)
      .then((r) => r.text())
      .then((t) => alive && setText(t))
      .catch(() => alive && setText(t.licenses.readFail))
    return () => {
      alive = false
    }
  }, [open, t.licenses.readFail])

  return (
    <div className="screen settings">
      <div className="dialog">
        <h2>{t.licenses.title}</h2>
        <p className="sub">{t.licenses.intro}</p>
        <ul className="licenses">
          {COMPONENTS.map((c) => (
            <li key={c.name}>
              <button
                className={open === c.file ? 'on' : ''}
                onClick={() => {
                  setText('')
                  setOpen(open === c.file ? null : c.file)
                }}
              >
                <b>{c.name}</b>
                <span>
                  {c.by} · {c.license ?? t.licenses.tauri}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {open && <pre className="license-text">{text}</pre>}
        <div className="actions">
          <button onClick={onBack}>{tc.back}</button>
        </div>
      </div>
    </div>
  )
}

/** 고품질 모델이 이 PC에 무거우면 가벼운 모델을 권한다 (배포본에서만: 개발 빌드는 Ollama라 GPU 정보가 없다) */
function SpecWarning() {
  useRuntime()
  const t = useT().screens.settings
  const w = SIDECAR ? specWarning(modelId()) : null
  if (!w) return null
  return <small className="warn">{w.kind === 'cpu' ? t.cpuHeavy : t.lowVram(w.gb)}</small>
}
