import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useMemo } from 'react'

interface Props {
  columns: string[]
  rows: unknown[][]
  prevRows: unknown[][]
  prevColumns: string[]
  stepId: string
}

interface DisplayRow {
  key: string
  row: unknown[]
  cols: string[]
  exiting: boolean
}

const FILTER_STEPS = new Set(['WHERE', 'HAVING', 'DISTINCT', 'LIMIT'])

// Calcule les indices à supprimer dans prevRows
function computeExitIndices(
  prevRows: unknown[][],
  rows: unknown[][],
  stepId: string
): Set<number> {
  const pk = (r: unknown[]) => JSON.stringify(r)

  if (stepId === 'DISTINCT') {
    // Comptage : garder une occurrence, supprimer les doublons
    const target = new Map<string, number>()
    rows.forEach(r => target.set(pk(r), (target.get(pk(r)) ?? 0) + 1))
    const used = new Map<string, number>()
    const out = new Set<number>()
    prevRows.forEach((r, i) => {
      const k = pk(r)
      const u = used.get(k) ?? 0
      if (u >= (target.get(k) ?? 0)) out.add(i)
      else used.set(k, u + 1)
    })
    return out
  }

  // WHERE / HAVING / LIMIT : supprimer les lignes absentes du résultat
  const kept = new Set(rows.map(pk))
  const out = new Set<number>()
  prevRows.forEach((r, i) => { if (!kept.has(pk(r))) out.add(i) })
  return out
}

export function AnimatedResultTable({ columns, rows, prevRows, prevColumns, stepId }: Props) {
  const sameSchema = columns.join(',') === prevColumns.join(',')
  const hasFilter  = sameSchema && FILTER_STEPS.has(stepId)

  // Identifiant stable pour détecter le changement d'étape
  const stepKey = useMemo(
    () => `${stepId}-${JSON.stringify(rows.slice(0, 3))}`,
    [stepId, rows]
  )

  // Liste de lignes affichées, gérée manuellement
  const [displayRows, setDisplayRows] = useState<DisplayRow[]>([])

  useEffect(() => {
    if (!hasFilter) {
      // Pas d'animation de suppression : afficher directement les lignes courantes
      setDisplayRows(
        rows.map((row, i) => ({
          key: `row-${i}-${JSON.stringify(row)}`,
          row,
          cols: columns,
          exiting: false,
        }))
      )
      return
    }

    const exitIndices = computeExitIndices(prevRows, rows, stepId)

    if (exitIndices.size === 0) {
      setDisplayRows(
        rows.map((row, i) => ({
          key: `row-${i}-${JSON.stringify(row)}`,
          row,
          cols: columns,
          exiting: false,
        }))
      )
      return
    }

    // Phase 1 : afficher prevRows complet, doublons marqués
    setDisplayRows(
      prevRows.map((row, i) => ({
        key: `prev-${i}-${JSON.stringify(row)}`,
        row,
        cols: prevColumns,
        exiting: exitIndices.has(i),
      }))
    )

    // Phase 2 : retirer les lignes marquées → AnimatePresence déclenche leur exit
    const t1 = setTimeout(() => {
      setDisplayRows(prev => prev.filter(d => !d.exiting))
    }, 1400)

    // Phase 3 : remplacer par les lignes finales (colonnes normalisées)
    const t2 = setTimeout(() => {
      setDisplayRows(
        rows.map((row, i) => ({
          key: `final-${i}-${JSON.stringify(row)}`,
          row,
          cols: columns,
          exiting: false,
        }))
      )
    }, 1900)

    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [stepKey])

  // Style de surbrillance selon l'étape
  const exitClass =
    stepId === 'WHERE' || stepId === 'HAVING' ? 'bg-orange-900/70 text-orange-200' :
    stepId === 'DISTINCT'                     ? 'bg-yellow-900/70 text-yellow-200' :
    stepId === 'LIMIT'                        ? 'bg-gray-700/60 text-gray-400'     :
                                                'bg-red-900/50 text-red-300'

  // Animation d'entrée selon l'étape (lignes finales)
  const entryY = ['FROM', 'GROUP_BY'].includes(stepId) ? -10 : 6
  const stagger = ['FROM', 'GROUP_BY', 'JOIN'].includes(stepId) ? 0.05 : 0.02

  if (displayRows.length === 0) {
    return <p className="text-gray-400 text-center py-4 text-sm">Aucun résultat.</p>
  }

  // Colonnes du header = colonnes de la première ligne (peut être prevColumns pendant animation)
  const headerCols = displayRows[0]?.cols ?? columns

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-200 border-collapse">
        <thead className="text-xs uppercase bg-gray-700 text-gray-400">
          <tr>
            {headerCols.map(col => (
              <th key={col} className="px-4 py-2 whitespace-nowrap">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {displayRows.map((d, i) => (
              <motion.tr
                key={d.key}
                initial={{ opacity: 0, y: entryY }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.25, delay: i * stagger } }}
                exit={{ opacity: 0, x: -24, transition: { duration: 0.3, delay: i * 0.03 } }}
                className={d.exiting
                  ? exitClass
                  : (i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/60')}
                style={{ display: 'table-row' }}
              >
                {d.cols.map((col, ci) => (
                  <td key={col} className="px-4 py-2 whitespace-nowrap">
                    {d.row[ci] == null
                      ? <span className="text-gray-500 italic text-xs">null</span>
                      : String(d.row[ci])}
                  </td>
                ))}
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
      <p className="text-xs text-gray-500 mt-2 px-1">
        {rows.length} ligne{rows.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
