import { useEffect, useState } from 'react'
import { api, ApiError, errorMessage, getToken, SESSION_EXPIRED, type SessionUser } from './api'
import Attendance from './components/Attendance'
import Dashboard from './components/Dashboard'
import EmployeeEod from './components/EmployeeEod'
import Employees from './components/Employees'
import Login from './components/Login'
import Projects from './components/Projects'
import TopBar from './components/TopBar'
import { SLOW_NOTE, useSlow } from './hooks'
import type { ManagerPage, Theme } from './types'

// Left behind by the earlier version that kept all data in the browser.
const LEGACY_KEYS = ['dl-session', 'dl-employees', 'dl-projects', 'dl-attendance', 'dl-holidays']

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => readStored('dl-theme', 'light'))
  const [session, setSession] = useState<SessionUser | null>(null)
  const [restoring, setRestoring] = useState(() => Boolean(getToken()))
  const [page, setPage] = useState<ManagerPage>(() => readStored('dl-page', 'dashboard'))
  const [toast, setToast] = useState('')
  const [exporting, setExporting] = useState(false)
  const slowRestore = useSlow(restoring)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('dl-theme', JSON.stringify(theme))
  }, [theme])

  useEffect(() => localStorage.setItem('dl-page', JSON.stringify(page)), [page])

  // Resume the saved session, if any.
  useEffect(() => {
    try {
      LEGACY_KEYS.forEach((key) => localStorage.removeItem(key))
    } catch {
      // Storage unavailable; nothing to clean up.
    }
    if (!getToken()) return
    api.me()
      .then(setSession)
      .catch((error) => {
        if (error instanceof ApiError && error.status === 403) api.logout()
      })
      .finally(() => setRestoring(false))
  }, [])

  useEffect(() => {
    const expire = () => {
      setSession(null)
      setToast('Your session ended. Sign in again.')
    }
    window.addEventListener(SESSION_EXPIRED, expire)
    return () => window.removeEventListener(SESSION_EXPIRED, expire)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const toggleTheme = () => setTheme((value) => (value === 'light' ? 'dark' : 'light'))

  const signOut = () => {
    api.logout()
    setSession(null)
  }

  const exportData = async () => {
    setExporting(true)
    try {
      const { filename, blob } = await api.exportData()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(url)
      setToast(`Downloaded ${filename}`)
    } catch (error) {
      setToast(errorMessage(error))
    } finally {
      setExporting(false)
    }
  }

  const toastElement = (
    <div className={`toast ${toast ? 'toast--show' : ''}`} role="status" aria-live="polite">
      {toast}
    </div>
  )

  if (restoring) {
    return (
      <main className="login-page">
        <p className="login-note" role="status">{slowRestore ? `Signing you in… ${SLOW_NOTE}` : 'Signing you in…'}</p>
      </main>
    )
  }

  if (!session) {
    return (
      <>
        <Login theme={theme} onToggleTheme={toggleTheme} onSignIn={setSession} />
        {toastElement}
      </>
    )
  }

  return (
    <div className="app-shell">
      <TopBar
        role={session.role}
        page={page}
        name={session.name}
        theme={theme}
        exporting={exporting}
        onPage={setPage}
        onExport={exportData}
        onToggleTheme={toggleTheme}
        onSignOut={signOut}
      />

      {session.role === 'employee' ? <EmployeeEod user={session} onToast={setToast} /> : null}
      {session.role === 'manager' && page === 'dashboard' ? <Dashboard user={session} onToast={setToast} /> : null}
      {session.role === 'manager' && page === 'attendance' ? <Attendance onToast={setToast} /> : null}
      {session.role === 'manager' && page === 'projects' ? <Projects onToast={setToast} /> : null}
      {session.role === 'manager' && page === 'employees' ? <Employees user={session} onToast={setToast} /> : null}

      {toastElement}
    </div>
  )
}
