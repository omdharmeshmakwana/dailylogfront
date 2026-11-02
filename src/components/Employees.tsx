import { useState } from 'react'
import { api, errorMessage, type SessionUser, type TeamMember } from '../api'
import { useApi } from '../hooks'
import type { Role } from '../types'
import EmployeeEods from './EmployeeEods'
import LoadState from './LoadState'

interface Props {
  user: SessionUser
  onToast: (message: string) => void
}

// A remove or role change waiting for the manager to confirm it on the row.
type Pending = { id: string; action: 'remove' } | { id: string; action: 'role'; role: Role }

const roleChange: Record<Role, { button: string; note: string; done: string }> = {
  manager: { button: 'Make manager', note: "They'll see all data and stop submitting EODs.", done: 'is now a manager' },
  employee: { button: 'Make employee', note: "They'll lose manager access and submit EODs.", done: 'is now an employee' },
}

export default function Employees({ user, onToast }: Props) {
  const list = useApi(() => api.employees.list(), [])
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const [viewing, setViewing] = useState<TeamMember | null>(null)
  const employees = list.data ?? []
  const activeCount = employees.filter((employee) => employee.active).length
  const managerCount = employees.filter((employee) => employee.role === 'manager').length

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

  const update = async (employee: TeamMember, changes: { active?: boolean; role?: Role }) => {
    try {
      const updated = await api.employees.update(employee.id, changes)
      list.setData((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      return true
    } catch (reason) {
      onToast(errorMessage(reason))
      return false
    }
  }

  const changeRole = async (employee: TeamMember, role: Role) => {
    if (await update(employee, { role })) {
      setPending(null)
      onToast(`${employee.name} ${roleChange[role].done}`)
    }
  }

  const remove = async (employee: TeamMember) => {
    try {
      await api.employees.remove(employee.id)
      list.setData((current) => current.filter((item) => item.id !== employee.id))
      setPending(null)
      onToast(`${employee.name} removed`)
    } catch (reason) {
      onToast(errorMessage(reason))
    }
  }

  const viewEods = (employee: TeamMember) => {
    setPending(null)
    setViewing(employee)
    window.scrollTo(0, 0)
  }

  if (viewing) return <EmployeeEods employee={viewing} onBack={() => setViewing(null)} />

  return (
    <main className="page page--medium">
      <section className="section-head">
        <div className="page-heading">
          <h1>Employees</h1>
          <p>{list.data ? `${activeCount} active of ${employees.length} · ${managerCount} ${managerCount === 1 ? 'manager' : 'managers'}` : ' '}</p>
        </div>
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
          {employees.map((employee) => {
            const isSelf = employee.id === user.id
            const confirming = pending?.id === employee.id ? pending : null
            return (
              <div className={`employee-row ${employee.active ? '' : 'employee-row--inactive'}`} key={employee.id}>
                <span className="avatar avatar--large">{employee.name.charAt(0)}</span>
                <span className="employee-row__identity">
                  <strong>{employee.name}{isSelf ? <span className="badge badge--neutral">You</span> : null}</strong>
                  <small>{employee.email}</small>
                </span>
                {confirming?.action === 'remove' ? (
                  <span className="remove-confirm"><span>Remove {employee.name}? Past logs are kept.</span><button className="button button--text" type="button" onClick={() => setPending(null)}>Keep</button><button className="button button--text button--danger-text" type="button" onClick={() => remove(employee)}>Remove</button></span>
                ) : confirming?.action === 'role' ? (
                  <span className="remove-confirm"><span>Make {employee.name} {confirming.role === 'manager' ? 'a manager' : 'an employee'}? {roleChange[confirming.role].note}</span><button className="button button--text" type="button" onClick={() => setPending(null)}>Cancel</button><button className="button button--text button--accent-text" type="button" onClick={() => changeRole(employee, confirming.role)}>{roleChange[confirming.role].button}</button></span>
                ) : (
                  <span className="employee-row__controls">
                    <select
                      className="role-select"
                      value={employee.role}
                      disabled={isSelf}
                      title={isSelf ? "You can't change your own role" : undefined}
                      aria-label={`${employee.name}'s role`}
                      onChange={(event) => setPending({ id: employee.id, action: 'role', role: event.target.value as Role })}
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                    </select>
                    <label className="switch"><input type="checkbox" checked={employee.active} disabled={isSelf} onChange={() => update(employee, { active: !employee.active })} /><span className="switch__track"><i /></span><b>{employee.active ? 'Active' : 'Inactive'}</b></label>
                    <button className="button button--text button--compact" type="button" onClick={() => viewEods(employee)}>View EODs</button>
                    {isSelf ? <span /> : <button className="button button--text button--compact" type="button" onClick={() => setPending({ id: employee.id, action: 'remove' })}>Remove</button>}
                  </span>
                )}
              </div>
            )
          })}
          {!employees.length ? <p className="empty-state">No employees yet. Add your team to get started.</p> : null}
        </section>
      )}
    </main>
  )
}
