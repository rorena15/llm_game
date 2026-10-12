import { useRun, type MissionRun } from '../../game/run'

const KIND: Record<string, string> = { clue: '문서', fact: '대화', inference: '추론' }

/** 1차: 모은 단서 카드 목록. 카드 잇기·추론은 {board}에서 */
export function BoardApp({ run }: { run: MissionRun }) {
  useRun(run)
  return (
    <div className="board">
      {run.cards.length === 0 ? (
        <p className="hint">아직 모은 단서가 없습니다. 메일·웹페이지의 밑줄 친 낱말이나 대화 속 단서를 눌러 모으세요.</p>
      ) : (
        <div className="cards">
          {run.cards.map((c) => (
            <div key={c.id} className={`card ${c.kind}`}>
              <small>{KIND[c.kind]}</small>
              <b>{c.label}</b>
              <p>{c.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
