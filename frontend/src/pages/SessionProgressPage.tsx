import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSessionProgress, getApprenantAttempts } from '../api/client'
import type { ApprenantProgress, AttemptRecord } from '../api/client'
import { useAuthStore } from '../store/authStore'

const STATUS_ICON: Record<string, string> = {
  reussi: '●',
  reussi_avec_indices: '◕',
  en_cours: '◑',
  non_commence: '○',
}

const STATUS_COLOR: Record<string, string> = {
  reussi: 'text-green-400',
  reussi_avec_indices: 'text-yellow-400',
  en_cours: 'text-blue-400',
  non_commence: 'text-gray-600',
}

function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{percentage}%</span>
    </div>
  )
}

function AttemptsModal({
  apprenantId,
  exerciseId,
  slotId,
  pseudo,
  token,
  onClose,
}: {
  apprenantId: number
  exerciseId: string
  slotId: string
  pseudo: string
  token: string
  onClose: () => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['attempts', apprenantId, exerciseId, slotId],
    queryFn: () => getApprenantAttempts(apprenantId, exerciseId, slotId, token),
  })

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <h3 className="font-semibold text-white">Tentatives — {pseudo}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Exercice : {exerciseId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {isLoading && <p className="text-gray-500 text-sm text-center py-4">Chargement…</p>}
          {!isLoading && (!data?.attempts.length) && (
            <p className="text-gray-500 text-sm text-center py-4">Aucune tentative enregistrée.</p>
          )}
          {data?.attempts.map((a: AttemptRecord, i: number) => (
            <div
              key={i}
              className={`rounded border p-3 ${a.success ? 'border-green-700 bg-green-950/40' : 'border-gray-700 bg-gray-800'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${a.success ? 'text-green-400' : 'text-red-400'}`}>
                  {a.success ? '✓ Succès' : '✗ Échec'}
                </span>
                <span className="text-xs text-gray-500">{a.submitted_at.replace('T', ' ').slice(0, 19)}</span>
              </div>
              <pre className="text-xs text-gray-300 bg-gray-900 rounded px-3 py-2 overflow-x-auto whitespace-pre-wrap">
                {a.query}
              </pre>
              {a.feedback && (
                <p className="text-xs text-gray-400 mt-2">{a.feedback}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ApprenantRow({
  apprenant,
  slotId,
  token,
  exerciseIds,
}: {
  apprenant: ApprenantProgress
  slotId: string
  token: string
  exerciseIds: string[]
}) {
  const [expanded, setExpanded] = useState(false)
  const [modal, setModal] = useState<{ exerciseId: string } | null>(null)

  const isStuck =
    apprenant.summary.percentage < 100 &&
    apprenant.summary.in_progress > 0 &&
    apprenant.summary.completed > 0

  return (
    <>
      {modal && (
        <AttemptsModal
          apprenantId={apprenant.id}
          exerciseId={modal.exerciseId}
          slotId={slotId}
          pseudo={apprenant.pseudo}
          token={token}
          onClose={() => setModal(null)}
        />
      )}
      <div
        className={`bg-gray-800 rounded-lg border ${isStuck ? 'border-orange-700' : 'border-gray-700'} p-4`}
      >
        <div
          className="flex items-center gap-4 cursor-pointer"
          onClick={() => setExpanded((e) => !e)}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-white">{apprenant.pseudo}</span>
              {isStuck && (
                <span className="text-xs bg-orange-900/50 text-orange-300 border border-orange-700 rounded px-2 py-0.5">
                  bloqué
                </span>
              )}
            </div>
            <ProgressBar percentage={apprenant.summary.percentage} />
          </div>
          <div className="text-right text-xs text-gray-400 shrink-0">
            <div>{apprenant.summary.completed}/{apprenant.summary.total} faits</div>
            {apprenant.summary.in_progress > 0 && (
              <div className="text-blue-400">{apprenant.summary.in_progress} en cours</div>
            )}
          </div>
          <span className="text-gray-500 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {exerciseIds.map((eid) => {
                const status = apprenant.statuses[eid] ?? 'non_commence'
                return (
                  <button
                    key={eid}
                    onClick={(e) => { e.stopPropagation(); setModal({ exerciseId: eid }) }}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-left hover:bg-gray-700 transition-colors ${
                      status === 'en_cours' ? 'bg-blue-950/50 border border-blue-700' : 'bg-gray-750'
                    }`}
                    title="Voir les tentatives"
                  >
                    <span className={STATUS_COLOR[status]}>{STATUS_ICON[status]}</span>
                    <span className="text-gray-300 truncate">{eid}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export function SessionProgressPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const token = user?.token ?? ''

  const { data, isLoading, error } = useQuery({
    queryKey: ['session-progress', sessionId],
    queryFn: () => getSessionProgress(Number(sessionId), token),
    refetchInterval: 30_000,
  })

  // Collecte tous les exercise IDs dans l'ordre
  const exerciseIds: string[] = []
  if (data) {
    try {
      // On ne peut pas accéder au notebook ici directement, on collecte depuis les statuts
      const allIds = new Set<string>()
      data.apprenants.forEach((a) => Object.keys(a.statuses).forEach((id) => allIds.add(id)))
      exerciseIds.push(...Array.from(allIds).sort())
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="px-6 py-3 border-b border-gray-700 flex items-center gap-4">
        <h1 className="font-bold text-white">oak<span className="text-blue-400">DB</span></h1>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Dashboard
        </button>
        {data && (
          <span className="text-gray-300 text-sm font-medium">{data.session.nom}</span>
        )}
        <span className="ml-auto text-xs text-gray-600">Actualisation auto toutes les 30s</span>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {isLoading && (
          <p className="text-gray-500 text-center py-12">Chargement…</p>
        )}
        {error && (
          <p className="text-red-400 text-center py-12">Erreur de chargement.</p>
        )}

        {data && (
          <>
            {/* Résumé session */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">{data.session.nom}</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Code : <span className="font-mono font-bold text-blue-400">{data.session.code}</span>
                    {' · '}Slot : {data.session.slot_id}
                    {' · '}{data.total_exercises} exercice{data.total_exercises !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">{data.apprenants.length}</p>
                  <p className="text-xs text-gray-400">apprenant{data.apprenants.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {data.apprenants.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {(() => {
                    const avg = Math.round(
                      data.apprenants.reduce((s, a) => s + a.summary.percentage, 0) /
                        data.apprenants.length
                    )
                    const stuck = data.apprenants.filter(
                      (a) => a.summary.in_progress > 0 && a.summary.percentage < 100
                    ).length
                    const done = data.apprenants.filter(
                      (a) => a.summary.percentage === 100
                    ).length
                    return (
                      <>
                        <div className="bg-gray-700/50 rounded p-3 text-center">
                          <p className="text-xl font-bold text-blue-400">{avg}%</p>
                          <p className="text-xs text-gray-400">progression moyenne</p>
                        </div>
                        <div className="bg-gray-700/50 rounded p-3 text-center">
                          <p className="text-xl font-bold text-green-400">{done}</p>
                          <p className="text-xs text-gray-400">ont terminé</p>
                        </div>
                        <div className="bg-gray-700/50 rounded p-3 text-center">
                          <p className="text-xl font-bold text-orange-400">{stuck}</p>
                          <p className="text-xs text-gray-400">bloqué{stuck !== 1 ? 's' : ''}</p>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* Liste des apprenants */}
            {data.apprenants.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun apprenant n'a encore rejoint cette session.</p>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                  Apprenants ({data.apprenants.length})
                </h3>
                {data.apprenants
                  .slice()
                  .sort((a, b) => b.summary.percentage - a.summary.percentage)
                  .map((apprenant) => (
                    <ApprenantRow
                      key={apprenant.id}
                      apprenant={apprenant}
                      slotId={data.session.slot_id}
                      token={token}
                      exerciseIds={exerciseIds}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
