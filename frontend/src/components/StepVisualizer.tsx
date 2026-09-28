import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { QueryStep } from '../api/client'
import { AnimatedResultTable } from './AnimatedResultTable'

interface Props {
  steps: QueryStep[]
  currentIndex: number
  onNavigate: (index: number) => void
}

const STEP_COLORS: Record<string, string> = {
  FROM:       'bg-blue-900/50 border-blue-600 text-blue-200',
  JOIN:       'bg-cyan-900/50 border-cyan-600 text-cyan-200',
  WHERE:      'bg-orange-900/50 border-orange-600 text-orange-200',
  GROUP_BY:   'bg-indigo-900/50 border-indigo-600 text-indigo-200',
  HAVING:     'bg-pink-900/50 border-pink-600 text-pink-200',
  SELECT:     'bg-purple-900/50 border-purple-600 text-purple-200',
  DISTINCT:   'bg-yellow-900/50 border-yellow-600 text-yellow-200',
  ORDER_BY:   'bg-green-900/50 border-green-600 text-green-200',
  LIMIT:      'bg-red-900/50 border-red-600 text-red-200',
  SUBQUERY:   'bg-teal-900/50 border-teal-600 text-teal-200',
}

export function StepVisualizer({ steps, currentIndex, onNavigate }: Props) {
  const step = steps[currentIndex]
  const total = steps.length

  // Auto-play
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1500) // ms entre étapes
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }
    if (currentIndex >= total - 1) {
      setPlaying(false)
      return
    }
    timerRef.current = setTimeout(() => {
      onNavigate(currentIndex + 1)
    }, speed)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [playing, currentIndex, speed, total, onNavigate])

  const togglePlay = () => {
    if (currentIndex >= total - 1) {
      onNavigate(0)
      setPlaying(true)
    } else {
      setPlaying((p) => !p)
    }
  }

  const color = STEP_COLORS[step.id] ?? 'bg-gray-800 border-gray-600 text-gray-200'

  // Mémorisation de l'étape précédente pour les animations diff
  const prevStepRef = useRef<QueryStep | null>(null)
  const prevStep = prevStepRef.current
  useEffect(() => {
    prevStepRef.current = step
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Panneau sous-requête (si présent) */}
      {step.subquery_steps && step.subquery_steps.length > 0 && (
        <SubqueryPanel steps={step.subquery_steps} />
      )}

      {/* Navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => { setPlaying(false); onNavigate(currentIndex - 1) }}
          disabled={currentIndex === 0}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm rounded"
        >
          ← Précédent
        </button>

        {/* Indicateurs */}
        <div className="flex gap-1.5">
          {steps.map((s, i) => (
            <button
              key={`${s.id}-${i}`}
              onClick={() => { setPlaying(false); onNavigate(i) }}
              title={s.label}
              className={`w-7 h-7 rounded text-xs font-bold transition-all ${
                i === currentIndex
                  ? 'bg-blue-500 text-white scale-110'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setPlaying(false); onNavigate(currentIndex + 1) }}
          disabled={currentIndex === total - 1}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm rounded"
        >
          Suivant →
        </button>

        {/* Auto-play */}
        <div className="ml-auto flex items-center gap-2">
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="bg-gray-700 text-gray-200 text-xs rounded px-2 py-1 border border-gray-600"
          >
            <option value={500}>Rapide</option>
            <option value={1500}>Normal</option>
            <option value={3000}>Lent</option>
          </select>
          <button
            onClick={togglePlay}
            className={`px-3 py-1.5 text-sm rounded font-medium ${
              playing
                ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                : 'bg-gray-600 hover:bg-gray-500 text-white'
            }`}
          >
            {playing ? '⏸ Pause' : '▶ Lecture auto'}
          </button>
        </div>

        <span className="text-xs text-gray-500 w-12 text-right">
          {currentIndex + 1} / {total}
        </span>
      </div>

      {/* Explication */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id + currentIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className={`border rounded px-4 py-3 ${color}`}
        >
          <span className="text-xs uppercase font-bold opacity-70 block mb-1">
            Étape {currentIndex + 1} — {step.label}
          </span>
          <p className="text-sm">{step.explanation}</p>
        </motion.div>
      </AnimatePresence>

      {/* Résultat intermédiaire — pas de remontage pour préserver les animations layout */}
      <div className="bg-gray-800 rounded border border-gray-700 p-3">
        <p className="text-xs text-gray-500 uppercase font-semibold mb-2">
          Résultat intermédiaire
        </p>
        <AnimatedResultTable
          columns={step.columns}
          rows={step.rows}
          prevRows={prevStep?.rows ?? []}
          prevColumns={prevStep?.columns ?? []}
          stepId={step.id}
        />
      </div>
    </div>
  )
}

// ── Panneau secondaire pour les sous-requêtes ────────────────────────────────
function SubqueryPanel({ steps }: { steps: QueryStep[] }) {
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(true)
  const step = steps[index]

  return (
    <div className="border border-teal-700 rounded bg-teal-950/40">
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-teal-300 text-sm font-semibold">↪ Sous-requête</span>
          <span className="text-teal-500 text-xs">s'exécute en premier</span>
        </div>
        <span className="text-teal-400 text-xs">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          {/* Navigation sous-requête */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="px-2 py-1 bg-teal-800 hover:bg-teal-700 disabled:opacity-30 text-white text-xs rounded"
            >
              ←
            </button>
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={`w-6 h-6 rounded text-xs font-bold ${
                    i === index ? 'bg-teal-500 text-white' : 'bg-teal-800 text-teal-300'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
              disabled={index === steps.length - 1}
              className="px-2 py-1 bg-teal-800 hover:bg-teal-700 disabled:opacity-30 text-white text-xs rounded"
            >
              →
            </button>
            <span className="text-xs text-teal-500 ml-1">{index + 1}/{steps.length}</span>
          </div>

          <div className="bg-teal-900/40 border border-teal-700 rounded px-3 py-2 text-teal-200 text-sm">
            <span className="text-xs uppercase font-bold opacity-70 block mb-1">{step.label}</span>
            {step.explanation}
          </div>

          <div className="bg-gray-800 rounded border border-gray-700 p-2">
            <AnimatedResultTable
              columns={step.columns}
              rows={step.rows}
              prevRows={[]}
              prevColumns={[]}
              stepId={step.id}
            />
          </div>
        </div>
      )}
    </div>
  )
}
