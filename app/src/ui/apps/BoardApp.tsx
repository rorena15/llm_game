import {
  Background,
  ConnectionMode,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeChange,
  applyNodeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useEffect, useMemo, useState } from 'react'
import { useRun, type Card, type MissionRun } from '../../game/run'
import { play } from '../../game/sound'
import { useT } from '../../i18n'

type CardNode = Node<{ card: Card; final: boolean; fresh: boolean }, 'card'>

function CardView({ data }: NodeProps<CardNode>) {
  const { card, final, fresh } = data
  const t = useT().apps.board
  return (
    <div className={`card ${card.kind}${final ? ' final' : ''}${fresh ? ' fresh' : ''}`}>
      <Handle type="source" position={Position.Right} id="r" />
      <Handle type="source" position={Position.Left} id="l" />
      <small>{final ? t.finalCard : t.kind[card.kind]}</small>
      <b>{card.label}</b>
      <p>{card.text}</p>
    </div>
  )
}
const nodeTypes = { card: CardView }

/** 처음 보는 카드의 자리: 종류별 열에 차례로 */
function defaultPos(card: Card, index: number) {
  const col = card.kind === 'clue' ? 0 : card.kind === 'fact' ? 1 : 2
  return { x: 20 + col * 230, y: 20 + (index % 6) * 120 }
}

export function BoardApp({ run, visible = true }: { run: MissionRun; visible?: boolean }) {
  useRun(run)
  const t = useT().apps.board
  const [toast, setToast] = useState<{ text: string; bad: boolean } | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  // 보드가 화면에 보이면 새 카드는 본 것으로 (최소화한 동안은 아니다)
  useEffect(() => {
    if (visible) run.markSeen()
  }, [run, run.cards.length, visible])

  // 방금 맞물려 생긴 추론 카드는 잠깐 빛난다
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set())
  useEffect(() => {
    if (!fresh.size) return
    const timer = setTimeout(() => setFresh(new Set()), 1400)
    return () => clearTimeout(timer)
  }, [fresh])

  const finals = useMemo(() => new Set(run.scenario.inferences.filter((i) => i.final).map((i) => i.id)), [run.scenario])
  const [nodes, setNodes] = useState<CardNode[]>([])

  // 카드가 늘면 노드를 맞춘다 (끌어 놓은 위치는 run에 남김)
  useEffect(() => {
    setNodes((prev) =>
      run.cards.map((card, i) => {
        const old = prev.find((n) => n.id === card.id)
        const sameKind = run.cards.filter((c) => c.kind === card.kind).indexOf(card)
        return {
          id: card.id,
          type: 'card',
          position: old?.position ?? run.positions[card.id] ?? defaultPos(card, sameKind >= 0 ? sameKind : i),
          data: { card, final: finals.has(card.id), fresh: fresh.has(card.id) },
        }
      }),
    )
  }, [run.cards, run.positions, finals, fresh])

  const edges: Edge[] = run.links.map((l) => ({
    id: `${l.a}--${l.b}`,
    source: l.a,
    target: l.b,
    sourceHandle: 'r',
    targetHandle: 'l',
    animated: finals.has(l.b) || finals.has(l.a),
  }))

  const onNodesChange = (changes: NodeChange<CardNode>[]) => {
    setNodes((ns) => applyNodeChanges(changes, ns))
    for (const c of changes) if (c.type === 'position' && c.position && !c.dragging) run.setPosition(c.id, c.position)
  }

  if (!run.cards.length) {
    return (
      <div className="board">
        <p className="hint">{t.empty}</p>
      </div>
    )
  }

  return (
    <div className="board flow">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        connectionMode={ConnectionMode.Loose}
        onConnect={({ source, target }) => {
          if (!source || !target) return
          const r = run.link(source, target)
          if (!r.ok) {
            if (r.reason === 'wrong') setToast({ text: t.noRelation, bad: true })
            return
          }
          play('link')
          if (r.made.length) setFresh(new Set(r.made.map((i) => i.id)))
        }}
        colorMode="dark"
        fitView
        fitViewOptions={{ maxZoom: 1 }}
        minZoom={0.4}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={null}
      >
        <Background gap={18} size={1} color="#ffffff14" />
      </ReactFlow>
      <p className="board-help">{t.help(run.wrongLinks)}</p>
      {toast && <div className={`toast${toast.bad ? ' bad' : ''}`}>{toast.text}</div>}
    </div>
  )
}
