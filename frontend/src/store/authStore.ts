import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthUser {
  token: string
  role: 'formateur' | 'apprenant'
  login?: string
  pseudo?: string
  slot_id?: string
  session_code?: string
}

interface AuthState {
  user: AuthUser | null
  login: (user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: 'oakdb-auth' }
  )
)
