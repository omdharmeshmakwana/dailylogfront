import type { AttendanceStatus, Employee, LineItem, OutputKey, Project, Role, SceneEntry, WorkKind, WorkStatus } from './types'

// Typed client for the Daily Log API (dailylogback). The base URL comes from
// VITE_API_URL (.env locally, Vercel environment variables in production).
const BASE_URL = String(import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '')
const TOKEN_KEY = 'dl-token'

// Fired on window when the API rejects the saved token, so the app can
// return to the sign-in screen.
export const SESSION_EXPIRED = 'dl-session-expired'

export type PlanFlag = 'leave' | 'early' | 'late' | 'wfh'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
}

export interface TeamMember extends Employee {
  id: string
}

export interface SavedEntry {
  id: string
  project: string
  episode: string
  scene: string
  kind: WorkKind
  status: WorkStatus
  lines: LineItem[]
}

export interface Eod {
  id: string
  date: string
  employee: { id: string; name: string; email: string }
  remarks: string
  plan: string
  planFlag: PlanFlag | null
  submittedAt: string
  updatedAt: string
  entries: SavedEntry[]
}

// The EOD screen's SceneEntry objects can be sent as-is; draft fields are ignored.
export interface EodInput {
  entries: Pick<SceneEntry, 'project' | 'episode' | 'scene' | 'kind' | 'status' | 'lines'>[]
  remarks?: string
  plan?: string
}

export interface MyEod {
  date: string
  today: string
  eodDue: string
  eod: Eod | null
  reminderSentAt: string | null
}

export interface DashboardParams {
  date?: string
  period?: 'day' | 'week' | 'month'
  project?: string
  episode?: string
  employee?: string
}

export interface Dashboard {
  date: string
  today: string
  isToday: boolean
  period: 'day' | 'week' | 'month'
  periodStart: string
  periodEnd: string
  eodDue: string
  noWork: string
  summary: { people: number; present: number; away: number; submitted: number; missed: number; submittedPercent: number | null }
  outputs: Record<OutputKey, number>
  totalOutputs: number
  breakdown: { project: string; images: number; clips: number; total: number; episodes: { episode: string; images: number; clips: number; total: number; share: number }[] }[]
  feed: { employee: Eod['employee']; submittedAt: string; updatedAt: string; scenes: number; outputs: number; entries: SavedEntry[] }[]
  missed: { id: string; name: string; email: string; status: AttendanceStatus | null; checkIn: string | null; reminderSentAt: string | null }[]
  plans: { name: string; email: string; text: string; flag: PlanFlag | null }[]
  remarks: { name: string; email: string; text: string }[]
}

export interface AttendanceEntry {
  email: string
  date: string
  status: AttendanceStatus
  checkIn: string | null
}

export interface AttendanceMonth {
  month: string
  today: string
  employees: { id: string; name: string; email: string }[]
  records: AttendanceEntry[]
  holidays: string[]
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Try again.'
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Private mode: the session just won't survive a reload.
  }
}

function withQuery(path: string, params: object = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken()
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.")
  }
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && token) {
      setToken(null)
      window.dispatchEvent(new Event(SESSION_EXPIRED))
    }
    throw new ApiError(response.status, data?.error || 'Something went wrong. Try again.')
  }
  return data as T
}

export const api = {
  config: () => request<{ today: string; timezone: string; eodDue: string }>('GET', '/api/config'),

  async login(identifier: string) {
    const data = await request<{ token: string; user: SessionUser }>('POST', '/api/auth/login', { identifier })
    setToken(data.token)
    return data.user
  },
  logout: () => setToken(null),
  me: () => request<{ user: SessionUser }>('GET', '/api/auth/me').then((data) => data.user),

  projects: {
    list: () => request<{ projects: Project[] }>('GET', '/api/projects').then((data) => data.projects),
    create: (name: string) => request<{ project: Project }>('POST', '/api/projects', { name }).then((data) => data.project),
    update: (id: string, changes: { name?: string; archived?: boolean }) =>
      request<{ project: Project }>('PATCH', `/api/projects/${id}`, changes).then((data) => data.project),
    addEpisode: (id: string, name?: string) =>
      request<{ project: Project }>('POST', `/api/projects/${id}/episodes`, name ? { name } : {}).then((data) => data.project),
    renameEpisode: (id: string, index: number, name: string) =>
      request<{ project: Project }>('PATCH', `/api/projects/${id}/episodes/${index}`, { name }).then((data) => data.project),
  },

  employees: {
    list: () => request<{ employees: TeamMember[] }>('GET', '/api/employees').then((data) => data.employees),
    create: (name: string, email: string) =>
      request<{ employee: TeamMember }>('POST', '/api/employees', { name, email }).then((data) => data.employee),
    update: (id: string, changes: { name?: string; active?: boolean }) =>
      request<{ employee: TeamMember }>('PATCH', `/api/employees/${id}`, changes).then((data) => data.employee),
    remove: (id: string) => request<void>('DELETE', `/api/employees/${id}`),
  },

  eods: {
    mine: (date?: string) => request<MyEod>('GET', withQuery('/api/eods/me', { date })),
    submit: (input: EodInput) => request<{ eod: Eod }>('PUT', '/api/eods/me', input).then((data) => data.eod),
    list: (params: { from?: string; to?: string; employee?: string; project?: string; episode?: string } = {}) =>
      request<{ from: string; to: string; eods: Eod[] }>('GET', withQuery('/api/eods', params)),
  },

  dashboard: (params: DashboardParams = {}) => request<Dashboard>('GET', withQuery('/api/dashboard', params)),

  attendance: {
    month: (month?: string) => request<AttendanceMonth>('GET', withQuery('/api/attendance', { month })),
    set: (input: { email: string; date: string; status: AttendanceStatus | null; checkIn?: string }) =>
      request<{ record: AttendanceEntry | null }>('PUT', '/api/attendance', input).then((data) => data.record),
  },

  holidays: {
    list: () => request<{ holidays: string[] }>('GET', '/api/holidays').then((data) => data.holidays),
    add: (date: string) => request<{ date: string }>('POST', '/api/holidays', { date }),
    remove: (date: string) => request<void>('DELETE', `/api/holidays/${date}`),
  },

  reminders: {
    send: (emails: string[]) =>
      request<{ date: string; sent: { name: string; email: string; sentAt: string }[]; unknown: string[] }>('POST', '/api/reminders', { emails }),
  },
}
