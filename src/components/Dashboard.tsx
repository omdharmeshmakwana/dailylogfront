import { useMemo, useState } from 'react'
import { allOutputs, dashboardOutput, managerNotes, missedEmployees, teamFeed } from '../data'
import type { Employee, Project } from '../types'

interface Props {
  employees: Employee[]
  projects: Project[]
  onToast: (message: string) => void
}

export default function Dashboard({ employees, projects, onToast }: Props) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day')
  const [project, setProject] = useState('')
  const [episode, setEpisode] = useState('')
  const [employee, setEmployee] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])
  const [reminded, setReminded] = useState<string[]>([])
  const activeEmployees = employees.filter((item) => item.active)
  const activeProjects = projects.filter((item) => !item.archived)
  const currentProject = activeProjects.find((item) => item.name === project)

  const outputRows = useMemo(() => {
    const factor = period === 'day' ? 1 : period === 'week' ? 3.8 : 14.2
    return allOutputs.map((item) => ({
      ...item,
      value: Math.round(dashboardOutput[item.key] * factor),
    }))
  }, [period])
  const total = outputRows.reduce((sum, row) => sum + row.value, 0)

  const filteredFeed = teamFeed.filter((item) => (!project || item.project === project) && (!episode || item.episode === episode) && (!employee || item.name === employee))
  const clearFilters = () => {
    setProject('')
    setEpisode('')
    setEmployee('')
  }
  const hasFilters = project || episode || employee

  return (
    <main className="page page--wide">
      <section className="dashboard-head">
        <div className="page-heading">
          <h1>Dashboard</h1>
          <p>Today, Thu 29 Oct 2026</p>
        </div>
        <div className="filter-bar" aria-label="Dashboard filters">
          <input type="date" value="2026-10-29" readOnly aria-label="Dashboard date" />
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
            {activeEmployees.map((item) => <option key={item.email}>{item.name}</option>)}
          </select>
          {hasFilters ? <button className="button button--text button--accent-text" type="button" onClick={clearFilters}>Clear filters</button> : null}
        </div>
      </section>

      <section className="summary-grid" aria-label="Daily summary">
        <Summary label="Present" value={19} detail={`of ${activeEmployees.length} people`} tone="ok" />
        <Summary label="Absent / leave" value={2} detail="Includes planned leave" tone="violet" />
        <Summary label="EOD submitted" value={14} detail="74% of people present" tone="accent" />
        <Summary label="EOD missed" value={5} detail="Due 6:30 PM" tone="danger" danger />
      </section>

      <div className="dashboard-columns">
        <div className="dashboard-main">
          <article className="card output-card">
            <header className="card-heading">
              <div><h2>Output</h2><span>{period === 'day' ? '29 Oct · today' : period === 'week' ? '26 Oct – 29 Oct' : '1 Oct – 29 Oct'}</span></div>
              <strong className="mono">{total} <small>total</small></strong>
            </header>
            <div className="output-grid">
              {outputRows.map((row) => (
                <div className="output-cell" key={row.key}>
                  <strong className="mono">{row.value}</strong>
                  <span>{row.plural}</span>
                </div>
              ))}
            </div>
            <div className="breakdown">
              <h3>By project and episode</h3>
              <div className="breakdown__head"><span>Project</span><span>Images</span><span>Clips</span><span>Total</span></div>
              {[
                ['18 days', 58, 24],
                ['EP 01', 29, 11],
                ['EP 02', 18, 7],
                ['DVA', 31, 19],
                ['EP 03', 17, 13],
                ['Yash – Sadma', 38, 26],
              ].filter(([name]) => !project || name === project || String(name).startsWith('EP')).map(([name, images, clips], index) => {
                const isEpisode = String(name).startsWith('EP')
                const rowTotal = Number(images) + Number(clips)
                return (
                  <div className={`breakdown__row ${isEpisode ? 'breakdown__row--episode' : ''}`} key={`${name}-${index}`}>
                    <span>{isEpisode ? <i style={{ width: `${Math.max(12, rowTotal)}%` }} /> : null}{name}</span>
                    <span className="mono">{images}</span><span className="mono">{clips}</span><strong className="mono">{rowTotal}</strong>
                  </div>
                )
              })}
            </div>
          </article>

          <article className="card feed-card">
            <header className="card-heading"><div><h2>Team feed</h2><span>{filteredFeed.length} submitted</span></div></header>
            {filteredFeed.length ? filteredFeed.map((item) => {
              const open = expanded.includes(item.name)
              return (
                <div className="feed-item" key={item.name}>
                  <button className="feed-item__summary" type="button" onClick={() => setExpanded((current) => current.includes(item.name) ? current.filter((name) => name !== item.name) : [...current, item.name])}>
                    <span className="avatar">{item.name.charAt(0)}</span>
                    <span><strong>{item.name}</strong><small>Submitted {item.time} · {item.scenes} scenes · {item.outputs} outputs</small></span>
                    <span className="feed-item__toggle">{open ? 'Hide ▴' : 'Show ▾'}</span>
                  </button>
                  {open ? (
                    <div className="feed-detail">
                      <div><strong>{item.project} · {item.episode} · {item.scene}</strong><span className="badge badge--neutral">{item.kind}</span><span className="badge badge--info">{item.status}</span></div>
                      <p>{item.note}</p>
                    </div>
                  ) : null}
                </div>
              )
            }) : <p className="empty-state">No submitted EODs match this selection.</p>}
          </article>
        </div>

        <aside className="dashboard-rail">
          <article className="card missed-card">
            <header className="card-heading"><div><h2>Missed EOD</h2><span className="badge badge--danger">{missedEmployees.length}</span></div>
              {reminded.length < missedEmployees.length ? <button className="button button--secondary button--compact" type="button" onClick={() => { setReminded(missedEmployees); onToast(`Reminders sent to ${missedEmployees.length} people`) }}>Remind all</button> : null}
            </header>
            {missedEmployees.map((name) => (
              <div className="missed-row" key={name}>
                <span className="avatar">{name.charAt(0)}</span>
                <span><strong>{name}</strong><small>Checked in 9:40 AM · WFH</small></span>
                {reminded.includes(name) ? <em>Reminder sent</em> : <button type="button" onClick={() => { setReminded((current) => [...current, name]); onToast(`Reminder sent to ${name}`) }}>Send reminder</button>}
              </div>
            ))}
          </article>

          <article className="card notes-panel">
            <header className="card-heading"><div><h2>Notes</h2><span>Tomorrow's plan and feedback</span></div></header>
            {managerNotes.map((note) => (
              <div className={`note-row ${note.tone ? `note-row--${note.tone}` : ''}`} key={note.name}>
                <div><strong>{note.name}</strong>{note.flag ? <span className={`badge badge--${note.tone}`}>{note.flag}</span> : null}</div>
                <p>{note.text}</p>
              </div>
            ))}
          </article>
        </aside>
      </div>
    </main>
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
