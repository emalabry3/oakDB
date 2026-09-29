import { useMemo } from 'react'
import type { SchemaTable } from '../api/client'

// ── Constantes de layout ──────────────────────────────────────────────────────
const TW     = 230   // largeur d'une carte table
const ROW_H  = 28    // hauteur d'une ligne colonne
const HEAD_H = 38    // hauteur de l'entête table
const GAP_X  = 90    // espace horizontal entre niveaux (couloir des flèches)
const GAP_Y  = 28    // espace vertical entre tables d'un même niveau
const PAD    = 24    // marge extérieure
const LANE_H = 16    // hauteur d'un couloir de routage (flèches non-adjacentes)
const LANE_PAD = 8   // espace entre la zone de routage et les tables

function tblH(t: SchemaTable) {
  return HEAD_H + t.columns.length * ROW_H
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function bary(nodes: string[], idx: Map<string, number>): number {
  const valid = nodes.filter(n => idx.has(n))
  return valid.length === 0 ? -1
    : valid.reduce((s, n) => s + idx.get(n)!, 0) / valid.length
}

/** Génère un chemin SVG à coins arrondis depuis une liste de points */
function smoothPath(pts: [number, number][], radius = 10): string {
  if (pts.length < 2) return ''
  if (pts.length === 2) return `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]}`

  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]

    const dx1 = x1 - x0, dy1 = y1 - y0
    const len1 = Math.hypot(dx1, dy1)
    const dx2 = x2 - x1, dy2 = y2 - y1
    const len2 = Math.hypot(dx2, dy2)
    const r = Math.min(radius, len1 / 2, len2 / 2)

    const ux1 = dx1 / len1, uy1 = dy1 / len1
    const ux2 = dx2 / len2, uy2 = dy2 / len2

    const p1x = x1 - ux1 * r, p1y = y1 - uy1 * r
    const p2x = x1 + ux2 * r, p2y = y1 + uy2 * r

    d += ` L ${p1x} ${p1y} Q ${x1} ${y1} ${p2x} ${p2y}`
  }
  d += ` L ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`
  return d
}

// ── Calcul du layout ──────────────────────────────────────────────────────────
interface Layout {
  pos: Map<string, { x: number; y: number }>
  levels: Map<string, number>
  totalW: number
  totalH: number
  topOffset: number  // espace réservé au-dessus pour le routage
}

