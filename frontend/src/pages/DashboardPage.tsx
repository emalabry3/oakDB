import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listSessions, createSession, listSlots } from '../api/client'
import { useAuthStore } from '../store/authStore'

export function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const qc = useQueryClient()
  const token = user?.token ?? ''

  const [nom, setNom] = useState('')
  const [slotId, setSlotId] = useState('')

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => listSessions(token),
  })

  const { data: slots = [] } = useQuery({
    queryKey: ['slots'],
    queryFn: () => listSlots(),
  })

  const createMutation = useMutation({
    mutationFn: () => createSession(nom, slotId || slots[0]?.id, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      setNom('')
    },
  })

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="px-6 py-3 border-b border-gray-700 flex items-center gap-4">
        <h1 className="font-bold text-white">oak<span className="text-blue-400">DB</span></h1>
        <span className="text-gray-400 text-sm">Dashboard formateur</span>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-white">Éditeur</button>
          <span className="text-gray-600 text-sm">{user?.login}</span>
          <button onClick={() => { logout(); navigate('/login') }}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-sm rounded">
            Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-8">
        {/* Créer une session */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="font-semibold text-white mb-4">Créer une session</h2>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }} className="flex gap-3">
            <input
              value={nom}
              onChange={e => setNom(e.target.value)}
              placeholder="Nom de la session (ex: Formation SQL — Oct 2026)"
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <select
              value={slotId}
              onChange={e => setSlotId(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
            >
              {slots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button
              type="submit"
              disabled={createMutation.isPending || !nom.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded font-medium"
            >
              Créer
            </button>
          </form>
        </div>

        {/* Liste des sessions */}
        <div className="space-y-3">
          <h2 className="font-semibold text-white">Sessions</h2>
          {sessions.length === 0 && (
            <p className="text-gray-500 text-sm">Aucune session créée.</p>
          )}
          {sessions.map((s: any) => (
            <div key={s.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full ${s.actif ? 'bg-green-400' : 'bg-gray-600'}`} />
              <div className="flex-1">
                <p className="font-medium text-white">{s.nom}</p>
                <p className="text-xs text-gray-400">{s.slot_id} — créée le {s.created_at.slice(0, 10)}</p>
              </div>
              <div className="text-center">
                <p className="font-mono font-bold text-2xl text-blue-400 tracking-widest">{s.code}</p>
                <p className="text-xs text-gray-500">code d'accès</p>
              </div>
              <button
                onClick={() => navigate(`/sessions/${s.id}/progress`)}
                className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-sm rounded"
              >
                Suivre
              </button>
              <button
                onClick={() => navigate(`/notebook/${s.slot_id}`)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm rounded"
              >
                Cahier
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
