import { useCallback, useEffect, useState, type DependencyList } from 'react'
import { errorMessage } from './api'

// Render's free plan sleeps after 15 idle minutes; the first request then
// takes up to a minute while it wakes.
export const SLOW_NOTE = 'The server may be waking up, which can take up to a minute.'

// Loads from the API whenever deps change. A response that arrives after the
// deps have moved on is dropped, so fast filter changes never show stale data.
export function useApi<T>(load: () => Promise<T>, deps: DependencyList) {
  const [data, setDataState] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let current = true
    setLoading(true)
    setError('')
    load().then(
      (result) => {
        if (!current) return
        setDataState(result)
        setLoading(false)
      },
      (reason) => {
        if (!current) return
        setError(errorMessage(reason))
        setLoading(false)
      },
    )
    return () => {
      current = false
    }
  }, [...deps, version])

  const setData = useCallback((update: (current: T) => T) => setDataState((current) => (current === null ? current : update(current))), [])
  const reload = useCallback(() => setVersion((value) => value + 1), [])
  return { data, error, loading, setData, reload }
}

// Turns true once `active` has stayed true for a few seconds.
export function useSlow(active: boolean, delay = 5000) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    setSlow(false)
    if (!active) return
    const timer = window.setTimeout(() => setSlow(true), delay)
    return () => window.clearTimeout(timer)
  }, [active, delay])
  return slow
}