function computeLayout(tables: SchemaTable[]): Layout {
  const tmap = new Map(tables.map(t => [t.table, t]))

  // Arêtes FK : table → tables référencées (sans auto-références)
  const targets = new Map(tables.map(t => [
    t.table,
    [...new Set(
      t.columns
        .filter(c => c.references && c.references.table !== t.table)
        .map(c => c.references!.table)
        .filter(name => tmap.has(name))
    )],
  ]))

  // Niveau = chemin le plus long vers une feuille (assignation longest-path)
  const lvl = new Map<string, number>()
  function getL(name: string, path = new Set<string>()): number {
    if (lvl.has(name)) return lvl.get(name)!
    if (path.has(name)) return 0
    path.add(name)
    const tgts = targets.get(name) ?? []
    const l = tgts.length
      ? Math.max(...tgts.map(t => getL(t, new Set(path)))) + 1
      : 0
    lvl.set(name, l)
    return l
  }
  for (const t of tables) getL(t.table)

  // Regroupement par niveau
  const byLvl = new Map<number, string[]>()
  for (const [name, l] of lvl) {
    if (!byLvl.has(l)) byLvl.set(l, [])
    byLvl.get(l)!.push(name)
  }
  const maxL = Math.max(0, ...lvl.values())

  // ── Tri barycenter (4 passes aller-retour) ────────────────────────────────
  for (let pass = 0; pass < 4; pass++) {
    for (let l = maxL; l >= 1; l--) {
      const nodes = byLvl.get(l)!
      const prevIdx = new Map((byLvl.get(l - 1) ?? []).map((n, i) => [n, i] as [string, number]))
      nodes.sort((a, b) => bary(targets.get(a)!, prevIdx) - bary(targets.get(b)!, prevIdx))
    }
    for (let l = 0; l < maxL; l++) {
      const nodes = byLvl.get(l)!
      const nextNodes = byLvl.get(l + 1) ?? []
      const nextIdx = new Map(nextNodes.map((n, i) => [n, i] as [string, number]))
      nodes.sort((a, b) => {
        const ar = nextNodes.filter(n => (targets.get(n) ?? []).includes(a))
        const br = nextNodes.filter(n => (targets.get(n) ?? []).includes(b))
        return bary(ar, nextIdx) - bary(br, nextIdx)
      })
    }
  }

  // ── Compte les flèches non-adjacentes pour réserver l'espace de routage ──
  let nonAdjacentCount = 0
  for (const t of tables) {
    const fkL = lvl.get(t.table) ?? 0
    for (const c of t.columns) {
      if (c.references && c.references.table !== t.table) {
        const pkL = lvl.get(c.references.table) ?? 0
        if (fkL - pkL > 1) nonAdjacentCount++
      }
    }
  }
  const topOffset = nonAdjacentCount > 0
    ? nonAdjacentCount * LANE_H + LANE_PAD
    : 0

  // ── Attribution des positions absolues ───────────────────────────────────
  const pos = new Map<string, { x: number; y: number }>()
  for (let l = 0; l <= maxL; l++) {
    const x = PAD + l * (TW + GAP_X)
    let y = PAD + topOffset
    for (const name of byLvl.get(l) ?? []) {
      pos.set(name, { x, y })
      y += tblH(tmap.get(name)!) + GAP_Y
    }
  }

  const totalW = PAD + (maxL + 1) * (TW + GAP_X) - GAP_X + PAD
  const colHeights = [...byLvl.values()].map(nodes =>
    nodes.reduce((s, n) => s + tblH(tmap.get(n)!) + GAP_Y, 0) - GAP_Y
  )
  const totalH = PAD + topOffset + Math.max(0, ...colHeights) + PAD

  return { pos, levels: lvl, totalW, totalH, topOffset }
}

// ── Calcul des flèches ────────────────────────────────────────────────────────
interface Arrow {
  d: string
  cx: number; cy: number  // point de départ (cercle côté FK)
  key: string
}

function computeArrows(
  tables: SchemaTable[],
  pos: Map<string, { x: number; y: number }>,
  levels: Map<string, number>,
): Arrow[] {
  const tmap = new Map(tables.map(t => [t.table, t]))
  const arrows: Arrow[] = []
  let nonAdjacentIdx = 0

  for (const t of tables) {
    const tp = pos.get(t.table)
    if (!tp) continue
    const fkLevel = levels.get(t.table) ?? 0

    for (let ci = 0; ci < t.columns.length; ci++) {
      const col = t.columns[ci]
      if (!col.references) continue
      const rt = tmap.get(col.references.table)
      if (!rt || col.references.table === t.table) continue
      const rp = pos.get(rt.table)
      if (!rp) continue
      const pkLevel = levels.get(rt.table) ?? 0
      const rci = rt.columns.findIndex(c => c.name === col.references!.column)
      if (rci === -1) continue

      const key = `${t.table}.${col.name}->${rt.table}.${col.references.column}`
      const fromX = tp.x
      const fromY = tp.y + HEAD_H + ci * ROW_H + ROW_H / 2
      const toX   = rp.x + TW
      const toY   = rp.y + HEAD_H + rci * ROW_H + ROW_H / 2

      const levelDiff = fkLevel - pkLevel

      if (levelDiff === 1) {
        // ── Flèche adjacente : courbe de Bézier dans le couloir inter-niveaux ──
        // La courbe reste mathématiquement dans le gap (x et y entre endpoints)
        const dx = (fromX - toX) * 0.45
        const d = `M ${fromX} ${fromY} C ${fromX - dx} ${fromY}, ${toX + dx} ${toY}, ${toX} ${toY}`
        arrows.push({ d, cx: fromX, cy: fromY, key })

      } else if (levelDiff > 1) {
        // ── Flèche non-adjacente : routage orthogonal au-dessus des tables ──
        // Chaque flèche non-adjacente obtient son propre couloir horizontal.
        // On ajoute une marge MARGIN de chaque côté pour ne pas coller aux tables.
        const routeY = PAD / 2 + nonAdjacentIdx * LANE_H
        nonAdjacentIdx++
        const MARGIN = GAP_X / 3  // recul dans le couloir avant de monter/descendre

        const pts: [number, number][] = [
          [fromX,          fromY],   // bord gauche de la table FK
          [fromX - MARGIN, fromY],   // recul horizontal dans le couloir
          [fromX - MARGIN, routeY],  // montée vers le couloir de routage
          [toX + MARGIN,   routeY],  // traversée horizontale au-dessus des tables
          [toX + MARGIN,   toY],     // descente vers la ligne PK
          [toX,            toY],     // arrivée au bord droit de la table PK
        ]
        const d = smoothPath(pts, 10)
        arrows.push({ d, cx: fromX, cy: fromY, key })
      }
      // levelDiff <= 0 (même niveau ou cycle) : ignoré
    }
  }

  return arrows
}

