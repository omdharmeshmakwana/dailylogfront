import { useState } from 'react'
import { api, errorMessage, type Dashboard as DashboardData, type PlanFlag, type SessionUser } from '../api'
import { allOutputs, entryTitle, lineSummary, statusTone } from '../data'
import { fmtClock, fmtDay, fmtLongDay, fmtTime } from '../dates'
import { useApi } from '../hooks'
import LoadState from './LoadState'

interface Props {
  user: SessionUser
  onToast: (message: string) => void
}

// "Send data" opens a Gmail draft to this address.
const DATA_RECIPIENT = 'rushik@faiblemedia.com'

const flags: Record<PlanFlag, { label: string; tone: string }> = {
  leave: { label: 'On leave', tone: 'violet' },
  early: { label: 'Leaving early', tone: 'warn' },
  late: { label: 'Coming late', tone: 'warn' },
  wfh: { label: 'WFH', tone: 'info' },
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

function checkInLabel(person: DashboardData['missed'][number]) {
  const suffix = person.status === 'wfh' ? ' · WFH' : person.status === 'half' ? ' · Half day' : ''
  return person.checkIn ? `Checked in ${person.checkIn}${suffix}` : `No check-in${suffix}`
}

export default function Dashboard({ user, onToast }: Props) {
  const [date, setDate] = useState('')
  const [period, setPeriod] = useState<DashboardData['period']>('day')
  const [project, setProject] = useState('')
  const [episode, setEpisode] = useState('')
  const [employee, setEmployee] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])
  const [reminding, setReminding] = useState(false)
  const [sending, setSending] = useState(false)
  const lists = useApi(() => Promise.all([api.projects.list(), api.employees.list()]), [])
  const board = useApi(() => api.dashboard({ date, period, project, episode, employee }), [date, period, project, episode, employee])

  const activeProjects = (lists.data?.[0] ?? []).filter((item) => !item.archived)
  const activeEmployees = (lists.data?.[1] ?? []).filter((item) => item.active)
  const currentProject = activeProjects.find((item) => item.name === project)
  const data = board.data
  const hasFilters = project || episode || employee

  const clearFilters = () => {
    setProject('')
    setEpisode('')
    setEmployee('')
  }

  const remind = async (emails: string[]) => {
    setReminding(true)
    try {
      const result = await api.reminders.send(emails)
      const sentAt = new Map(result.sent.map((item) => [item.email, item.sentAt]))
      board.setData((current) => ({
        ...current,
        missed: current.missed.map((item) => ({ ...item, reminderSentAt: sentAt.get(item.email) ?? item.reminderSentAt })),
      }))
      onToast(result.sent.length === 1 ? `Reminder sent to ${result.sent[0].name}` : `Reminders sent to ${result.sent.length} people`)
    } catch (reason) {
      onToast(errorMessage(reason))
    } finally {
      setReminding(false)
    }
  }

  // Gmail drafts can't be given attachments, so the draft carries a 7-day
  // download link to the full export instead. The tab opens inside the click
  // (so pop-up blockers allow it) and moves to Gmail once the link is ready.
  const sendData = async () => {
    const tab = window.open('', '_blank')
    if (tab) {
      tab.opener = null
      tab.document.title = 'Preparing email…'
      if (tab.document.body) tab.document.body.textContent = 'Preparing the email…'
    }
    setSending(true)
    try {
      const link = await api.exportLink()
      const body = [
        'Hi Rushik,',
        '',
        "Here's the latest Daily Log data: everyone's EODs and attendance, day by day, in one CSV sheet.",
        '',
        `Download: ${link.url}`,
        '',
        `The link gets a fresh copy of the data each time it's opened and works until ${fmtLongDay(link.expires)}.`,
      ].join('\n')
      const fields = { authuser: user.email, view: 'cm', fs: '1', to: DATA_RECIPIENT, su: `Daily Log data – ${fmtLongDay(link.today)}`, body }
      const compose = `https://mail.google.com/mail/?${Object.entries(fields).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')}`
      if (tab) tab.location.href = compose
      else window.location.assign(compose)
      onToast('Gmail draft opened. Press Send there.')
    } catch (reason) {
      tab?.close()
      onToast(errorMessage(reason))
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="page page--wide">
      <section className="dashboard-head">
        <div className="page-heading">
          <h1>Dashboard</h1>
          <p>{data ? `${data.isToday ? 'Today, ' : ''}${fmtLongDay(data.date)}` : ' '}</p>
        </div>
        <div className="filter-bar" aria-label="Dashboard filters">
          <input
            type="date"
            value={data?.date ?? date}
            max={data?.today}
            onChange={(event) => {
              const value = event.target.value
              if (value) setDate(data && value > data.today ? data.today : value)
            }}
            aria-label="Dashboard date"
          />
          <div className="segmented" role="group" aria-label="Period">
            {(['day', 'week', 'month'] as const).map((value) => (
              <button className={period === value ? 'segmented__active' : ''} type="button" key={value} onClick={() => setPeriod(value)}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
          <select value={project} onChange={(event) => { setProject(event.target.value); setEpisode('') }} aria-label="Project filter">
            <option value="">All projects</option>
            {activeProjects.map((item) => <option key={item.id}>{item.name}</option>)}
          </select>
          <select value={episode} disabled={!project} onChange={(event) => setEpisode(event.target.value)} aria-label="Episode filter">
            <option value="">All episodes</option>
            {currentProject?.episodes.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={employee} onChange={(event) => setEmployee(event.target.value)} aria-label="Employee filter">
            <option value="">All employees</option>
            {activeEmployees.map((item) => <option key={item.id} value={item.email}>{item.name}</option>)}
          </select>
          {hasFilters ? <button className="button button--text button--accent-text" type="button" onClick={clearFilters}>Clear filters</button> : null}
          <button className="button button--primary" type="button" disabled={sending} onClick={sendData} title={`Email all data to ${DATA_RECIPIENT}`}>
            {sending ? 'Preparing…' : 'Send data'}
          </button>
        </div>
      </section>

      {!data ? <LoadState error={board.error} onRetry={board.reload} /> : (
        <>
          {board.error ? <div className="submit-error" role="alert">{board.error}</div> : null}

          <section className="summary-grid" aria-label="Daily summary">
            <Summary label="Present" value={data.summary.present} detail={data.noWork || `of ${data.summary.people} ${data.summary.people === 1 ? 'person' : 'people'}`} tone="ok" />
            <Summary label="Absent / leave" value={data.summary.away} detail={data.noWork ? '—' : 'Includes planned leave'} tone="violet" />
            <Summary label="EOD submitted" value={data.summary.submitted} detail={data.summary.submittedPercent === null ? '—' : `${data.summary.submittedPercent}% of people present`} tone="accent" />
            <Summary label="EOD missed" value={data.summary.missed} detail={data.isToday ? `Due ${fmtClock(data.eodDue)}` : 'Not submitted that day'} tone="danger" danger={data.summary.missed > 0} />
          </section>

          <div className="dashboard-columns">
            <div className="dashboard-main">
              <article className="card output-card">
                <header className="card-heading">
                  <div>
                    <h2>Output</h2>
                    <span>{data.period === 'day' ? `${fmtDay(data.date)}${data.isToday ? ' · today' : ''}` : `${fmtDay(data.periodStart)} – ${fmtDay(data.periodEnd)}`}</span>
                  </div>
                  <strong className="mono">{data.totalOutputs} <small>total</small></strong>
                </header>
                <div className="output-grid">
                  {allOutputs.map((item) => (
                    <div className="output-cell" key={item.key}>
                      <strong className="mono">{data.outputs[item.key]}</strong>
                      <span>{item.plural}</span>
                    </div>
                  ))}
                </div>
                <div className="breakdown">
                  <h3>By project and episode</h3>
                  <div className="breakdown__head"><span>Project</span><span>Images</span><span>Clips</span><span>Total</span></div>
                  {data.breakdown.length ? data.breakdown.flatMap((row) => [
                    <div className="breakdown__row" key={row.project}>
                      <span>{row.project}</span>
                      <span className="mono">{row.images}</span><span className="mono">{row.clips}</span><strong className="mono">{row.total}</strong>
                    </div>,
                    ...row.episodes.map((item) => (
                      <div className="breakdown__row breakdown__row--episode" key={`${row.project}|${item.episode}`}>
                        <span><i style={{ width: `${Math.max(2, Math.round(item.share * 0.12))}px` }} />{item.episode}</span>
                        <span className="mono">{item.images}</span><span className="mono">{item.clips}</span><strong className="mono">{item.total}</strong>
                      </div>
                    )),
                  ]) : <p className="empty-state">No output logged for this selection.</p>}
                </div>
              </article>

              <article className="card feed-card">
                <header className="card-heading"><div><h2>Team feed</h2><span>{data.feed.length} submitted</span></div></header>
                {data.feed.length ? data.feed.map((item) => {
                  const open = expanded.includes(item.employee.email)
                  return (
                    <div className="feed-item" key={item.employee.id}>
                      <button
                        className="feed-item__summary"
                        type="button"
                        onClick={() => setExpanded((current) => current.includes(item.employee.email) ? current.filter((email) => email !== item.employee.email) : [...current, item.employee.email])}
                      >
                        <span className="avatar">{item.employee.name.charAt(0)}</span>
                        <span><strong>{item.employee.name}</strong><small>Submitted {fmtTime(item.submittedAt)} · {plural(item.scenes, 'scene')} · {plural(item.outputs, 'output')}</small></span>
                        <span className="feed-item__toggle">{open ? 'Hide ▴' : 'Show ▾'}</span>
                      </button>
                      {open ? item.entries.map((entry) => (
                        <div className="feed-detail" key={entry.id}>
                          <div><strong>{entryTitle(entry)}</strong><span className="badge badge--neutral">{entry.kind}</span><span className={`badge badge--${statusTone(entry.status)}`}>{entry.status}</span></div>
                          {entry.lines.map((line) => <p key={line.id}>{line.type === 'image' ? 'Image' : 'Clip'} · {lineSummary(line)} · {line.text}</p>)}
                        </div>
                      )) : null}
                    </div>
                  )
                }) : <p className="empty-state">{data.noWork || (hasFilters ? 'No submitted EODs match these filters.' : 'No EODs submitted yet for this day.')}</p>}
              </article>
            </div>

            <aside className="dashboard-rail">
              <MissedCard data={data} reminding={reminding} onRemind={remind} />

              <article className="card notes-panel">
                <header className="card-heading"><div><h2>Notes</h2><span>Tomorrow's plan and feedback</span></div></header>
                {data.plans.length ? <h3 className="notes-group">Tomorrow's plan and availability</h3> : null}
                {data.plans.map((note) => {
                  const flag = note.flag ? flags[note.flag] : null
                  return (
                    <div className={`note-row ${flag ? `note-row--${flag.tone}` : ''}`} key={`plan-${note.email}`}>
                      <div><strong>{note.name}</strong>{flag ? <span className={`badge badge--${flag.tone}`}>{flag.label}</span> : null}</div>
                      <p>{note.text}</p>
                    </div>
                  )
                })}
                {data.remarks.length ? <h3 className="notes-group">Suggestions, remarks and feedback</h3> : null}
                {data.remarks.map((note) => (
                  <div className="note-row" key={`remark-${note.email}`}>
                    <div><strong>{note.name}</strong></div>
                    <p>{note.text}</p>
                  </div>
                ))}
                {!data.plans.length && !data.remarks.length ? <p className="empty-state">No notes for this day.</p> : null}
              </article>
            </aside>
          </div>
        </>
      )}
    </main>
  )
}

function MissedCard({ data, reminding, onRemind }: { data: DashboardData; reminding: boolean; onRemind: (emails: string[]) => void }) {
  const pending = data.missed.filter((item) => !item.reminderSentAt)
  return (
    <article className="card missed-card">
      <header className="card-heading">
        <div><h2>Missed EOD</h2><span className="badge badge--danger">{data.missed.length}</span></div>
        {data.isToday && pending.length > 1 ? (
          <button className="button button--secondary button--compact" type="button" disabled={reminding} onClick={() => onRemind(pending.map((item) => item.email))}>Remind all</button>
        ) : null}
      </header>
      {data.missed.length ? data.missed.map((item) => (
        <div className="missed-row" key={item.id}>
          <span className="avatar">{item.name.charAt(0)}</span>
          <span><strong>{item.name}</strong><small>{checkInLabel(item)}</small></span>
          {!data.isToday ? <small>Missed</small>
            : item.reminderSentAt ? <em>Reminder sent · {fmtTime(item.reminderSentAt)}</em>
              : <button type="button" disabled={reminding} onClick={() => onRemind([item.email])}>Send reminder</button>}
        </div>
      )) : <p className="empty-state">{data.noWork || 'Everyone present has submitted.'}</p>}
    </article>
  )
}

function Summary({ label, value, detail, tone, danger = false }: { label: string; value: number; detail: string; tone: string; danger?: boolean }) {
  return (
    <article className="card summary-card">
      <span><i className={`tone-dot tone-dot--${tone}`} />{label}</span>
      <strong className={`mono ${danger ? 'text-danger' : ''}`}>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}
