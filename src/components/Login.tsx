import { useState } from 'react'
import type { Employee, Role, Theme } from '../types'

interface Props {
  employees: Employee[]
  theme: Theme
  onToggleTheme: () => void
  onSignIn: (session: { role: Role; name: string }) => void
}

export default function Login({ employees, theme, onToggleTheme, onSignIn }: Props) {
  const [value, setValue] = useState('gauri@studio.ai')
  const [error, setError] = useState('')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const clean = value.trim()
    if (!clean) {
      setError('Enter your name or email to continue.')
      return
    }
    if (/^manager(@|$)/i.test(clean)) {
      onSignIn({ role: 'manager', name: 'Manager' })
      return
    }
    const prefix = clean.split('@')[0].replace(/[._-]+/g, ' ').toLowerCase()
    const match = employees.find((employee) => employee.email.toLowerCase() === clean.toLowerCase() || employee.name.toLowerCase() === prefix)
    if (!match) {
      setError("We couldn't find that name or email in the team list.")
      return
    }
    if (!match.active) {
      setError(`${match.name}'s account is inactive. Ask your manager to reactivate it.`)
      return
    }
    onSignIn({ role: 'employee', name: match.name })
  }

  return (
    <main className="login-page">
      <section className="login-wrap" aria-labelledby="login-title">
        <div className="brand brand--login">
          <span className="brand__mark">DL</span>
          <span>
            <strong>Daily Log</strong>
            <small>End-of-day updates for the studio</small>
          </span>
        </div>
        <form className="card login-card" onSubmit={submit} noValidate>
          <h1 id="login-title">Sign in</h1>
          <label htmlFor="login-name">Name or email</label>
          <input
            id="login-name"
            className={error ? 'field--error' : ''}
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              setError('')
            }}
            placeholder="gauri@studio.ai"
            autoComplete="username"
          />
          {error ? <p className="form-error">{error}</p> : null}
          <button className="button button--primary button--full" type="submit">Sign in</button>
          <p className="login-note">Your view is set by your email. Demo: gauri@studio.ai (employee) or manager@studio.ai.</p>
        </form>
        <button className="button button--text theme-login" type="button" onClick={onToggleTheme}>
          Switch to {theme === 'light' ? 'dark' : 'light'} mode
        </button>
      </section>
    </main>
  )
}