// ── Composant ─────────────────────────────────────────────────────────────────
interface Props { tables: SchemaTable[]; onClose: () => void }

export function DataModelModal({ tables, onClose }: Props) {
  const { pos, levels, totalW, totalH } = useMemo(() => computeLayout(tables), [tables])
  const arrows = useMemo(() => computeArrows(tables, pos, levels), [tables, pos, levels])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-white">Modèle de données</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
        </div>

        {/* Zone de dessin scrollable */}
        <div className="overflow-auto flex-1">
          <div className="relative" style={{ width: totalW, height: totalH, minWidth: '100%', minHeight: '100%' }}>

            {/* SVG : flèches */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={totalW}
              height={totalH}
              style={{ overflow: 'visible' }}
            >
              <defs>
                <marker id="dm-arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
                </marker>
              </defs>

              {arrows.map(a => (
                <g key={a.key}>
                  <path
                    d={a.d}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="5 3"
                    opacity="0.8"
                    markerEnd="url(#dm-arrow)"
                  />
                  <circle cx={a.cx} cy={a.cy} r="3.5" fill="#f59e0b" opacity="0.9" />
                </g>
              ))}
            </svg>

            {/* Cartes de tables */}
            {tables.map(t => {
              const p = pos.get(t.table)
              if (!p) return null
              return (
                <div
                  key={t.table}
                  className="absolute border border-gray-600 rounded overflow-hidden text-sm shadow-xl"
                  style={{ left: p.x, top: p.y, width: TW, backgroundColor: '#1a1f2e' }}
                >
                  <div
                    className="font-mono font-bold text-blue-100 text-center border-b border-blue-800/60 px-3"
                    style={{ height: HEAD_H, lineHeight: `${HEAD_H}px`, background: 'rgba(30,58,138,0.7)' }}
                  >
                    {t.table}
                  </div>
                  {t.columns.map(c => {
                    const isPK = !!c.is_primary_key
                    const isFK = !!c.references
                    return (
                      <div
                        key={c.name}
                        className={`flex items-center gap-1.5 px-2.5 border-b border-gray-700/40 last:border-0 ${
                          isPK ? 'bg-yellow-900/20' : isFK ? 'bg-amber-900/15' : ''
                        }`}
                        style={{ height: ROW_H }}
                      >
                        <span className={`text-[10px] font-bold w-5 text-center shrink-0 ${
                          isPK ? 'text-yellow-400' : isFK ? 'text-amber-400' : 'text-transparent select-none'
                        }`}>
                          {isPK ? 'PK' : isFK ? 'FK' : 'xx'}
                        </span>
                        <span className={`font-mono flex-1 truncate text-xs ${
                          isPK ? 'text-yellow-100 font-semibold' : isFK ? 'text-amber-200' : 'text-gray-200'
                        }`}>
                          {c.name}
                        </span>
                        <span className="text-gray-500 text-[10px] shrink-0 ml-1">{c.type}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* Légende */}
        <div className="flex gap-5 px-5 py-2 border-t border-gray-700 text-xs text-gray-500 shrink-0">
          <span><span className="text-yellow-400 font-bold">PK</span> Clé primaire</span>
          <span><span className="text-amber-400 font-bold">FK</span> Clé étrangère</span>
          <span>
            <span className="text-amber-400">●</span>
            <span className="mx-1 text-amber-400/60">- - -▶</span>
            FK → PK
          </span>
        </div>
      </div>
    </div>
  )
}
