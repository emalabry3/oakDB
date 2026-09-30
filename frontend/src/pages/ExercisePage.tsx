import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import type { Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { getNotebook, getSchema, validateExercise, getSteps, executeQuery } from '../api/client'
import type { Exercise, QueryResult } from '../api/client'
import { SqlEditor } from '../components/SqlEditor'
import { SchemaPanel } from '../components/SchemaPanel'
import { StepVisualizer } from '../components/StepVisualizer'
import { ResultTable } from '../components/ResultTable'
import type { QueryStep } from '../api/client'
import { useAuthStore } from '../store/authStore'

export function ExercisePage() {
  const { slotId = 'boutique-v1', exerciseId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore(s => s.user)

  const [sql, setSql] = useState('')
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [vizSteps, setVizSteps] = useState<QueryStep[] | null>(null)
  const [vizIndex, setVizIndex] = useState(0)

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const decorationsRef = useRef<string[]>([])

  // Charger le notebook pour trouver l'exercice courant et les suivants
  const { data: notebook } = useQuery({
    queryKey: ['notebook', slotId],
    queryFn: () => getNotebook(slotId),
  })

  const { data: schema = [], isLoading: schemaLoading } = useQuery({
    queryKey: ['schema', slotId],
    queryFn: () => getSchema(slotId),
  })

  // Trouver l'exercice courant
  const exercise: Exercise | undefined = notebook?.chapters
    .flatMap(ch => ch.lessons.flatMap(le => le.exercises))
    .find(ex => ex.id === exerciseId)

  // Navigation : exercice précédent / suivant
  const allExercises = notebook?.chapters.flatMap(ch => ch.lessons.flatMap(le => le.exercises)) ?? []
  const currentIdx = allExercises.findIndex(ex => ex.id === exerciseId)
  const prevEx = currentIdx > 0 ? allExercises[currentIdx - 1] : null
  const nextEx = currentIdx < allExercises.length - 1 ? allExercises[currentIdx + 1] : null

  // Validation + exécution séquentielles (même connexion DuckDB partagée)
  const validateMutation = useMutation({
    mutationFn: async () => {
      const validation = await validateExercise(slotId, exerciseId, sql, hintsRevealed > 0, user?.token)
      const result = await executeQuery(sql, slotId).catch(() => null)
      return { validation, result }
    },
    onSuccess: ({ validation, result }) => {
      setFeedback({ success: validation.success, message: validation.feedback })
      setQueryResult(result)
      if (validation.success) {
        queryClient.invalidateQueries({ queryKey: ['progress', slotId] })
      }
    },
  })

  // Visualisation
  const vizMutation = useMutation({
    mutationFn: () => getSteps(sql, slotId),
    onSuccess: (steps) => {
      setVizSteps(steps)
      setVizIndex(0)
      if (steps.length > 0) highlightClause(steps[0].highlight_start, steps[0].highlight_end)
    },
  })

  const highlightClause = (start: number, end: number) => {
    if (!editorRef.current || !monacoRef.current) return
    const model = editorRef.current.getModel()
    if (!model) return
    const startPos = model.getPositionAt(start)
    const endPos = model.getPositionAt(end)
    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      [{ range: new monacoRef.current.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
         options: { inlineClassName: 'sql-clause-highlight' } }]
    )
  }

  const handleNavigate = (index: number) => {
    if (!vizSteps) return
    setVizIndex(index)
    highlightClause(vizSteps[index].highlight_start, vizSteps[index].highlight_end)
  }

  if (!exercise) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-400">
        Exercice introuvable.
      </div>
    )
  }

  const hints = exercise.hints ?? []

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* Schéma */}
      <aside className="w-56 flex-shrink-0 border-r border-gray-700 overflow-y-auto">
        <SchemaPanel tables={schema} loading={schemaLoading} />
      </aside>

      {/* Zone principale */}
      <main className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="px-4 py-2 border-b border-gray-700 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => navigate(`/notebook/${slotId}`)} className="text-gray-400 hover:text-white text-sm">
            ← Cahier
          </button>
          <span className="text-gray-600">|</span>
          <span className="text-sm text-gray-300 font-medium">{exercise.title}</span>
          <div className="ml-auto flex gap-2">
            {prevEx && (
              <button onClick={() => { navigate(`/notebook/${slotId}/exercise/${prevEx.id}`); setFeedback(null); setQueryResult(null); setHintsRevealed(0); setSql(''); setVizSteps(null) }}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-sm rounded">← Précédent</button>
            )}
            {nextEx && (
              <button onClick={() => { navigate(`/notebook/${slotId}/exercise/${nextEx.id}`); setFeedback(null); setQueryResult(null); setHintsRevealed(0); setSql(''); setVizSteps(null) }}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-sm rounded">Suivant →</button>
            )}
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Énoncé + indices */}
          <div className="w-72 flex-shrink-0 border-r border-gray-700 overflow-y-auto p-4 flex flex-col gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="font-semibold text-white mb-2">{exercise.title}</h2>
              <p className="text-sm text-gray-300 leading-relaxed">{exercise.statement}</p>
            </div>

            {/* Indices */}
            {hints.length > 0 && (
              <div className="space-y-2">
                {hints.slice(0, hintsRevealed).map((hint, i) => (
                  <div key={i} className="bg-yellow-900/30 border border-yellow-700/50 rounded p-3 text-sm text-yellow-200">
                    <span className="text-xs font-bold text-yellow-500 block mb-1">Indice {i + 1}</span>
                    {hint}
                  </div>
                ))}
                {hintsRevealed < hints.length && (
                  <button
                    onClick={() => setHintsRevealed(h => h + 1)}
                    className="w-full py-2 border border-yellow-700/50 hover:border-yellow-600 text-yellow-500 hover:text-yellow-400 text-sm rounded transition-colors"
                  >
                    Afficher un indice ({hintsRevealed}/{hints.length})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Éditeur + résultat */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Éditeur */}
            <div className="border-b border-gray-700 flex-shrink-0">
              <SqlEditor
                value={sql}
                onChange={setSql}
                onExecute={() => validateMutation.mutate()}
                onMount={(ed, monaco) => { editorRef.current = ed; monacoRef.current = monaco }}
              />
              <div className="px-4 py-2 flex items-center gap-3 bg-gray-800">
                <button
                  onClick={() => validateMutation.mutate()}
                  disabled={validateMutation.isPending || !sql.trim()}
                  className="px-4 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm rounded font-medium"
                >
                  {validateMutation.isPending ? 'Vérification...' : 'Vérifier'}
                </button>
                <button
                  onClick={() => vizMutation.mutate()}
                  disabled={vizMutation.isPending || !sql.trim()}
                  className="px-4 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm rounded font-medium"
                >
                  {vizMutation.isPending ? 'Analyse...' : '▶ Visualiser'}
                </button>
                <span className="text-xs text-gray-500">Ctrl+Entrée pour vérifier</span>
              </div>
            </div>

            {/* Feedback */}
            {feedback && (
              <div className={`px-4 py-3 flex-shrink-0 border-b border-gray-700 flex items-center gap-3 ${
                feedback.success
                  ? 'bg-green-900/40 border-l-4 border-l-green-500 text-green-300'
                  : 'bg-orange-900/40 border-l-4 border-l-orange-500 text-orange-300'
              }`}>
                <span className="text-lg">{feedback.success ? '✓' : '✗'}</span>
                <span className="text-sm">{feedback.message}</span>
              </div>
            )}

            {/* Résultat de la requête */}
            {queryResult && !vizSteps && (
              <div className="flex-shrink-0 border-b border-gray-700 overflow-x-auto px-4 py-3 max-h-64 overflow-y-auto">
                <ResultTable columns={queryResult.columns} rows={queryResult.rows} />
              </div>
            )}

            {/* Visualisation */}
            <div className="flex-1 overflow-auto p-4">
              {vizSteps ? (
                <StepVisualizer
                  steps={vizSteps}
                  currentIndex={vizIndex}
                  onNavigate={handleNavigate}
                />
              ) : (
                !queryResult && (
                  <p className="text-gray-600 text-sm text-center mt-8">
                    Écrivez votre requête SQL et cliquez sur Vérifier.
                  </p>
                )
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
