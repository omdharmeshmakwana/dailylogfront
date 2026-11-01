import { useEffect, useMemo, useState } from 'react'
import Attendance from './components/Attendance'
import Dashboard from './components/Dashboard'
import EmployeeEod from './components/EmployeeEod'
import Employees from './components/Employees'
import Login from './components/Login'
import Projects from './components/Projects'
import TopBar from './components/TopBar'
import { initialEmployees, initialProjects } from './data'
import type { AttendanceRecord, Employee, ManagerPage, Project, Role, Theme } from './types'

interface Session {
  role: Role
  name: string
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

export default function App() {
  const demoRole = new URLSearchParams(window.location.search).get('demo')
  const demoPage = new URLSearchParams(window.location.search).get('page') as ManagerPage | null
  const [theme, setTheme] = useState<Theme>(() => readStored('dl-theme', 'light'))
  const [session, setSession] = useState<Session | null>(() => demoRole === 'manager' ? { role: 'manager', name: 'Manager' } : demoRole === 'employee' ? { role: 'employee', name: 'Gauri' } : readStored('dl-session', null))
  const [page, setPage] = useState<ManagerPage>(() => demoPage || readStored('dl-page', 'dashboard'))
  const [employees, setEmployees] = useState<Employee[]>(() => readStored('dl-employees', initialEmployees))
  const [projects, setProjects] = useState<Project[]>(() => readStored('dl-projects', initialProjects))
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>(() => readStored('dl-attendance', {}))
  const [holidays, setHolidays] = useState<Record<string, true>>(() => readStored('dl-holidays', { '2026-10-02': true, '2026-10-20': true }))
  const [toast, setToast] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('dl-theme', JSON.stringify(theme))
  }, [theme])

  useEffect(() => localStorage.setItem('dl-session', JSON.stringify(session)), [session])
  useEffect(() => localStorage.setItem('dl-page', JSON.stringify(page)), [page])
  useEffect(() => localStorage.setItem('dl-employees', JSON.stringify(employees)), [employees])
  useEffect(() => localStorage.setItem('dl-projects', JSON.stringify(projects)), [projects])
  useEffect(() => localStorage.setItem('dl-attendance', JSON.stringify(attendance)), [attendance])
  useEffect(() => localStorage.setItem('dl-holidays', JSON.stringify(holidays)), [holidays])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const activeEmployee = useMemo(
    () => employees.find((employee) => employee.name === session?.name),
    [employees, session],
  )

  const signOut = () => {
    setSession(null)
    localStorage.removeItem('dl-session')
  }

  if (!session) {
    return (
      <Login
        employees={employees}
        theme={theme}
        onToggleTheme={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}
        onSignIn={setSession}
      />
    )
  }

  return (
    <div className="app-shell">
      <TopBar
        role={session.role}
        page={page}
        name={session.name}
        theme={theme}
        onPage={setPage}
        onToggleTheme={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}
        onSignOut={signOut}
      />

      {session.role === 'employee' && activeEmployee ? (
        <EmployeeEod employee={activeEmployee} projects={projects} onToast={setToast} />
      ) : null}

      {session.role === 'manager' && page === 'dashboard' ? (
        <Dashboard employees={employees} projects={projects} onToast={setToast} />
      ) : null}

      {session.role === 'manager' && page === 'attendance' ? (
        <Attendance
          employees={employees}
          attendance={attendance}
          holidays={holidays}
          onAttendance={setAttendance}
          onHolidays={setHolidays}
          onToast={setToast}
        />
      ) : null}

      {session.role === 'manager' && page === 'projects' ? (
        <Projects projects={projects} onProjects={setProjects} onToast={setToast} />
      ) : null}

      {session.role === 'manager' && page === 'employees' ? (
        <Employees employees={employees} onEmployees={setEmployees} onToast={setToast} />
      ) : null}

      <div className={`toast ${toast ? 'toast--show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  )
}
