import { useState } from 'react'
import { api, errorMessage, type SessionUser } from '../api'
import { SLOW_NOTE, useSlow } from '../hooks'
import type { Theme } from '../types'

interface Props {
  theme: Theme
  onToggleTheme: () => void
  onSignIn: (user: SessionUser) => void
}

export default function Login({ theme, onToggleTheme, onSignIn }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const slow = useSlow(busy)

  // The API decides the role from the account and returns the same messages
  // the old in-browser check used.
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const clean = value.trim()
    if (!clean) {
      setError('Enter your name or email to continue.')
      return
    }
    setBusy(true)
    try {
      onSignIn(await api.login(clean))
    } catch (reason) {
      setError(errorMessage(reason))
      setBusy(false)
    }
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
            placeholder="name@company.com"
            autoComplete="username"
          />
          {error ? <p className="form-error">{error}</p> : null}
          <button className="button button--primary button--full" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p className="login-note">{slow ? SLOW_NOTE : 'Your view is set by your email.'}</p>
        </form>
        <button className="button button--text theme-login" type="button" onClick={onToggleTheme}>
          Switch to {theme === 'light' ? 'dark' : 'light'} mode
        </button>
      </section>
    </main>
  )
}
