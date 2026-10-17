import { useEffect, useRef, useState } from 'react'
import { useSave } from '../../game/save'
import { useT } from '../../i18n'

const SAVE_MS = 600

/** 플레이어의 메모장. 글은 저장 파일에 하나로 남는다 ({d.desktop}) */
export function NotepadApp() {
  const t = useT().apps.notepad
  const store = useSave()
  const [text, setText] = useState(() => store.data.memo ?? '')
  const [dirty, setDirty] = useState(false)
  const latest = useRef(text)
  useEffect(() => {
    latest.current = text
  }, [text])
  useEffect(() => {
    if (!dirty) return
    const timer = setTimeout(() => {
      store.setMemo(latest.current)
      setDirty(false)
    }, SAVE_MS)
    return () => clearTimeout(timer)
  }, [text, dirty, store])
  // 창을 닫을 때 아직 안 쓴 글을 마저 저장
  useEffect(() => () => store.setMemo(latest.current), [store])

  return (
    <div className="notepad">
      <div className="notepad-bar">
        <span>{t.file}</span>
        <small>{dirty ? '…' : t.saved} · {t.chars(text.length)}</small>
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setDirty(true)
        }}
        placeholder={t.placeholder}
        spellCheck={false}
      />
    </div>
  )
}
