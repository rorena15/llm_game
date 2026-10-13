// 설정 화면과 라이선스 화면 ({pack}, 설계안 §10·§12)
import { isTauri } from '@tauri-apps/api/core'
import { appLogDir } from '@tauri-apps/api/path'
import { useEffect, useState } from 'react'
import { useSave } from '../game/save'
import { MODELS, modelId, setSetting, TEXT_SIZES, TEXT_SPEEDS, textSize, textSpeed } from '../game/settings'
import { setSoundOn, soundOn } from '../game/sound'
import { APP_VERSION } from '../game/version'
import { HealthBanner } from './Screens'

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

export function SettingsScreen({ onBack, onLicenses }: { onBack: () => void; onLicenses: () => void }) {
  useSave()
  const [logDir, setLogDir] = useState<string | null>(null)
  useEffect(() => {
    if (isTauri()) void appLogDir().then(setLogDir).catch(() => setLogDir(null))
  }, [])
  const model = MODELS.find((m) => m.id === modelId())

  return (
    <div className="screen settings">
      <div className="dialog">
        <h2>설정</h2>
        <dl className="settings-list">
          <dt>대화 모델</dt>
          <dd>
            <Choice options={MODELS} value={modelId()} onPick={(id) => setSetting('model', id)} />
            {model && <small>{model.note}</small>}
            <HealthBanner />
          </dd>
          <dt>대사 속도</dt>
          <dd>
            <Choice options={TEXT_SPEEDS} value={textSpeed()} onPick={(id) => setSetting('textSpeed', id)} />
          </dd>
          <dt>글자 크기</dt>
          <dd>
            <Choice options={TEXT_SIZES} value={textSize()} onPick={(id) => setSetting('textSize', id)} />
          </dd>
          <dt>소리</dt>
          <dd>
            <Choice
              options={[
                { id: 'on', label: '켜기' },
                { id: 'off', label: '끄기' },
              ]}
              value={soundOn() ? 'on' : 'off'}
              onPick={(id) => setSoundOn(id === 'on')}
            />
          </dd>
          <dt>문제 신고</dt>
          <dd>
            <p>
              게임이 멈추거나 이상하게 동작하면 itch.io 게임 페이지의 댓글로 알려 주세요. 오류 기록 파일(game.log)을 함께
              올려 주시면 원인을 찾는 데 큰 도움이 됩니다.
            </p>
            {logDir && <code className="path">{logDir}</code>}
          </dd>
        </dl>
        <div className="actions">
          <button onClick={onBack}>돌아가기</button>
          <button className="ghost" onClick={onLicenses}>
            라이선스
          </button>
        </div>
        <small className="version">v{APP_VERSION}</small>
      </div>
    </div>
  )
}

/** 함께 배포하는 구성 요소. 전문은 public/licenses/에 원본 그대로 둔다 */
const COMPONENTS = [
  { name: 'Kanana 1.5', by: 'Kakao Corp.', license: 'Apache License 2.0', file: 'apache-2.0.txt' },
  { name: 'llama.cpp', by: 'The ggml authors', license: 'MIT License', file: 'llama.cpp.txt' },
  { name: 'Tauri', by: 'Tauri Apps Contributors', license: 'MIT License 또는 Apache License 2.0', file: 'tauri-mit.txt' },
  { name: 'React', by: 'Meta Platforms, Inc. and affiliates', license: 'MIT License', file: 'react.txt' },
  { name: 'React Flow', by: 'webkid GmbH', license: 'MIT License', file: 'react-flow.txt' },
]

export function LicenseScreen({ onBack }: { onBack: () => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const [text, setText] = useState('')
  useEffect(() => {
    if (!open) return
    let alive = true
    fetch(`licenses/${open}`)
      .then((r) => r.text())
      .then((t) => alive && setText(t))
      .catch(() => alive && setText('라이선스 파일을 읽지 못했습니다.'))
    return () => {
      alive = false
    }
  }, [open])

  return (
    <div className="screen settings">
      <div className="dialog">
        <h2>라이선스</h2>
        <p className="sub">이 게임은 아래 구성 요소를 사용합니다. 이름을 누르면 라이선스 전문이 보입니다.</p>
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
                  {c.by} · {c.license}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {open && <pre className="license-text">{text}</pre>}
        <div className="actions">
          <button onClick={onBack}>돌아가기</button>
        </div>
      </div>
    </div>
  )
}
