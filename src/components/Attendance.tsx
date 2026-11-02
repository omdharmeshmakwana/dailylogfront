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

const statusOrder: AttendanceStatus[] = ['present', 'absent', 'half', 'wfh', 'leave', 'holiday']
const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function Attendance({ onToast }: Props) {
  const [month, setMonth] = useState('')
  const [selected, setSelected] = useState<{ email: string; name: string; date: string } | null>(null)
  const [holidayPanel, setHolidayPanel] = useState(false)
  const [holidayDay, setHolidayDay] = useState('')
  const [saving, setSaving] = useState(false)
  const sheet = useApi(() => api.attendance.month(month), [month])
  const stickyRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLElement>(null)

  const data = sheet.data
  const today = data?.today ?? ''
  const days = useMemo(() => (data ? monthDays(data.month) : []), [data])
  const records = useMemo(() => new Map((data?.records ?? []).map((record) => [`${record.email}|${record.date}`, record])), [data])
  const holidays = useMemo(() => new Set(data?.holidays ?? []), [data])
  const weekdays = days.filter((date) => !isWeekend(date))
  const monthLabel = month ? fmtMonth(month) : data ? fmtMonth(data.month) : ''

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

  const selectedStatus = selected ? getStatus(selected.email, selected.date) : null
  const selectedCheckIn = selected ? records.get(`${selected.email}|${selected.date}`)?.checkIn : null
  const selectedLabel = selected ? `${selected.name} · ${WEEKDAYS[parseKey(selected.date).getDay()]}, ${fmtDay(selected.date)}` : ''

  // The editor opens pinned under the legend (a bottom sheet on phones). If it
  // ends up covering the clicked cell, nudge the page so the cell stays in view.
  useEffect(() => {
    if (!selected) return
    const frame = window.requestAnimationFrame(() => {
      const cell = document.querySelector(`[data-cell="${selected.email}|${selected.date}"]`)
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
  }, [selected])

  const goToMonth = (delta: number) => {
    if (!data) return
    setMonth(shiftMonth(month || data.month, delta))
    setSelected(null)
    setHolidayPanel(false)
  }

  const setStatus = async (status: AttendanceStatus) => {
    if (!selected) return
    setSaving(true)
    try {
      const record = await api.attendance.set({ email: selected.email, date: selected.date, status })
      sheet.setData((current) => ({
        ...current,
        records: [
          ...current.records.filter((item) => !(item.email === selected.email && item.date === selected.date)),
          ...(record ? [record] : []),
        ],
      }))
      onToast(`${selected.name} marked ${attendanceMeta[status].label.toLowerCase()} for ${fmtDay(selected.date)}`)
    } catch (reason) {
      onToast(errorMessage(reason))
    } finally {
      setSaving(false)
    }
  }

  const openHolidayPanel = () => {
    setHolidayDay(weekdays.find((date) => date >= today && !holidays.has(date)) ?? weekdays[0] ?? '')
    setHolidayPanel(true)
    setSelected(null)
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

        {selected ? (
          <section className="attendance-editor" ref={editorRef}>
            <div><strong>{selectedLabel}</strong><span>{selectedCheckIn ? `Checked in ${selectedCheckIn}` : selectedStatus === 'future' ? 'Not checked in yet' : 'No check-in'}</span></div>
            <div className="attendance-editor__buttons">
              {statusOrder.map((status) => (
                <button className={selectedStatus === status ? `att-button att-button--${attendanceMeta[status].tone}` : 'att-button'} type="button" key={status} disabled={saving} onClick={() => setStatus(status)}>{attendanceMeta[status].label}</button>
              ))}
            </div>
            <button className="editor-close" type="button" aria-label="Close attendance editor" onClick={() => setSelected(null)}>×</button>
          </section>
        ) : null}
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
                  const isSelected = selected?.email === employee.email && selected.date === date
                  const select = () => { setSelected({ email: employee.email, name: employee.name, date }); setHolidayPanel(false) }
                  if (status === 'weekend') return <div className="att-cell att-cell--weekend" key={date} />
                  if (status === 'future') return <div className="att-cell" key={date}><button className={`att-future ${isSelected ? 'att--selected' : ''}`} type="button" data-cell={`${employee.email}|${date}`} onClick={select} aria-label={`Mark ${employee.name} on ${fmtDay(date)}`} /></div>
                  const meta = attendanceMeta[status]
                  return <div className={`att-cell ${date === today ? 'att-cell--today' : ''}`} key={date}><button className={`att att--${meta.tone} ${isSelected ? 'att--selected' : ''}`} type="button" data-cell={`${employee.email}|${date}`} onClick={select} aria-label={`${employee.name}, ${fmtDay(date)}: ${meta.label}`}>{meta.short}</button></div>
                })}
                {([['present', totals.present], ['wfh', totals.wfh], ['half', totals.half], ['leave', totals.leave], ['absent', totals.absent]] as const).map(([status, value]) => <div className={`att-total att-total--${attendanceMeta[status].tone}`} key={status}>{value}</div>)}
              </div>
            ))}
          </div>
        </section>
      )}
      {data && !rows.length && !sheet.loading ? <p className="empty-state">No active employees yet. Add them on the Employees page.</p> : null}
      <p className="page-hint">Select a cell to edit attendance. Working days without a mark count as present. Weekends are not counted in totals.</p>
    </main>
  )
}
