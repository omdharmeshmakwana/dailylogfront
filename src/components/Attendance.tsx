import { useEffect, useMemo, useRef, useState } from 'react'
import { api, errorMessage } from '../api'
import { attendanceMeta } from '../data'
import { fmtDay, fmtMonth, isWeekend, monthDays, parseKey, shiftMonth, WEEKDAYS } from '../dates'
import { useApi } from '../hooks'
import type { AttendanceStatus } from '../types'
import LoadState from './LoadState'

interface Props {
  onToast: (message: string) => void
}

type CellStatus = AttendanceStatus | 'weekend' | 'future'
type Cell = { email: string; name: string; date: string }

const statusOrder: AttendanceStatus[] = ['present', 'absent', 'half', 'wfh', 'leave', 'holiday']
const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const cellKey = (cell: { email: string; date: string }) => `${cell.email}|${cell.date}`
const dayLabel = (date: string) => `${WEEKDAYS[parseKey(date).getDay()]}, ${fmtDay(date)}`

export default function Attendance({ onToast }: Props) {
  const [month, setMonth] = useState('')
  // Cells picked for editing. Click adds a cell, double-click removes it.
  const [selected, setSelected] = useState<Cell[]>([])
  const [lastPicked, setLastPicked] = useState<Cell | null>(null)
  const [holidayPanel, setHolidayPanel] = useState(false)
  const [holidayDay, setHolidayDay] = useState('')
  const [saving, setSaving] = useState(false)
  const sheet = useApi(() => api.attendance.month(month), [month])
  const stickyRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLElement>(null)

  const data = sheet.data
  const today = data?.today ?? ''
  const days = useMemo(() => (data ? monthDays(data.month) : []), [data])
  const records = useMemo(() => new Map((data?.records ?? []).map((record) => [cellKey(record), record])), [data])
  const holidays = useMemo(() => new Set(data?.holidays ?? []), [data])
  const weekdays = days.filter((date) => !isWeekend(date))
  const monthLabel = month ? fmtMonth(month) : data ? fmtMonth(data.month) : ''
  const selectedKeys = new Set(selected.map(cellKey))

  // A working day without a mark counts as present, the same rule the dashboard uses.
  const getStatus = (email: string, date: string): CellStatus => {
    if (isWeekend(date)) return 'weekend'
    const record = records.get(`${email}|${date}`)
    if (record) return record.status
    if (holidays.has(date)) return 'holiday'
    if (date > today) return 'future'
    return 'present'
  }

  const rows = (data?.employees ?? []).map((employee) => {
    const totals = { present: 0, absent: 0, half: 0, wfh: 0, leave: 0 }
    days.forEach((date) => {
      const status = getStatus(employee.email, date)
      if (status in totals) totals[status as keyof typeof totals] += 1
    })
    return { employee, totals }
  })

  // The status the selection shares, if any, so its button shows as current.
  const selectedStatuses = new Set(selected.map((cell) => getStatus(cell.email, cell.date)))
  const sharedStatus = selectedStatuses.size === 1 ? [...selectedStatuses][0] : null

  const summary = (() => {
    if (!selected.length) return { title: 'Select cells to mark', detail: 'Click cells to select them. Double-click to deselect.' }
    if (selected.length === 1) {
      const [cell] = selected
      const checkIn = records.get(cellKey(cell))?.checkIn
      return { title: `${cell.name} · ${dayLabel(cell.date)}`, detail: checkIn ? `Checked in ${checkIn}` : sharedStatus === 'future' ? 'Not checked in yet' : 'No check-in' }
    }
    const names = [...new Set(selected.map((cell) => cell.name))]
    const dates = [...new Set(selected.map((cell) => cell.date))]
    const people = names.length <= 3 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2} more`
    const detail = dates.length === 1 ? `${people} · ${dayLabel(dates[0])}` : names.length === 1 ? `${names[0]} · ${dates.length} days` : `${names.length} people · ${dates.length} days`
    return { title: `${selected.length} selected`, detail }
  })()

  // On phones the editor is a bottom sheet. If it ends up covering the cell
  // just picked, nudge the page so that cell stays in view.
  useEffect(() => {
    if (!lastPicked) return
    const frame = window.requestAnimationFrame(() => {
      const cell = document.querySelector(`[data-cell="${cellKey(lastPicked)}"]`)
      const editor = editorRef.current
      if (!cell || !editor || !stickyRef.current) return
      const isSheet = getComputedStyle(editor).position === 'fixed'
      const top = isSheet ? (document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 0) : stickyRef.current.getBoundingClientRect().bottom
      const bottom = isSheet ? editor.getBoundingClientRect().top : window.innerHeight
      const rect = cell.getBoundingClientRect()
      if (rect.top < top + 8) window.scrollBy({ top: rect.top - top - 8 })
      else if (rect.bottom > bottom - 8) window.scrollBy({ top: rect.bottom - bottom + 8 })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [lastPicked])

  const clearSelection = () => {
    setSelected([])
    setLastPicked(null)
  }

  // Click only ever adds, so the two clicks of a double-click can't undo each other.
  const pick = (cell: Cell) => {
    setSelected((current) => (current.some((item) => cellKey(item) === cellKey(cell)) ? current : [...current, cell]))
    setLastPicked(cell)
    setHolidayPanel(false)
  }
  const unpick = (cell: Cell) => setSelected((current) => current.filter((item) => cellKey(item) !== cellKey(cell)))

  const goToMonth = (delta: number) => {
    if (!data) return
    setMonth(shiftMonth(month || data.month, delta))
    clearSelection()
    setHolidayPanel(false)
  }

  // Marks every selected cell; the selection stays so the result is visible.
  const setStatus = async (status: AttendanceStatus) => {
    const cells = selected
    if (!cells.length) return
    setSaving(true)
    const results = await Promise.allSettled(cells.map((cell) => api.attendance.set({ email: cell.email, date: cell.date, status })))
    const savedKeys = new Set(cells.filter((_, index) => results[index].status === 'fulfilled').map(cellKey))
    const saved = results.flatMap((result) => (result.status === 'fulfilled' && result.value ? [result.value] : []))
    sheet.setData((current) => ({
      ...current,
      records: [...current.records.filter((item) => !savedKeys.has(cellKey(item))), ...saved],
    }))
    setSaving(false)

    const label = attendanceMeta[status].label.toLowerCase()
    const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
    if (failure) {
      onToast(savedKeys.size ? `Marked ${savedKeys.size} of ${cells.length} as ${label}. ${errorMessage(failure.reason)}` : errorMessage(failure.reason))
      return
    }
    const names = new Set(cells.map((cell) => cell.name))
    const dates = new Set(cells.map((cell) => cell.date))
    if (cells.length === 1) onToast(`${cells[0].name} marked ${label} for ${fmtDay(cells[0].date)}`)
    else if (dates.size === 1) onToast(`${cells.length} people marked ${label} for ${fmtDay(cells[0].date)}`)
    else if (names.size === 1) onToast(`${cells[0].name} marked ${label} for ${cells.length} days`)
    else onToast(`${cells.length} cells marked ${label}`)
  }

  const openHolidayPanel = () => {
    setHolidayDay(weekdays.find((date) => date >= today && !holidays.has(date)) ?? weekdays[0] ?? '')
    setHolidayPanel(true)
    clearSelection()
  }

  const markHoliday = async () => {
    if (!holidayDay) return
    setSaving(true)
    try {
      await api.holidays.add(holidayDay)
      setHolidayPanel(false)
      sheet.reload()
      onToast(`${fmtDay(holidayDay)} marked as a holiday for everyone`)
    } catch (reason) {
      onToast(errorMessage(reason))
    } finally {
      setSaving(false)
    }
  }

  const exportCsv = () => {
    if (!data) return
    const headings = ['Employee', ...days.map((date) => String(parseKey(date).getDate())), 'Present', 'WFH', 'Half day', 'Leave', 'Absent']
    const lines = [headings.join(',')]
    rows.forEach(({ employee, totals }) => {
      const cells = days.map((date) => {
        const status = getStatus(employee.email, date)
        if (status === 'weekend') return 'WE'
        if (status === 'future') return ''
        return attendanceMeta[status].short
      })
      lines.push([`"${employee.name.replace(/"/g, '""')}"`, ...cells, totals.present, totals.wfh, totals.half, totals.leave, totals.absent].join(','))
    })
    const filename = `attendance-${data.month}.csv`
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
    onToast(`Exported ${filename}`)
  }

  return (
    <main className="page page--wide attendance-page">
      <section className="attendance-head">
        <div className="attendance-title">
          <h1>Attendance</h1>
          <div className="month-switcher">
            <button type="button" aria-label="Previous month" disabled={!data} onClick={() => goToMonth(-1)}>‹</button>
            <strong>{monthLabel}</strong>
            <button type="button" aria-label="Next month" disabled={!data} onClick={() => goToMonth(1)}>›</button>
          </div>
        </div>
        <div className="button-row">
          <button className="button button--secondary" type="button" disabled={!data} onClick={openHolidayPanel}>Mark holiday for everyone</button>
          <button className="button button--primary" type="button" disabled={!data} onClick={exportCsv}>Export</button>
        </div>
      </section>

      <div className="attendance-sticky" ref={stickyRef}>
        <div className="attendance-legend" aria-label="Attendance legend">
          {statusOrder.map((status) => <span key={status}><i className={`att att--${attendanceMeta[status].tone}`}>{attendanceMeta[status].short}</i>{attendanceMeta[status].label}</span>)}
          <span><i className="att att--weekend" />Weekend</span>
        </div>

        {/* Always shown on wide screens so picking the first cell doesn't shift the grid under the pointer. */}
        <section className={`attendance-editor ${selected.length ? '' : 'attendance-editor--empty'}`} ref={editorRef} aria-label="Mark selected cells">
          <div><strong>{summary.title}</strong><span>{summary.detail}</span></div>
          <div className="attendance-editor__buttons">
            {statusOrder.map((status) => (
              <button className={sharedStatus === status ? `att-button att-button--${attendanceMeta[status].tone}` : 'att-button'} type="button" key={status} disabled={saving || !selected.length} onClick={() => setStatus(status)}>{attendanceMeta[status].label}</button>
            ))}
          </div>
          <button className="editor-close" type="button" aria-label="Clear selection" title="Clear selection" disabled={!selected.length} onClick={clearSelection}>×</button>
        </section>
      </div>

      {holidayPanel ? (
        <section className="holiday-panel">
          <div><h2>Mark a studio holiday</h2><p>This replaces individual attendance for everyone on the selected weekday.</p></div>
          <select value={holidayDay} onChange={(event) => setHolidayDay(event.target.value)}>
            {weekdays.map((date) => <option value={date} key={date}>{WEEKDAYS[parseKey(date).getDay()]}, {fmtDay(date)}{holidays.has(date) ? ' · already a holiday' : ''}</option>)}
          </select>
          <button className="button button--secondary" type="button" onClick={() => setHolidayPanel(false)}>Cancel</button>
          <button className="button button--ink" type="button" disabled={saving} onClick={markHoliday}>Mark holiday</button>
        </section>
      ) : null}

      {!data || sheet.loading || sheet.error ? <LoadState error={sheet.error} onRetry={sheet.reload} /> : (
        <section className="card attendance-scroll" aria-label={`${monthLabel} attendance grid`}>
          <div className="attendance-grid" style={{ gridTemplateColumns: `150px repeat(${days.length}, 34px) repeat(5, 40px)` }}>
            <div className="att-head att-name att-sticky">Employee</div>
            {days.map((date) => {
              const day = parseKey(date)
              return <div className={`att-head att-day ${isWeekend(date) ? 'att-cell--weekend' : ''} ${date === today ? 'att-cell--today' : ''}`} key={date}><span>{dayNames[day.getDay()]}</span><strong>{day.getDate()}</strong></div>
            })}
            {['P', 'W', 'H', 'L', 'A'].map((label) => <div className="att-head att-total" key={label}>{label}</div>)}

            {rows.map(({ employee, totals }) => (
              <div className="attendance-grid__row" style={{ display: 'contents' }} key={employee.email}>
                <div className="att-name att-sticky">{employee.name}</div>
                {days.map((date) => {
                  const status = getStatus(employee.email, date)
                  const cell = { email: employee.email, name: employee.name, date }
                  const isSelected = selectedKeys.has(cellKey(cell))
                  const handlers = { onClick: () => pick(cell), onDoubleClick: () => unpick(cell) }
                  if (status === 'weekend') return <div className="att-cell att-cell--weekend" key={date} />
                  if (status === 'future') return <div className="att-cell" key={date}><button className={`att-future ${isSelected ? 'att--selected' : ''}`} type="button" data-cell={cellKey(cell)} aria-pressed={isSelected} {...handlers} aria-label={`Mark ${employee.name} on ${fmtDay(date)}`} /></div>
                  const meta = attendanceMeta[status]
                  return <div className={`att-cell ${date === today ? 'att-cell--today' : ''}`} key={date}><button className={`att att--${meta.tone} ${isSelected ? 'att--selected' : ''}`} type="button" data-cell={cellKey(cell)} aria-pressed={isSelected} {...handlers} aria-label={`${employee.name}, ${fmtDay(date)}: ${meta.label}`}>{meta.short}</button></div>
                })}
                {([['present', totals.present], ['wfh', totals.wfh], ['half', totals.half], ['leave', totals.leave], ['absent', totals.absent]] as const).map(([status, value]) => <div className={`att-total att-total--${attendanceMeta[status].tone}`} key={status}>{value}</div>)}
              </div>
            ))}
          </div>
        </section>
      )}
      {data && !rows.length && !sheet.loading ? <p className="empty-state">No active employees yet. Add them on the Employees page.</p> : null}
      <p className="page-hint">Click cells to select as many as you like, then pick a status. Double-click a cell to deselect it. Working days without a mark count as present. Weekends are not counted in totals.</p>
    </main>
  )
}
