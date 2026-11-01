import { useState } from 'react'
import { api, errorMessage } from '../api'
import { useApi } from '../hooks'
import type { Project } from '../types'
import LoadState from './LoadState'

interface Props {
  onToast: (message: string) => void
}

export default function Projects({ onToast }: Props) {
  const list = useApi(() => api.projects.list(), [])
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [renaming, setRenaming] = useState<{ projectId: string; index: number; value: string } | null>(null)
  const projects = list.data ?? []
  const active = projects.filter((project) => !project.archived)
  const archived = projects.filter((project) => project.archived)

  const replace = (project: Project) => list.setData((current) => current.map((item) => (item.id === project.id ? project : item)))

  // Every change returns the updated project from the API.
  const run = async (action: () => Promise<Project>, message?: string) => {
    try {
      replace(await action())
      if (message) onToast(message)
    } catch (reason) {
      onToast(errorMessage(reason))
    }
  }

  const create = async () => {
    const clean = name.trim()
    if (!clean) { setError('Give the project a name.'); return }
    if (projects.some((project) => project.name.toLowerCase() === clean.toLowerCase())) { setError('A project with this name already exists.'); return }
    setBusy(true)
    try {
      const project = await api.projects.create(clean)
      list.setData((current) => [...current, project])
      setCreating(false)
      setName('')
      onToast(`${clean} created`)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  const saveRename = () => {
    if (!renaming) return
    const { projectId, index, value } = renaming
    const clean = value.trim()
    const project = projects.find((item) => item.id === projectId)
    setRenaming(null)
    if (clean && project && clean !== project.episodes[index]) void run(() => api.projects.renameEpisode(projectId, index, clean))
  }

  return (
    <main className="page page--medium">
      <section className="section-head">
        <div className="page-heading"><h1>Projects</h1><p>{list.data ? `${active.length} active · ${archived.length} archived` : ' '}</p></div>
        <button className="button button--primary" type="button" disabled={!list.data} onClick={() => setCreating(true)}>New project</button>
      </section>

      {creating ? (
        <section className="create-panel">
          <div className="field"><label htmlFor="project-name">Project name</label><input id="project-name" autoFocus value={name} onChange={(event) => { setName(event.target.value); setError('') }} onKeyDown={(event) => { if (event.key === 'Enter') create(); if (event.key === 'Escape') setCreating(false) }} placeholder="e.g. Ramayan – Part 2" />{error ? <span className="field-error">{error}</span> : null}</div>
          <div className="button-row"><button className="button button--secondary" type="button" onClick={() => setCreating(false)}>Cancel</button><button className="button button--primary" type="button" disabled={busy} onClick={create}>Create with EP 01</button></div>
        </section>
      ) : null}

      {!list.data ? <LoadState error={list.error} onRetry={list.reload} /> : (
        <>
          <section className="project-list">
            {active.map((project) => (
              <article className="card project-card" key={project.id}>
                <header><div><h2>{project.name}</h2><span>{project.episodes.length} episodes</span></div><button className="button button--secondary button--compact" type="button" onClick={() => run(() => api.projects.update(project.id, { archived: true }), `${project.name} archived`)}>Archive</button></header>
                <div className="episode-list">
                  {project.episodes.map((episode, index) => {
                    const editing = renaming?.projectId === project.id && renaming.index === index
                    return editing ? (
                      <input className="episode-edit mono" autoFocus key={`${episode}-${index}`} value={renaming.value} onChange={(event) => setRenaming({ ...renaming, value: event.target.value })} onBlur={saveRename} onKeyDown={(event) => { if (event.key === 'Enter') saveRename(); if (event.key === 'Escape') setRenaming(null) }} />
                    ) : (
                      <button className="episode-chip mono" type="button" key={`${episode}-${index}`} onClick={() => setRenaming({ projectId: project.id, index, value: episode })}>{episode}</button>
                    )
                  })}
                  <button className="episode-add mono" type="button" onClick={() => run(() => api.projects.addEpisode(project.id))}>+ Add EP {String(project.episodes.length + 1).padStart(2, '0')}</button>
                </div>
              </article>
            ))}
            {!active.length ? <div className="empty-state empty-state--large">No active projects. Create one to start logging work against it.</div> : null}
          </section>

          {archived.length ? <button className="button button--text archived-toggle" type="button" onClick={() => setShowArchived((value) => !value)}>{showArchived ? 'Hide' : 'Show'} archived ({archived.length})</button> : null}
          {showArchived ? <section className="archived-list">{archived.map((project) => <div key={project.id}><span><strong>{project.name}</strong><small>{project.episodes.length} episodes</small></span><button className="button button--secondary button--compact" type="button" onClick={() => run(() => api.projects.update(project.id, { archived: false }), `${project.name} restored`)}>Restore</button></div>)}</section> : null}
        </>
      )}
    </main>
  )
}
