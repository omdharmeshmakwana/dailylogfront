import { SLOW_NOTE, useSlow } from '../hooks'

export default function LoadState({ error, onRetry }: { error: string; onRetry: () => void }) {
  const slow = useSlow(!error)
  if (error) {
    return (
      <div className="empty-state empty-state--large">
        <div className="load-error">
          <p>{error}</p>
          <button className="button button--secondary button--compact" type="button" onClick={onRetry}>Try again</button>
        </div>
      </div>
    )
  }
  return <p className="empty-state" role="status">{slow ? `Still loading. ${SLOW_NOTE}` : 'Loading…'}</p>
}
