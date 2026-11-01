import { useState } from 'react'
import { uid } from '../data'
import type { Project } from '../types'

interface Props {
  projects: Project[]
  onProjects: React.Dispatch<React.SetStateAction<Project[]>>
  onToast: (message: string) => void
}

export default function Projects({ projects, onProjects, onToast }: Props) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [renaming, setRenaming] = useState<{ projectId: string; index: number; value: string } | null>(null)
  const active = projects.filter((project) => !project.archived)
  const archived = projects.filter((project) => project.archived)

  const create = () => {
    const clean = name.trim()
    if (!clean) { setError('Give the project a name.'); return }
    if (projects.some((project) => project.name.toLowerCase() === clean.toLowerCase())) { setError('A project with this name already exists.'); return }
    onProjects((current) => [...current, { id: uid('project'), name: clean, episodes: ['EP 01'], archived: false }])
    setCreating(false)
    setName('')
    onToast(`${clean} created`)
  }

  const updateProject = (id: string, updater: (project: Project) => Project) => onProjects((current) => current.map((project) => project.id === id ? updater(project) : project))

  const saveRename = () => {
    if (!renaming) return
    const clean = renaming.value.trim()
    if (clean) updateProject(renaming.projectId, (project) => ({ ...project, episodes: project.episodes.map((episode, index) => index === renaming.index ? clean : episode) }))
    setRenaming(null)
  }

  return (
    <main className="page page--medium">
      <section className="section-head">
        <div className="page-heading"><h1>Projects</h1><p>{active.length} active · {archived.length} archived</p></div>
        <button className="button button--primary" type="button" onClick={() => setCreating(true)}>New project</button>
      </section>

      {creating ? (
        <section className="create-panel">
          <div className="field"><label htmlFor="project-name">Project name</label><input id="project-name" autoFocus value={name} onChange={(event) => { setName(event.target.value); setError('') }} onKeyDown={(event) => { if (event.key === 'Enter') create(); if (event.key === 'Escape') setCreating(false) }} placeholder="e.g. Ramayan – Part 2" />{error ? <span className="field-error">{error}</span> : null}</div>
          <div className="button-row"><button className="button button--secondary" type="button" onClick={() => setCreating(false)}>Cancel</button><button className="button button--primary" type="button" onClick={create}>Create with EP 01</button></div>
        </section>
      ) : null}

      <section className="project-list">
        {active.map((project) => (
          <article className="card project-card" key={project.id}>
            <header><div><h2>{project.name}</h2><span>{project.episodes.length} episodes</span></div><button className="button button--secondary button--compact" type="button" onClick={() => { updateProject(project.id, (item) => ({ ...item, archived: true })); onToast(`${project.name} archived`) }}>Archive</button></header>
            <div className="episode-list">
              {project.episodes.map((episode, index) => {
                const editing = renaming?.projectId === project.id && renaming.index === index
                return editing ? (
                  <input className="episode-edit mono" autoFocus key={`${episode}-${index}`} value={renaming.value} onChange={(event) => setRenaming({ ...renaming, value: event.target.value })} onBlur={saveRename} onKeyDown={(event) => { if (event.key === 'Enter') saveRename(); if (event.key === 'Escape') setRenaming(null) }} />
                ) : (
                  <button className="episode-chip mono" type="button" key={`${episode}-${index}`} onClick={() => setRenaming({ projectId: project.id, index, value: episode })}>{episode}</button>
                )
              })}
              <button className="episode-add mono" type="button" onClick={() => updateProject(project.id, (item) => ({ ...item, episodes: [...item.episodes, `EP ${String(item.episodes.length + 1).padStart(2, '0')}`] }))}>+ Add EP {String(project.episodes.length + 1).padStart(2, '0')}</button>
            </div>
          </article>
        ))}
        {!active.length ? <div className="empty-state empty-state--large">No active projects. Create one to start logging work against it.</div> : null}
      </section>

      {archived.length ? <button className="button button--text archived-toggle" type="button" onClick={() => setShowArchived((value) => !value)}>{showArchived ? 'Hide' : 'Show'} archived ({archived.length})</button> : null}
      {showArchived ? <section className="archived-list">{archived.map((project) => <div key={project.id}><span><strong>{project.name}</strong><small>{project.episodes.length} episodes</small></span><button className="button button--secondary button--compact" type="button" onClick={() => updateProject(project.id, (item) => ({ ...item, archived: false }))}>Restore</button></div>)}</section> : null}
    </main>
  )
}
