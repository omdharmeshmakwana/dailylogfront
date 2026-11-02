import { useState } from 'react'
import { api, type TeamMember } from '../api'
import { fmtLongDay, fmtMonth, fmtTime, monthDays, shiftMonth } from '../dates'
import { useApi } from '../hooks'
import LoadState from './LoadState'
import SubmittedEod from './SubmittedEod'

interface Props {
  employee: TeamMember
  onBack: () => void
}

// Manager view of one person's EODs, a month at a time, newest first.
export default function EmployeeEods({ employee, onBack }: Props) {
  const [month, setMonth] = useState('')
  const history = useApi(async () => {
    const { today } = await api.config()
    const shown = month || today.slice(0, 7)
    const days = monthDays(shown)
    const { eods } = await api.eods.list({ from: days[0], to: days[days.length - 1], employee: employee.email })
    return { today, month: shown, eods: [...eods].reverse() }
  }, [month, employee.email])

  const data = history.data
  const shown = month || data?.month || ''
  const details = [employee.email, employee.role === 'manager' ? 'Manager' : '', employee.active ? '' : 'Inactive'].filter(Boolean).join(' · ')

  return (
    <main className="page page--eod">
      <button className="button button--text back-link" type="button" onClick={onBack}>← All employees</button>
      <div className="page-heading page-heading--split">
        <div className="page-heading"><h1>{employee.name}'s EODs</h1><p>{details}</p></div>
        <div className="month-switcher">
          <button type="button" aria-label="Previous month" disabled={!data} onClick={() => data && setMonth(shiftMonth(data.month, -1))}>‹</button>
          <strong>{shown ? fmtMonth(shown) : ''}</strong>
          <button type="button" aria-label="Next month" disabled={!data || data.month >= data.today.slice(0, 7)} onClick={() => data && setMonth(shiftMonth(data.month, 1))}>›</button>
        </div>
      </div>

      {!data || history.loading || history.error ? <LoadState error={history.error} onRetry={history.reload} /> : data.eods.length ? (
        <>
          <p className="eod-history__count">{data.eods.length} {data.eods.length === 1 ? 'EOD' : 'EODs'} in {fmtMonth(data.month)}</p>
          {data.eods.map((eod) => {
            const edited = Date.parse(eod.updatedAt) - Date.parse(eod.submittedAt) > 60_000
            return (
              <section className="eod-day" key={eod.id} aria-label={`EOD for ${fmtLongDay(eod.date)}`}>
                <div className="eod-day__head">
                  <h2>{fmtLongDay(eod.date)}</h2>
                  <span className="badge badge--ok"><span className="dot" />Submitted {fmtTime(eod.submittedAt)}{edited ? ` · edited ${fmtTime(eod.updatedAt)}` : ''}</span>
                </div>
                <SubmittedEod entries={eod.entries} remarks={eod.remarks} plan={eod.plan} />
              </section>
            )
          })}
        </>
      ) : <p className="empty-state empty-state--large">No EODs from {employee.name} in {fmtMonth(data.month)}.</p>}
    </main>
  )
}
