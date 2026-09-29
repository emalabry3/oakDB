import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import type { Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { SqlEditor } from './components/SqlEditor'
import { ResultTable } from './components/ResultTable'
import { SchemaPanel } from './components/SchemaPanel'
import { DataModelModal } from './components/DataModelModal'
import { StepVisualizer } from './components/StepVisualizer'
import { executeQuery, getSchema, getSteps, listSlots } from './api/client'
import type { QueryResult, QueryStep, SlotInfo } from './api/client'
import { NotebookPage } from './pages/NotebookPage'
import { ExercisePage } from './pages/ExercisePage'
import { LoginPage } from './pages/LoginPage'
import { JoinPage } from './pages/JoinPage'
import { DashboardPage } from './pages/DashboardPage'
import { SessionProgressPage } from './pages/SessionProgressPage'
import { SandboxPage } from './pages/SandboxPage'
import { useAuthStore } from './store/authStore'

function RequireAuth({ children, role }: { children: React.ReactNode; role?: string }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return <>{children}</>
}

function EditorLayout() {
  const [sql, setSql] = useState('SELECT * FROM clients')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [activeSlotId, setActiveSlotId] = useState('')
  const [showDataModel, setShowDataModel] = useState(false)

  // Visualisation
  const [vizSteps, setVizSteps] = useState<QueryStep[] | null>(null)
  const [vizIndex, setVizIndex] = useState(0)
  const [vizError, setVizError] = useState<string | null>(null)

  // Monaco refs pour le surlignage
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const decorationsRef = useRef<string[]>([])

  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  const { data: slots = [] } = useQuery<SlotInfo[]>({
    queryKey: ['slots'],
    queryFn: listSlots,
  })

  // Initialise le slot actif au premier chargement
  useEffect(() => {
    if (slots.length > 0 && activeSlotId === '') {
      setActiveSlotId(slots[0].id)
    }
  }, [slots, activeSlotId])

  const { data: schema = [], isLoading: schemaLoading } = useQuery({
    queryKey: ['schema', activeSlotId],
    queryFn: () => getSchema(activeSlotId),
    enabled: activeSlotId !== '',
  })

  // ── Exécution directe ───────────────────────────────────────────────────
  const execMutation = useMutation({
    mutationFn: (query: string) => executeQuery(query, activeSlotId),
    onSuccess: (data) => {
      setResult(data)
      setQueryError(null)
      setVizSteps(null)
      clearHighlight()
    },
    onError: (e: Error) => {
      setQueryError(e.message)
      setResult(null)
    },
  })

  // ── Visualisation pas-à-pas ──────────────────────────────────────────────
  const vizMutation = useMutation({
    mutationFn: (query: string) => getSteps(query, activeSlotId),
    onSuccess: (steps) => {
      setVizSteps(steps)
      setVizIndex(0)
      setVizError(null)
      setResult(null)
      setQueryError(null)
      if (steps.length > 0) {
        highlightClause(steps[0].highlight_start, steps[0].highlight_end)
      }
    },
    onError: (e: Error) => {
      setVizError(e.message)
      setVizSteps(null)
    },
  })

  const handleExecute = () => execMutation.mutate(sql)
  const handleVisualize = () => vizMutation.mutate(sql)

  // ── Navigation entre étapes ──────────────────────────────────────────────
  const handleNavigate = (index: number) => {
    if (!vizSteps) return
    setVizIndex(index)
    highlightClause(vizSteps[index].highlight_start, vizSteps[index].highlight_end)
  }

  // ── Surlignage Monaco ────────────────────────────────────────────────────
  const highlightClause = (start: number, end: number) => {
    if (!editorRef.current || !monacoRef.current) return
    const model = editorRef.current.getModel()
    if (!model) return

    const startPos = model.getPositionAt(start)
    const endPos = model.getPositionAt(end)

    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      [{
        range: new monacoRef.current.Range(
          startPos.lineNumber, startPos.column,
          endPos.lineNumber, endPos.column
        ),
        options: { inlineClassName: 'sql-clause-highlight' },
      }]
    )
  }

  const clearHighlight = () => {
    if (!editorRef.current) return
    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, [])
  }

  const handleEditorMount = (ed: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = ed
    monacoRef.current = monaco
  }

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* Panneau schéma */}
      <aside className="w-64 flex-shrink-0 border-r border-gray-700 overflow-y-auto">
        <SchemaPanel tables={schema} loading={schemaLoading} />
      </aside>

      {/* Zone principale */}
      <main className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="px-4 py-3 border-b border-gray-700 flex items-center gap-3">
          <h1 className="text-lg font-bold text-white">
            oak<span className="text-blue-400">DB</span>
          </h1>
          <span className="text-gray-500 text-sm">
            {slots.find(s => s.id === activeSlotId)?.name ?? 'Chargement...'}
          </span>
          {slots.length > 1 && (
            <select
              value={activeSlotId}
              onChange={(e) => setActiveSlotId(e.target.value)}
              className="bg-gray-800 border border-gray-600 text-gray-200 text-sm rounded px-2 py-1"
            >
              {slots.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowDataModel(true)}
            className="px-3 py-1 bg-teal-700 hover:bg-teal-600 text-white text-sm rounded"
            title="Afficher le modèle de données"
          >
            Modèle
          </button>
          <button
            onClick={() => navigate(`/notebook/${activeSlotId}`)}
            className="px-3 py-1 bg-indigo-700 hover:bg-indigo-600 text-white text-sm rounded"
          >
            Cahier
          </button>
          <button
            onClick={() => navigate('/sandbox')}
            className="px-3 py-1 bg-yellow-700 hover:bg-yellow-600 text-white text-sm rounded"
          >
            ⚗ Bac à sable
          </button>
          {user ? (
            <div className="ml-auto flex items-center gap-3">
              {user.role === 'formateur' && (
                <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-400 hover:text-white">Dashboard</button>
              )}
              <span className="text-xs text-gray-500">{user.login ?? user.pseudo}</span>
              <button onClick={() => { logout(); navigate('/login') }}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-xs rounded">
                Déconnexion
              </button>
            </div>
          ) : (
            <div className="ml-auto flex gap-2">
              <button onClick={() => navigate('/login')} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-sm rounded">Formateur</button>
              <button onClick={() => navigate('/join')} className="px-3 py-1 bg-green-800 hover:bg-green-700 text-sm rounded">Rejoindre</button>
            </div>
          )}
        </header>

        {/* Éditeur */}
        <div className="border-b border-gray-700">
          <SqlEditor
            value={sql}
            onChange={(v) => { setSql(v); clearHighlight() }}
            onExecute={handleExecute}
            onMount={handleEditorMount}
          />
          <div className="px-4 py-2 flex items-center gap-3 bg-gray-800">
            <button
              onClick={handleExecute}
              disabled={execMutation.isPending}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded font-medium"
            >
              {execMutation.isPending ? 'Exécution...' : 'Exécuter'}
            </button>
            <button
              onClick={handleVisualize}
              disabled={vizMutation.isPending}
              className="px-4 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm rounded font-medium"
            >
              {vizMutation.isPending ? 'Analyse...' : '▶ Visualiser pas-à-pas'}
            </button>
            <span className="text-gray-500 text-xs">Ctrl+Entrée pour exécuter</span>
          </div>
        </div>

        {/* Zone résultat */}
        <div className="flex-1 overflow-auto p-4">
          {/* Erreurs */}
          {(queryError || vizError) && (
            <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-700 rounded text-red-300 text-sm">
              {queryError ?? vizError}
            </div>
          )}

          {/* Visualisation pas-à-pas */}
          {vizSteps && (
            <StepVisualizer
              steps={vizSteps}
              currentIndex={vizIndex}
              onNavigate={handleNavigate}
            />
          )}

          {/* Résultat direct */}
          {result && !vizSteps && (
            <ResultTable columns={result.columns} rows={result.rows} />
          )}

          {/* État initial */}
          {!result && !vizSteps && !queryError && !vizError && (
            <p className="text-gray-600 text-sm text-center mt-8">
              Écrivez une requête SQL et appuyez sur Exécuter ou Visualiser.
            </p>
          )}
        </div>
      </main>

      {showDataModel && (
        <DataModelModal tables={schema} onClose={() => setShowDataModel(false)} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EditorLayout />} />
      <Route path="/notebook/:slotId" element={<NotebookPage />} />
      <Route path="/notebook/:slotId/exercise/:exerciseId" element={<ExercisePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/dashboard" element={<RequireAuth role="formateur"><DashboardPage /></RequireAuth>} />
      <Route path="/sessions/:sessionId/progress" element={<RequireAuth role="formateur"><SessionProgressPage /></RequireAuth>} />
      <Route path="/sandbox" element={<SandboxPage />} />
    </Routes>
  )
}
