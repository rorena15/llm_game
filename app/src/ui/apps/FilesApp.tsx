import { useState } from 'react'
import type { FileFolder } from '../../engine/types'
import { useRun, type MissionRun } from '../../game/run'
import { useT } from '../../i18n'
import { ClueText } from '../ClueText'

const ICON: Record<FileFolder, string> = { docs: '📄', attach: '📎', trash: '🗑' }

/** 타깃 PC의 파일 탐색기. 휴지통 창은 같은 화면을 휴지통 폴더 하나로 연다 (설계안 §18) */
export function FilesApp({ run, folders }: { run: MissionRun; folders: FileFolder[] }) {
  useRun(run)
  const t = useT().apps.files
  const req = run.fileRequest
  const reqFile = req && run.scenario.files?.find((f) => f.id === req.id)
  const [folder, setFolder] = useState<FileFolder>(reqFile && folders.includes(reqFile.folder) ? reqFile.folder : folders[0])
  const [sel, setSel] = useState<string | null>(reqFile ? reqFile.id : null)
  // 창이 열려 있는 동안 메일에서 다른 첨부를 누르면 그 파일로 옮긴다
  const [seenReq, setSeenReq] = useState(req?.n ?? 0)
  if (req && req.n !== seenReq) {
    setSeenReq(req.n)
    if (reqFile && folders.includes(reqFile.folder)) {
      setFolder(reqFile.folder)
      setSel(reqFile.id)
    }
  }

  const list = run.visibleFiles(folder)
  const file = list.find((f) => f.id === sel)
  const emptyText = folder === 'attach' ? t.attachEmpty : folder === 'trash' ? t.trashEmpty : t.empty

  return (
    <div className="files">
      {folders.length > 1 && (
        <nav className="files-nav">
          <small>{t.pc(run.scenario.npc.name)}</small>
          {folders.map((id) => (
            <button key={id} className={folder === id ? 'on' : ''} onClick={() => setFolder(id)}>
              {ICON[id]} {t[id]}
              <span>{run.visibleFiles(id).length || ''}</span>
            </button>
          ))}
        </nav>
      )}
      <div className="files-list">
        <div className="files-head">
          <span>{t.name}</span>
          <span>{t.modified}</span>
        </div>
        <ul>
          {list.length === 0 && <li className="empty">{emptyText}</li>}
          {list.map((f) => (
            <li key={f.id} className={f.id === sel ? 'sel' : ''} onClick={() => setSel(f.id)}>
              <span>
                {ICON[f.folder]} {f.name}
              </span>
              <time>{f.date ?? ''}</time>
            </li>
          ))}
        </ul>
      </div>
      {file ? (
        <article className="files-body">
          <h3>{file.name}</h3>
          <pre className="text">
            <ClueText
              text={file.body}
              clues={run.scenario.clues.filter((c) => c.source === `file:${file.id}`)}
              collected={(id) => run.hasCard(id)}
              onClue={(id) => run.collectClue(id)}
              onLink={(url) => run.openUrl(url)}
            />
          </pre>
        </article>
      ) : (
        <p className="hint">{t.pick}</p>
      )}
    </div>
  )
}
