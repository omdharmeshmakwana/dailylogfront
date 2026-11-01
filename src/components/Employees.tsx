import { useState } from 'react'
import { api, errorMessage, type TeamMember } from '../api'
import { useApi } from '../hooks'
import LoadState from './LoadState'

interface Props {
  onToast: (message: string) => void
}

export default function Employees({ onToast }: Props) {
  const list = useApi(() => api.employees.list(), [])
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState('')
  const employees = list.data ?? []
  const activeCount = employees.filter((employee) => employee.active).length

  const addEmployee = async () => {
    const cleanName = name.trim()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanName || !cleanEmail) { setError('Name and email are both required.'); return }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) { setError("That email doesn't look right."); return }
    if (employees.some((employee) => employee.email.toLowerCase() === cleanEmail)) { setError('Someone already uses this email.'); return }
    setBusy(true)
    try {
      const employee = await api.employees.create(cleanName, cleanEmail)
      list.setData((current) => [...current, employee])
      setName(''); setEmail(''); setAdding(false); onToast(`${cleanName} added`)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (employee: TeamMember) => {
    try {
      const updated = await api.employees.update(employee.id, { active: !employee.active })
      list.setData((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch (reason) {
      onToast(errorMessage(reason))
    }
  }

  const remove = async (employee: TeamMember) => {
    try {
      await api.employees.remove(employee.id)
      list.setData((current) => current.filter((item) => item.id !== employee.id))
      setConfirmRemove('')
      onToast(`${employee.name} removed`)
    } catch (reason) {
      onToast(errorMessage(reason))
    }
  }

  return (
    <main className="page page--medium">
      <section className="section-head">
        <div className="page-heading"><h1>Employees</h1><p>{list.data ? `${activeCount} active of ${employees.length}` : ' '}</p></div>
        <button className="button button--primary" type="button" disabled={!list.data} onClick={() => setAdding(true)}>Add employee</button>
      </section>

      {adding ? (
        <section className="create-panel employee-create">
          <div className="field"><label htmlFor="employee-name">Name</label><input id="employee-name" autoFocus value={name} onChange={(event) => { setName(event.target.value); setError('') }} /></div>
          <div className="field"><label htmlFor="employee-email">Email</label><input id="employee-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError('') }} placeholder="name@company.com" /></div>
          {error ? <p className="form-error employee-create__error">{error}</p> : null}
          <div className="button-row"><button className="button button--secondary" type="button" onClick={() => setAdding(false)}>Cancel</button><button className="button button--primary" type="button" disabled={busy} onClick={addEmployee}>Add</button></div>
        </section>
      ) : null}

      {!list.data ? <LoadState error={list.error} onRetry={list.reload} /> : (
        <section className="card employee-list">
          {employees.map((employee) => (
            <div className={`employee-row ${employee.active ? '' : 'employee-row--inactive'}`} key={employee.id}>
              <span className="avatar avatar--large">{employee.name.charAt(0)}</span>
              <span className="employee-row__identity"><strong>{employee.name}</strong><small>{employee.email}</small></span>
              <label className="switch"><input type="checkbox" checked={employee.active} onChange={() => toggleActive(employee)} /><span className="switch__track"><i /></span><b>{employee.active ? 'Active' : 'Inactive'}</b></label>
              {confirmRemove === employee.id ? (
                <span className="remove-confirm"><span>Remove {employee.name}? Past logs are kept.</span><button className="button button--text" type="button" onClick={() => setConfirmRemove('')}>Keep</button><button className="button button--text button--danger-text" type="button" onClick={() => remove(employee)}>Remove</button></span>
              ) : <button className="button button--text button--compact" type="button" onClick={() => setConfirmRemove(employee.id)}>Remove</button>}
            </div>
          ))}
          {!employees.length ? <p className="empty-state">No employees yet. Add your team to get started.</p> : null}
        </section>
      )}
    </main>
  )
}
