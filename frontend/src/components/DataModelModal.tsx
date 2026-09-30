import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import Dagre from '@dagrejs/dagre'
import type { SchemaTable } from '../api/client'

// ── Dimensions ────────────────────────────────────────────────────────────────
const TW     = 240   // largeur d'une carte table
const HEAD_H = 38    // hauteur de l'en-tête
const ROW_H  = 28    // hauteur d'une ligne de colonne

function tableHeight(t: SchemaTable) {
  return HEAD_H + t.columns.length * ROW_H
}

// ── Nœud custom : une table ───────────────────────────────────────────────────
type TableNodeData = { table: SchemaTable }

function TableNode({ data }: { data: TableNodeData }) {
  const { table: t } = data

  return (
    <div
      className="border border-gray-600 rounded overflow-visible text-sm shadow-2xl select-none"
      style={{ width: TW, backgroundColor: '#1a1f2e' }}
    >
      {/* En-tête */}
      <div
        className="font-mono font-bold text-blue-100 text-center border-b border-blue-800/60 px-3 truncate rounded-t"
        style={{ height: HEAD_H, lineHeight: `${HEAD_H}px`, background: 'rgba(30,58,138,0.85)' }}
      >
        {t.table}
      </div>

      {/* Colonnes */}
      {t.columns.map((col, i) => {
        const isPK = !!col.is_primary_key
        const isFK = !!col.references
        // Position verticale du centre de cette ligne dans le nœud
        const handleTop = HEAD_H + i * ROW_H + ROW_H / 2

        return (
          <div
            key={col.name}
            className={`flex items-center gap-1.5 px-2.5 border-b border-gray-700/40 last:border-b-0 ${
              isPK ? 'bg-yellow-900/20' : isFK ? 'bg-amber-900/15' : ''
            }`}
            style={{ height: ROW_H }}
          >
            {/* Handle source (côté droit) : colonnes FK qui pointent vers une PK */}
            {isFK && (
              <Handle
                type="source"
                position={Position.Right}
                id={`src-${col.name}`}
                style={{
                  top: handleTop,
                  right: -5,
                  background: '#f59e0b',
                  width: 9,
                  height: 9,
                  border: '2px solid #1a1f2e',
                  borderRadius: '50%',
                }}
              />
            )}
            {/* Handle target (côté gauche) : colonnes PK qui reçoivent les FK */}
            {isPK && (
              <Handle
                type="target"
                position={Position.Left}
                id={`tgt-${col.name}`}
                style={{
                  top: handleTop,
                  left: -5,
                  background: '#eab308',
                  width: 9,
                  height: 9,
                  border: '2px solid #1a1f2e',
                  borderRadius: '50%',
                }}
              />
            )}

            {/* Badge PK / FK */}
            <span className={`text-[10px] font-bold w-5 text-center shrink-0 ${
              isPK ? 'text-yellow-400' : isFK ? 'text-amber-400' : 'text-transparent'
            }`}>
              {isPK ? 'PK' : isFK ? 'FK' : 'xx'}
            </span>

            {/* Nom de la colonne */}
            <span className={`font-mono flex-1 truncate text-xs ${
              isPK ? 'text-yellow-100 font-semibold' : isFK ? 'text-amber-200' : 'text-gray-200'
            }`}>
              {col.name}
            </span>

            {/* Type SQL */}
            <span className="text-gray-500 text-[10px] shrink-0 ml-1">{col.type}</span>
          </div>
        )
      })}
    </div>
  )
}

const nodeTypes: NodeTypes = { table: TableNode }

// ── Layout Dagre (algorithme de Sugiyama hiérarchique) ────────────────────────
function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  tableMap: Map<string, SchemaTable>,
): Node[] {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: 'LR',   // Gauche → Droite : FK à gauche, PK à droite
    nodesep: 60,     // Espace vertical entre nœuds du même rang
    ranksep: 120,    // Espace horizontal entre rangs
    marginx: 40,
    marginy: 40,
  })

  for (const node of nodes) {
    const t = tableMap.get(node.id)!
    g.setNode(node.id, { width: TW, height: tableHeight(t) })
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  Dagre.layout(g)

  return nodes.map(node => {
    const { x, y } = g.node(node.id)
    const t = tableMap.get(node.id)!
    const h = tableHeight(t)
    return {
      ...node,
      position: { x: x - TW / 2, y: y - h / 2 },
    }
  })
}

// ── Construction des nœuds et arêtes depuis le schéma ─────────────────────────
function buildElements(tables: SchemaTable[]): { nodes: Node[]; edges: Edge[] } {
  const tableMap = new Map(tables.map(t => [t.table, t]))

  const nodes: Node[] = tables.map(t => ({
    id: t.table,
    type: 'table',
    position: { x: 0, y: 0 },
    data: { table: t } as TableNodeData,
    // Dimensions explicites pour Dagre et React Flow
    style: { width: TW, height: tableHeight(t) },
  }))

  const edges: Edge[] = []
  for (const t of tables) {
    for (const col of t.columns) {
      if (!col.references) continue
      if (col.references.table === t.table) continue       // ignore auto-références
      if (!tableMap.has(col.references.table)) continue    // ignore refs orphelines

      edges.push({
        id: `${t.table}.${col.name}->${col.references.table}.${col.references.column}`,
        source: t.table,
        sourceHandle: `src-${col.name}`,
        target: col.references.table,
        targetHandle: `tgt-${col.references.column}`,
        type: 'smoothstep',
        style: { stroke: '#f59e0b', strokeWidth: 1.5, strokeDasharray: '6 3' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#f59e0b',
          width: 14,
          height: 14,
        },
      })
    }
  }

  const layoutedNodes = applyDagreLayout(nodes, edges, tableMap)
  return { nodes: layoutedNodes, edges }
}

// ── Composant principal ───────────────────────────────────────────────────────
interface Props { tables: SchemaTable[]; onClose: () => void }

export function DataModelModal({ tables, onClose }: Props) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildElements(tables),
    [tables],
  )

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl flex flex-col"
        style={{ width: '95vw', height: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-white">Modèle de données</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Canvas React Flow */}
        <div className="flex-1 relative" style={{ minHeight: 0 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.12 }}
            colorMode="dark"
            nodesDraggable
            nodesConnectable={false}
            edgesReconnectable={false}
            deleteKeyCode={null}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              color="#374151"
              gap={22}
              size={1.2}
            />
            <Controls
              showInteractive={false}
              style={{
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: 6,
              }}
            />
          </ReactFlow>
        </div>

        {/* Légende */}
        <div className="flex items-center gap-5 px-5 py-2 border-t border-gray-700 text-xs text-gray-500 shrink-0">
          <span><span className="text-yellow-400 font-bold">PK</span> Clé primaire</span>
          <span><span className="text-amber-400 font-bold">FK</span> Clé étrangère</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-amber-400/50">- - -▶</span>
            <span>FK → PK</span>
          </span>
          <span className="ml-auto text-gray-600 italic">
            Glissez les tables · Molette pour zoomer · Ctrl+molette pour scroller
          </span>
        </div>
      </div>
    </div>
  )
}
