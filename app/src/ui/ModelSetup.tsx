// 첫 실행 모델 받기 ({pack}, 설계안 §12). 타이틀과 설정에 보인다. 받는 동안에도 튜토리얼은 할 수 있다
import { useSave } from '../game/save'
import { cancelDownload, download, modelInfo, recommended, SIDECAR, useRuntime } from '../game/runtime'
import { MODELS, modelId, setSetting } from '../game/settings'
import { useT } from '../i18n'

const gb = (bytes: number) => (bytes / 1024 ** 3).toFixed(1)

export function ModelSetup() {
  useSave()
  const rt = useRuntime()
  const tAll = useT()
  const t = tAll.screens.setup
  const labels = tAll.screens.settings.models
  if (!SIDECAR) return null

  const current = modelId()
  const p = rt.progress
  if (p) {
    const pct = p.total ? Math.floor((p.done / p.total) * 100) : 0
    return (
      <div className="model-setup">
        <b>{t.downloading(labels[p.id as keyof typeof labels].label)}</b>
        <div className="bar">
          <div style={{ width: `${pct}%` }} />
        </div>
        <div className="row">
          <span>{p.phase === 'verify' ? t.verifying : t.progress(pct, gb(p.done), gb(p.total))}</span>
          {p.phase === 'download' && (
            <button className="ghost" onClick={cancelDownload}>
              {t.cancel}
            </button>
          )}
        </div>
        <small>{t.tutorialHint}</small>
      </div>
    )
  }

  if (modelInfo(current)?.ready) {
    if (rt.server === 'starting') return <div className="model-setup dim">{t.starting}</div>
    if (rt.server === 'cpu') return <div className="model-setup dim">{t.cpuMode}</div>
    return null
  }
  if (!rt.models.length) return null

  const rec = recommended()
  const vram = Math.max(0, ...(rt.gpus ?? []).map((g) => g.total_mib))
  const gpu = rt.gpus?.find((g) => g.total_mib === vram)
  // 추천 모델을 먼저
  const order = [...MODELS].sort((a, b) => Number(b.id === rec) - Number(a.id === rec))
  const start = (id: string) => {
    if (id !== current) setSetting('model', id)
    void download(id, modelId)
  }

  return (
    <div className="model-setup">
      <b>{t.title}</b>
      <p>{t.intro}</p>
      <small>{t.spec}</small>
      <small>{rt.gpus === null ? t.checkingGpu : gpu ? t.gpu(gpu.name, (gpu.total_mib / 1024).toFixed(0)) : t.noGpu}</small>
      {rt.error && <p className="warn">{t.failed(rt.error)}</p>}
      <div className="row">
        {order.map((m) => {
          const info = modelInfo(m.id)
          const partial = !!info && info.have > 0
          return (
            <button key={m.id} className={m.id === rec ? '' : 'ghost'} onClick={() => start(m.id)}>
              {partial ? `${t.resume} · ${labels[m.id].label}` : t.download(labels[m.id].label, gb(info?.size ?? 0))}
              {m.id === rec && <em>{t.recommended}</em>}
            </button>
          )
        })}
      </div>
      <small>{t.tutorialHint}</small>
    </div>
  )
}
