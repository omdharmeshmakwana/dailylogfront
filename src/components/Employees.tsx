import { useState } from 'react'
import type { Employee } from '../types'

interface Props {
  employees: Employee[]
  onEmployees: React.Dispatch<React.SetStateAction<Employee[]>>
  onToast: (message: string) => void
}

export default function Employees({ employees, onEmployees, onToast }: Props) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState('')
  const activeCount = employees.filter((employee) => employee.active).length

  const addEmployee = () => {
    const cleanName = name.trim()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanName || !cleanEmail) { setError('Name and email are both required.'); return }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) { setError("That email doesn't look right."); return }
    if (employees.some((employee) => employee.email.toLowerCase() === cleanEmail)) { setError('Someone already uses this email.'); return }
    onEmployees((current) => [...current, { name: cleanName, email: cleanEmail, active: true }])
    setName(''); setEmail(''); setAdding(false); onToast(`${cleanName} added`)
  }

  const update = (emailAddress: string, updater: (employee: Employee) => Employee) => onEmployees((current) => current.map((employee) => employee.email === emailAddress ? updater(employee) : employee))

  return (
    <main className="page page--medium">
      <section className="section-head">
        <div className="page-heading"><h1>Employees</h1><p>{activeCount} active of {employees.length}</p></div>
        <button className="button button--primary" type="button" onClick={() => setAdding(true)}>Add employee</button>
      </section>

      {adding ? (
        <section className="create-panel employee-create">
          <div className="field"><label htmlFor="employee-name">Name</label><input id="employee-name" autoFocus value={name} onChange={(event) => { setName(event.target.value); setError('') }} /></div>
          <div className="field"><label htmlFor="employee-email">Email</label><input id="employee-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError('') }} placeholder="name@studio.ai" /></div>
          {error ? <p className="form-error employee-create__error">{error}</p> : null}
          <div className="button-row"><button className="button button--secondary" type="button" onClick={() => setAdding(false)}>Cancel</button><button className="button button--primary" type="button" onClick={addEmployee}>Add</button></div>
        </section>
      ) : null}

      <section className="card employee-list">
        {employees.map((employee) => (
          <div className={`employee-row ${employee.active ? '' : 'employee-row--inactive'}`} key={employee.email}>
            <span className="avatar avatar--large">{employee.name.charAt(0)}</span>
            <span className="employee-row__identity"><strong>{employee.name}</strong><small>{employee.email}</small></span>
            <label className="switch"><input type="checkbox" checked={employee.active} onChange={() => update(employee.email, (item) => ({ ...item, active: !item.active }))} /><span className="switch__track"><i /></span><b>{employee.active ? 'Active' : 'Inactive'}</b></label>
            {confirmRemove === employee.email ? (
              <span className="remove-confirm"><span>Remove {employee.name}? Past logs are kept.</span><button className="button button--text" type="button" onClick={() => setConfirmRemove('')}>Keep</button><button className="button button--text button--danger-text" type="button" onClick={() => { onEmployees((current) => current.filter((item) => item.email !== employee.email)); setConfirmRemove(''); onToast(`${employee.name} removed`) }}>Remove</button></span>
            ) : <button className="button button--text button--compact" type="button" onClick={() => setConfirmRemove(employee.email)}>Remove</button>}
          </div>
        ))}
      </section>
    </main>
  )
}
