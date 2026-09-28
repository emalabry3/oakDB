const API = 'http://localhost:8000'

export interface QueryResult {
  columns: string[]
  rows: unknown[][]
}

export interface SchemaTable {
  table: string
  columns: { name: string; type: string }[]
}

export interface SlotInfo {
  id: string
  name: string
  description: string
  difficulty: string
  tags: string[]
}

export async function listSlots(): Promise<SlotInfo[]> {
  const res = await fetch(`${API}/slots`)
  if (!res.ok) throw new Error('Impossible de charger les slots')
  return res.json()
}

export async function executeQuery(query: string, slotId = 'boutique-v1'): Promise<QueryResult> {
  const res = await fetch(`${API}/sql/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, slot_id: slotId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail?.error ?? data.error ?? 'Erreur inconnue')
  return data
}

export async function getSchema(slotId = 'boutique-v1'): Promise<SchemaTable[]> {
  const res = await fetch(`${API}/sql/schema?slot_id=${encodeURIComponent(slotId)}`)
  if (!res.ok) throw new Error('Impossible de charger le schéma')
  return res.json()
}

export interface QueryStep {
  id: string
  label: string
  explanation: string
  highlight_start: number
  highlight_end: number
  columns: string[]
  rows: unknown[][]
  subquery_steps?: QueryStep[]
}

export async function getSteps(query: string, slotId = 'boutique-v1'): Promise<QueryStep[]> {
  const res = await fetch(`${API}/sql/steps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, slot_id: slotId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail?.error ?? data.error ?? 'Erreur inconnue')
  return data.steps
}

export interface Exercise {
  id: string
  title: string
  statement: string
  hints?: string[]
  order_sensitive: boolean
}

export interface Lesson {
  id: string
  title: string
  exercises: Exercise[]
}

export interface Chapter {
  id: string
  title: string
  description: string
  lessons: Lesson[]
}

export interface Notebook {
  title: string
  description: string
  chapters: Chapter[]
}

export interface ValidationResult {
  success: boolean
  feedback: string
}

export async function getNotebook(slotId: string): Promise<Notebook> {
  const res = await fetch(`${API}/slots/${slotId}/notebook`)
  if (!res.ok) throw new Error('Impossible de charger le cahier')
  return res.json()
}

export async function getProgress(slotId: string, token?: string): Promise<Record<string, string>> {
  const headers: HeadersInit = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API}/slots/${slotId}/progress`, { headers })
  if (!res.ok) return {}
  return res.json()
}

export async function validateExercise(
  slotId: string,
  exerciseId: string,
  query: string,
  usedHints: boolean,
  token?: string
): Promise<ValidationResult> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API}/slots/${slotId}/exercises/${exerciseId}/validate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, slot_id: slotId, used_hints: usedHints }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail ?? 'Erreur de validation')
  return data
}

// Helper pour les headers authentifiés
export function authHeaders(token?: string): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export async function loginFormateur(login: string, password: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail ?? 'Erreur de connexion')
  return data
}

export async function joinSession(code: string, pseudo: string) {
  const res = await fetch(`${API}/auth/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, pseudo }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail ?? 'Code invalide')
  return data
}

export async function createSession(nom: string, slotId: string, token: string) {
  const res = await fetch(`${API}/auth/sessions`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ nom, slot_id: slotId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail ?? 'Erreur')
  return data
}

export async function listSessions(token: string) {
  const res = await fetch(`${API}/auth/sessions`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error('Erreur')
  return res.json()
}

export interface ProgressSummary {
  total: number
  completed: number
  in_progress: number
  not_started: number
  percentage: number
}

export interface ApprenantProgress {
  id: number
  pseudo: string
  joined_at: string
  summary: ProgressSummary
  statuses: Record<string, string>
}

export interface SessionProgressData {
  session: { id: number; nom: string; code: string; slot_id: string }
  total_exercises: number
  apprenants: ApprenantProgress[]
}

export async function getMyProgress(slotId: string, token?: string): Promise<{ statuses: Record<string, string>; summary: ProgressSummary }> {
  const headers: HeadersInit = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API}/progress/me?slot_id=${encodeURIComponent(slotId)}`, { headers })
  if (!res.ok) throw new Error('Erreur')
  return res.json()
}

export async function getSessionProgress(sessionId: number, token: string): Promise<SessionProgressData> {
  const res = await fetch(`${API}/progress/sessions/${sessionId}/progress`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Erreur')
  return res.json()
}

export interface AttemptRecord {
  query: string
  success: boolean
  feedback: string
  submitted_at: string
}

export async function createSandboxSession(slotId: string): Promise<{ session_id: string }> {
  const res = await fetch(`${API}/sandbox/${encodeURIComponent(slotId)}/session`, { method: 'POST' })
  if (!res.ok) throw new Error('Impossible de créer la session bac à sable')
  return res.json()
}

export async function executeSandbox(
  slotId: string,
  sessionId: string,
  query: string
): Promise<QueryResult> {
  const res = await fetch(`${API}/sandbox/${encodeURIComponent(slotId)}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, query }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail ?? 'Erreur')
  return data
}

export async function resetSandboxSession(slotId: string, sessionId: string): Promise<{ session_id: string }> {
  const res = await fetch(`${API}/sandbox/${encodeURIComponent(slotId)}/session/${sessionId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Impossible de réinitialiser la session')
  return res.json()
}

export async function getApprenantAttempts(
  apprenantId: number,
  exerciseId: string,
  slotId: string,
  token: string
): Promise<{ attempts: AttemptRecord[] }> {
  const res = await fetch(
    `${API}/progress/apprenants/${apprenantId}/exercises/${exerciseId}/attempts?slot_id=${encodeURIComponent(slotId)}`,
    { headers: authHeaders(token) }
  )
  if (!res.ok) throw new Error('Erreur')
  return res.json()
}
