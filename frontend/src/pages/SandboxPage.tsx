import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { SqlEditor } from '../components/SqlEditor'
import { ResultTable } from '../components/ResultTable'
import { SchemaPanel } from '../components/SchemaPanel'
import { listSlots, getSchema, createSandboxSession, executeSandbox, resetSandboxSession } from '../api/client'
import type { QueryResult, SlotInfo } from '../api/client'

export function SandboxPage() {
  const navigate = useNavigate()
  const [activeSlotId, setActiveSlotId] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sql, setSql] = useState('-- Bac à sable : toutes les requêtes SQL sont autorisées\n-- INSERT, UPDATE, DELETE, CREATE TABLE...\n-- Les modifications sont perdues au rechargement de la page.\n\nSELECT * FROM clients LIMIT 10')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const { data: slots = [] } = useQuery<SlotInfo[]>({
    queryKey: ['slots'],
    queryFn: listSlots,
  })

  const { data: schema = [], isLoading: schemaLoading } = useQuery({
    queryKey: ['schema', activeSlotId],
    queryFn: () => getSchema(activeSlotId),
    enabled: activeSlotId !== '',
  })

  // Initialise slot + session
  useEffect(() => {
    if (slots.length > 0 && activeSlotId === '') {
      setActiveSlotId(slots[0].id)
    }
  }, [slots, activeSlotId])

  useEffect(() => {
    if (!activeSlotId) return
    initSession(activeSlotId)
  }, [activeSlotId])

  async function initSession(slotId: string) {
    try {
      const data = await createSandboxSession(slotId)
      setSessionId(data.session_id)
      setResult(null)
      setError(null)
    } catch (e) {
      setError('Impossible de créer la session bac à sable.')
    }
  }

  async function handleExecute() {
    if (!sessionId || !activeSlotId) return
    setLoading(true)
    setError(null)
    try {
      const data = await executeSandbox(activeSlotId, sessionId, sql)
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleReset() {
    if (!sessionId || !activeSlotId) return
    setResetting(true)
    try {
      const data = await resetSandboxSession(activeSlotId, sessionId)
      setSessionId(data.session_id)
      setResult(null)
      setError(null)
    } catch {
      setError('Impossible de réinitialiser.')
    } finally {
      setResetting(false)
    }
  }

  function handleSlotChange(slotId: string) {
    setActiveSlotId(slotId)
    setSessionId(null)
    setResult(null)
    setError(null)
  }

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* Schéma */}
      <aside className="w-64 flex-shrink-0 border-r border-gray-700 overflow-y-auto">
        <SchemaPanel tables={schema} loading={schemaLoading} />
      </aside>

      <main className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="px-4 py-3 border-b border-gray-700 flex items-center gap-3 flex-wrap">
          <h1 className="text-lg font-bold text-white">
            oak<span className="text-blue-400">DB</span>
          </h1>
          <span className="text-yellow-400 text-sm font-medium">⚗ Bac à sable</span>

          {slots.length > 0 && (
            <select
              value={activeSlotId}
              onChange={(e) => handleSlotChange(e.target.value)}
              className="bg-gray-800 border border-gray-600 text-gray-200 text-sm rounded px-2 py-1"
            >
              {slots.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={handleReset}
            disabled={resetting || !sessionId}
            className="px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-white text-sm rounded"
          >
            {resetting ? 'Réinitialisation...' : '↺ Réinitialiser la base'}
          </button>

          <div className="ml-auto flex gap-2">
            <button onClick={() => navigate('/')} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-sm rounded">
              Éditeur
            </button>
          </div>
        </header>

        {/* Notice */}
        <div className="px-4 py-2 bg-yellow-950/40 border-b border-yellow-800/50 text-yellow-300 text-xs flex items-center gap-2">
          <span>⚠</span>
          <span>
            Les modifications (INSERT, UPDATE, DELETE) sont <strong>éphémères</strong> — elles disparaissent au rechargement de la page ou en cliquant "Réinitialiser".
          </span>
        </div>

        {/* Éditeur */}
        <div className="border-b border-gray-700">
          <SqlEditor
            value={sql}
            onChange={(v) => setSql(v)}
            onExecute={handleExecute}
          />
          <div className="px-4 py-2 flex items-center gap-3 bg-gray-800">
            <button
              onClick={handleExecute}
              disabled={loading || !sessionId}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded font-medium"
            >
              {loading ? 'Exécution...' : 'Exécuter'}
            </button>
            <span className="text-gray-500 text-xs">Ctrl+Entrée pour exécuter • INSERT, UPDATE, DELETE autorisés</span>
          </div>
        </div>

        {/* Résultat */}
        <div className="flex-1 overflow-auto p-4">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-700 rounded text-red-300 text-sm">
              {error}
            </div>
          )}
          {result && <ResultTable columns={result.columns} rows={result.rows} />}
          {!result && !error && (
            <p className="text-gray-600 text-sm text-center mt-8">
              Écrivez une requête SQL et appuyez sur Exécuter.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
