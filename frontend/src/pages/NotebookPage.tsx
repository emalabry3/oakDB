import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getNotebook, getProgress } from '../api/client'
import { useAuthStore } from '../store/authStore'

const STATUS_STYLES: Record<string, string> = {
  non_commence:        'text-gray-500',
  en_cours:            'text-yellow-400',
  reussi:              'text-green-400',
  reussi_avec_indices: 'text-green-300',
}

const STATUS_ICON: Record<string, string> = {
  non_commence:        '○',
  en_cours:            '◑',
  reussi:              '●',
  reussi_avec_indices: '●',
}

const STATUS_LABEL: Record<string, string> = {
  non_commence:        'Non commencé',
  en_cours:            'En cours',
  reussi:              'Réussi',
  reussi_avec_indices: 'Réussi (avec indices)',
}

export function NotebookPage() {
  const { slotId = 'boutique-v1' } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  const { data: notebook, isLoading: nbLoading } = useQuery({
    queryKey: ['notebook', slotId],
    queryFn: () => getNotebook(slotId),
  })

  const { data: progress = {} } = useQuery({
    queryKey: ['progress', slotId, user?.token],
    queryFn: () => getProgress(slotId, user?.token),
    refetchInterval: 5000,
  })

  if (nbLoading) return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-400">
      Chargement du cahier...
    </div>
  )

  if (!notebook) return null

  // Calcul progression globale
  const allExercises = notebook.chapters.flatMap(ch =>
    ch.lessons.flatMap(le => le.exercises)
  )
  const done = allExercises.filter(ex =>
    progress[ex.id] === 'reussi' || progress[ex.id] === 'reussi_avec_indices'
  ).length
  const pct = allExercises.length > 0 ? Math.round((done / allExercises.length) * 100) : 0

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="px-6 py-3 border-b border-gray-700 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-white text-sm"
        >
          ← Éditeur
        </button>
        <h1 className="font-bold text-white">
          oak<span className="text-blue-400">DB</span>
          <span className="text-gray-400 font-normal ml-2 text-sm">— {notebook.title}</span>
        </h1>
        <div className="ml-auto flex items-center gap-3">
          {user?.role === 'apprenant' && user.pseudo && (
            <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 rounded px-2 py-1">
              {user.pseudo}
              {user.session_code && (
                <span className="ml-1 font-mono text-blue-400">{user.session_code}</span>
              )}
            </span>
          )}
          <span className="text-sm text-gray-400">{done}/{allExercises.length} exercices</span>
          <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-green-400">{pct}%</span>
        </div>
      </header>

      {/* Contenu */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {notebook.chapters.map(chapter => {
            const chExs = chapter.lessons.flatMap(le => le.exercises)
            const chDone = chExs.filter(ex =>
              progress[ex.id] === 'reussi' || progress[ex.id] === 'reussi_avec_indices'
            ).length
            const chPct = chExs.length > 0 ? Math.round((chDone / chExs.length) * 100) : 0

            return (
              <div key={chapter.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                {/* Header chapitre */}
                <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-white">{chapter.title}</h2>
                    <p className="text-sm text-gray-400 mt-0.5">{chapter.description}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${chPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-10 text-right">{chDone}/{chExs.length}</span>
                  </div>
                </div>

                {/* Liste des exercices */}
                <div className="divide-y divide-gray-700/50">
                  {chapter.lessons.flatMap(le => le.exercises).map(ex => {
                    const status = progress[ex.id] ?? 'non_commence'
                    return (
                      <button
                        key={ex.id}
                        onClick={() => navigate(`/notebook/${slotId}/exercise/${ex.id}`)}
                        className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-gray-700/50 text-left transition-colors"
                      >
                        <span className={`text-lg w-5 ${STATUS_STYLES[status]}`}>
                          {STATUS_ICON[status]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-200">{ex.title}</span>
                        </div>
                        <span className={`text-xs ${STATUS_STYLES[status]}`}>
                          {STATUS_LABEL[status]}
                        </span>
                        <span className="text-gray-500 text-sm">→</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
