import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { loginFormateur } from '../api/client'
import { useAuthStore } from '../store/authStore'

export function LoginPage() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const authLogin = useAuthStore(s => s.login)

  const mutation = useMutation({
    mutationFn: () => loginFormateur(login, password),
    onSuccess: (data) => {
      authLogin({ token: data.token, role: 'formateur', login: data.login })
      navigate('/dashboard')
    },
  })

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-1">
          oak<span className="text-blue-400">DB</span>
        </h1>
        <p className="text-gray-400 text-sm mb-6">Espace formateur</p>

        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Login</label>
            <input
              value={login}
              onChange={e => setLogin(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="formateur"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {mutation.isError && (
            <p className="text-red-400 text-sm">{(mutation.error as Error).message}</p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded font-medium text-sm"
          >
            {mutation.isPending ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">
          Vous êtes apprenant ?{' '}
          <button onClick={() => navigate('/join')} className="text-blue-400 hover:underline">
            Rejoindre avec un code
          </button>
        </p>
      </div>
    </div>
  )
}
