import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { joinSession } from '../api/client'
import { useAuthStore } from '../store/authStore'

export function JoinPage() {
  const [code, setCode] = useState('')
  const [pseudo, setPseudo] = useState('')
  const navigate = useNavigate()
  const authLogin = useAuthStore(s => s.login)

  const mutation = useMutation({
    mutationFn: () => joinSession(code, pseudo),
    onSuccess: (data) => {
      authLogin({
        token: data.token,
        role: 'apprenant',
        pseudo: data.pseudo,
        slot_id: data.slot_id,
        session_code: data.session_code,
      })
      navigate(`/notebook/${data.slot_id}`)
    },
  })

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-1">
          oak<span className="text-blue-400">DB</span>
        </h1>
        <p className="text-gray-400 text-sm mb-6">Rejoindre une session</p>

        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Code de session</label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm font-mono tracking-widest focus:outline-none focus:border-blue-500"
              placeholder="OAK-XXX"
              maxLength={7}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Votre prénom ou pseudo</label>
            <input
              value={pseudo}
              onChange={e => setPseudo(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="Marie"
            />
          </div>

          {mutation.isError && (
            <p className="text-red-400 text-sm">{(mutation.error as Error).message}</p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending || !code.trim() || !pseudo.trim()}
            className="w-full py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded font-medium text-sm"
          >
            {mutation.isPending ? 'Connexion...' : 'Rejoindre'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">
          Vous êtes formateur ?{' '}
          <button onClick={() => navigate('/login')} className="text-blue-400 hover:underline">
            Se connecter
          </button>
        </p>
      </div>
    </div>
  )
}
