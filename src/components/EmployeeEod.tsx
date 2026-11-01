import { useMemo, useState } from 'react'
import { demoScene, emptyScene, kinds, outputs, statuses, titleForLine, uid } from '../data'
import type { Employee, Project, SceneEntry, WorkType } from '../types'

interface Props {
  employee: Employee
  projects: Project[]
  onToast: (message: string) => void
}

type Stage = 'edit' | 'confirm' | 'done'

function toneForStatus(status: string) {
  if (status === 'Done') return 'ok'
  if (status === 'On hold') return 'warn'
  if (status === 'Sent for approval') return 'violet'
  return 'info'
}

export default function EmployeeEod({ employee, projects, onToast }: Props) {
  const [entries, setEntries] = useState<SceneEntry[]>([demoScene()])
  const [remarks, setRemarks] = useState('')
  const [plan, setPlan] = useState('')
  const [stage, setStage] = useState<Stage>('edit')
  const [submitError, setSubmitError] = useState('')
  const [submittedAt, setSubmittedAt] = useState('5:48 PM')

  const activeProjects = projects.filter((project) => !project.archived)
  const totalLines = entries.reduce((sum, entry) => sum + entry.lines.length, 0)
  const totalOutputs = entries.reduce(
    (sum, entry) => sum + entry.lines.reduce((lineSum, line) => lineSum + line.items.reduce((itemSum, item) => itemSum + item.count, 0), 0),
    0,
  )

  const updateEntry = (id: string, updater: Partial<SceneEntry> | ((entry: SceneEntry) => SceneEntry)) => {
    setEntries((current) => current.map((entry) => {
      if (entry.id !== id) return entry
      return typeof updater === 'function' ? updater(entry) : { ...entry, ...updater }
    }))
    setSubmitError('')
  }

  const validate = () => {
    let issues = 0
    const checked = entries.map((entry) => {
      const errors: SceneEntry['errors'] = {}
      if (!entry.project) errors.project = 'Choose a project.'
      if (!entry.episode) errors.episode = 'Choose an episode.'
      if (!entry.kind) errors.kind = 'Choose the kind of work.'
      if (!entry.status) errors.status = 'Choose a status.'
      const hasDraft = Object.keys(entry.selected).length > 0 || Boolean(entry.text.trim())
      if (hasDraft) errors.unsaved = 'You have unsaved picks or text here. Save them as a line or cancel.'
      if (!entry.lines.length && !hasDraft) errors.lines = 'Add at least one line: pick outputs, describe them, then Save.'
      issues += Object.keys(errors).length
      return { ...entry, errors }
    })
    setEntries(checked)
    if (issues) {
      setSubmitError(`Fix ${issues} ${issues === 1 ? 'item' : 'items'} marked in red before submitting.`)
      return
    }
    setStage('confirm')
  }

  const readonlyEntries = useMemo(() => entries.map((entry) => ({ ...entry, title: [entry.project, entry.episode, entry.scene].filter(Boolean).join(' · ') })), [entries])

  if (stage === 'done') {
    return (
      <main className="page page--eod">
        <div className="page-heading page-heading--split">
          <div>
            <h1>My EOD · 29 Oct</h1>
            <p>{employee.name}</p>
          </div>
          <span className="badge badge--ok"><span className="dot" />Submitted at {submittedAt}</span>
        </div>

        <section className="notice notice--ok">
          <div>
            <strong>EOD submitted at {submittedAt}</strong>
            <p>Thanks, {employee.name}. Your manager can see it on the dashboard now.</p>
          </div>
          <button className="button button--secondary" type="button" onClick={() => setStage('edit')}>Edit EOD</button>
        </section>

        <div className="submitted-list">
          {readonlyEntries.map((entry) => (
            <article className="card submitted-card" key={entry.id}>
              <div className="submitted-card__head">
                <h2>{entry.title}</h2>
                <div className="badge-row">
                  <span className="badge badge--neutral">{entry.kind}</span>
                  <span className={`badge badge--${toneForStatus(entry.status)}`}>{entry.status}</span>
                </div>
              </div>
              {entry.lines.map((line) => (
                <div className="logged-line logged-line--readonly" key={line.id}>
                  <span className="badge badge--neutral">{line.type === 'image' ? 'Image' : 'Clip'}</span>
                  <strong>{line.items.map((item) => titleForLine(item.k, item.count)).join(' + ')}</strong>
                  <span>{line.text}</span>
                </div>
              ))}
            </article>
          ))}
        </div>

        {remarks || plan ? (
          <section className="notes-grid">
            {remarks ? <article className="card"><h2>Suggestion / remarks / feedback</h2><p>{remarks}</p></article> : null}
            {plan ? <article className="card"><h2>Tomorrow's plan and availability</h2><p>{plan}</p></article> : null}
          </section>
        ) : null}
      </main>
    )
  }

  return (
    <main className="page page--eod">
      <div className="page-heading page-heading--split">
        <div>
          <h1>My EOD · 29 Oct</h1>
          <p>{employee.name}</p>
        </div>
        <span className="badge badge--warn"><span className="dot" />EOD due 6:30 PM · 25 min left</span>
      </div>

      <section className="notice notice--warn">
        <span className="notice__symbol" aria-hidden="true">!</span>
        <div>
          <strong>EOD due in 25 minutes</strong>
          <p>Save any open lines in your scene entries and submit before 6:30 PM.</p>
        </div>
      </section>

      {entries.map((entry, index) => (
        <SceneCard
          key={entry.id}
          entry={entry}
          index={index}
          canRemove={entries.length > 1}
          projects={activeProjects}
          onUpdate={(updater) => updateEntry(entry.id, updater)}
          onRemove={() => setEntries((current) => current.filter((item) => item.id !== entry.id))}
        />
      ))}

      <button className="add-scene" type="button" onClick={() => setEntries((current) => [...current, emptyScene()])}>
        <span aria-hidden="true">+</span> Add another scene
      </button>

      <section className="card notes-card">
        <label htmlFor="remarks">Suggestion / remarks / feedback <span>· optional</span></label>
        <textarea id="remarks" rows={3} value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Anything blocking you, or ideas for the team" />
        <label htmlFor="plan">Tomorrow's plan and availability <span>· optional</span></label>
        <textarea id="plan" rows={3} value={plan} onChange={(event) => setPlan(event.target.value)} placeholder="Work plan, leaving early, coming late, leave…" />
      </section>

      {submitError ? <div className="submit-error" role="alert">{submitError}</div> : null}

      {stage === 'confirm' ? (
        <section className="confirm-panel">
          <div>
            <h2>Submit today's EOD?</h2>
            <p>{entries.length} {entries.length === 1 ? 'scene' : 'scenes'} · {totalLines} lines · {totalOutputs} outputs. You can still edit it afterwards.</p>
          </div>
          <div className="button-row">
            <button className="button button--secondary" type="button" onClick={() => setStage('edit')}>Keep editing</button>
            <button className="button button--primary" type="button" onClick={() => {
              const now = new Date()
              setSubmittedAt(now.getFullYear() === 2026 ? '5:48 PM' : now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
              setStage('done')
              onToast('EOD submitted')
            }}>Confirm and submit</button>
          </div>
        </section>
      ) : (
        <button className="button button--primary submit-eod" type="button" onClick={validate}>Submit EOD</button>
      )}
    </main>
  )
}

interface SceneCardProps {
  entry: SceneEntry
  index: number
  canRemove: boolean
  projects: Project[]
  onUpdate: (updater: Partial<SceneEntry> | ((entry: SceneEntry) => SceneEntry)) => void
  onRemove: () => void
}

function SceneCard({ entry, index, canRemove, projects, onUpdate, onRemove }: SceneCardProps) {
  const project = projects.find((item) => item.name === entry.project)
  const workError = entry.errors.work || entry.errors.lines || entry.errors.unsaved

  const saveLine = () => {
    const selected = Object.entries(entry.selected).filter(([, count]) => Boolean(count)) as [keyof typeof entry.selected, number][]
    let error = ''
    if (!selected.length && !entry.text.trim()) error = 'Pick at least one output and describe what you made.'
    else if (!selected.length) error = 'Pick at least one output above.'
    else if (!entry.text.trim()) error = 'Describe what you made today.'
    if (error) {
      onUpdate({ errors: { ...entry.errors, work: error } })
      return
    }
    onUpdate((current) => ({
      ...current,
      lines: [...current.lines, {
        id: uid('line'),
        type: current.type,
        items: selected.map(([k, count]) => ({ k, count })) as SceneEntry['lines'][number]['items'],
        text: current.text.trim(),
      }],
      selected: {},
      text: '',
      errors: {},
    }))
  }

  return (
    <article className="card scene-card">
      <header className="scene-card__header">
        <div><span className="scene-number">{index + 1}</span><h2>Scene entry</h2></div>
        {canRemove ? <button className="button button--text button--danger-text" type="button" onClick={onRemove}>Remove scene</button> : null}
      </header>

      <div className="scene-grid">
        <Field label="Project" error={entry.errors.project}>
          <select value={entry.project} className={entry.errors.project ? 'field--error' : ''} onChange={(event) => onUpdate({ project: event.target.value, episode: '', errors: {} })}>
            <option value="">Select project</option>
            {projects.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label="Episode" error={entry.errors.episode}>
          <select value={entry.episode} disabled={!project} className={entry.errors.episode ? 'field--error' : ''} onChange={(event) => onUpdate({ episode: event.target.value, errors: {} })}>
            <option value="">{project ? 'Select episode' : 'Pick a project first'}</option>
            {project?.episodes.map((episode) => <option key={episode}>{episode}</option>)}
          </select>
        </Field>
        <Field label="Scene">
          <input value={entry.scene} onChange={(event) => onUpdate({ scene: event.target.value })} placeholder="SC 06, SC 07" />
        </Field>
      </div>

      <div className="field field--narrow">
        <label>Kind of work</label>
        <select value={entry.kind} className={entry.errors.kind ? 'field--error' : ''} onChange={(event) => onUpdate({ kind: event.target.value as SceneEntry['kind'], errors: {} })}>
          <option value="">Select kind</option>
          {kinds.map((kind) => <option key={kind}>{kind}</option>)}
        </select>
        {entry.errors.kind ? <span className="field-error">{entry.errors.kind}</span> : null}
      </div>

      <section className={`work-panel ${workError ? 'work-panel--error' : ''}`}>
        <div className="work-type-row">
          <span className="field-label">Work type</span>
          <div className="segmented segmented--work" role="group" aria-label="Work type">
            {(['image', 'clip'] as WorkType[]).map((type) => (
              <button
                className={entry.type === type ? 'segmented__active' : ''}
                key={type}
                type="button"
                onClick={() => onUpdate({ type, selected: {}, text: '', errors: {} })}
              >
                {type === 'image' ? 'Image' : 'Clip'}
              </button>
            ))}
          </div>
        </div>

        <div className="chip-grid">
          {outputs[entry.type].map((output) => {
            const count = entry.selected[output.key] || 0
            return (
              <div className={`output-chip ${count ? 'output-chip--selected' : ''}`} key={output.key}>
                <button type="button" className="output-chip__label" onClick={() => onUpdate((current) => {
                  const selected = { ...current.selected }
                  if (selected[output.key]) delete selected[output.key]
                  else selected[output.key] = 1
                  return { ...current, selected, errors: {} }
                })}>
                  <span className={`output-chip__mark ${count ? 'output-chip__mark--checked' : ''}`} aria-hidden="true">{count ? '' : '+'}</span>{output.label}
                </button>
                {count ? (
                  <span className="stepper">
                    <button type="button" aria-label={`Decrease ${output.label}`} onClick={() => onUpdate((current) => {
                      const selected = { ...current.selected }
                      const next = (selected[output.key] || 1) - 1
                      if (next <= 0) delete selected[output.key]
                      else selected[output.key] = next
                      return { ...current, selected }
                    })}>−</button>
                    <span>{count}</span>
                    <button type="button" aria-label={`Increase ${output.label}`} onClick={() => onUpdate((current) => ({
                      ...current,
                      selected: { ...current.selected, [output.key]: Math.min(999, (current.selected[output.key] || 0) + 1) },
                    }))}>+</button>
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>

        <label htmlFor={`work-${entry.id}`}>What I made today</label>
        <textarea
          id={`work-${entry.id}`}
          rows={2}
          value={entry.text}
          onChange={(event) => onUpdate({ text: event.target.value, errors: {} })}
          placeholder={entry.type === 'image' ? 'e.g. Kashmir scene revision v3' : 'e.g. lip-sync and changes SC 35, 41, 43'}
        />
        {workError ? <p className="form-error">{workError}</p> : null}
        <div className="work-actions">
          <button className="button button--secondary" type="button" onClick={() => onUpdate({ selected: {}, text: '', errors: {} })}>Cancel</button>
          <button className="button button--accent-outline" type="button" onClick={saveLine}>Save</button>
        </div>
      </section>

      {entry.lines.length ? (
        <section className="logged-lines">
          <h3>Logged for this scene · {entry.lines.length}</h3>
          {entry.lines.map((line) => (
            <div className="logged-line" key={line.id}>
              <span className="badge badge--neutral">{line.type === 'image' ? 'Image' : 'Clip'}</span>
              <strong>{line.items.map((item) => titleForLine(item.k, item.count)).join(' + ')}</strong>
              <span>{line.text}</span>
              <button type="button" aria-label="Remove logged line" onClick={() => onUpdate((current) => ({ ...current, lines: current.lines.filter((item) => item.id !== line.id) }))}>×</button>
            </div>
          ))}
        </section>
      ) : null}

      <div className="field field--narrow">
        <label>Status</label>
        <select value={entry.status} className={entry.errors.status ? 'field--error' : ''} onChange={(event) => onUpdate({ status: event.target.value as SceneEntry['status'], errors: {} })}>
          <option value="">Select status</option>
          {statuses.map((status) => <option key={status}>{status}</option>)}
        </select>
        {entry.errors.status ? <span className="field-error">{entry.errors.status}</span> : null}
      </div>
    </article>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  )
}
