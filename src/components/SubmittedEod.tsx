import { entryTitle, lineSummary, statusTone } from '../data'
import type { LineItem } from '../types'

interface Props {
  entries: { id: string; project: string; episode: string; scene: string; kind: string; status: string; lines: LineItem[] }[]
  remarks: string
  plan: string
}

// A submitted EOD, read-only: scene entries with their work lines, then notes.
// Shown to the employee after submitting and to the manager in EOD history.
export default function SubmittedEod({ entries, remarks, plan }: Props) {
  return (
    <>
      <div className="submitted-list">
        {entries.map((entry) => (
          <article className="card submitted-card" key={entry.id}>
            <div className="submitted-card__head">
              <h2>{entryTitle(entry)}</h2>
              <div className="badge-row">
                <span className="badge badge--neutral">{entry.kind}</span>
                <span className={`badge badge--${statusTone(entry.status)}`}>{entry.status}</span>
              </div>
            </div>
            {entry.lines.map((line) => (
              <div className="logged-line logged-line--readonly" key={line.id}>
                <span className="badge badge--neutral">{line.type === 'image' ? 'Image' : 'Clip'}</span>
                <strong>{lineSummary(line)}</strong>
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
    </>
  )
}
