import { useMemo, useState } from 'react'
import { attendanceMeta, seededAttendance, TODAY_KEY } from '../data'
import type { AttendanceRecord, AttendanceStatus, Employee } from '../types'

interface Props {
  employees: Employee[]
  attendance: Record<string, AttendanceRecord>
  holidays: Record<string, true>
  onAttendance: React.Dispatch<React.SetStateAction<Record<string, AttendanceRecord>>>
  onHolidays: React.Dispatch<React.SetStateAction<Record<string, true>>>
  onToast: (message: string) => void
}

const statusOrder: AttendanceStatus[] = ['present', 'absent', 'half', 'wfh', 'leave', 'holiday']
const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function keyFor(day: number) {
  return `2026-10-${String(day).padStart(2, '0')}`
}

export default function Attendance({ employees, attendance, holidays, onAttendance, onHolidays, onToast }: Props) {
  const [selected, setSelected] = useState<{ name: string; day: number } | null>({ name: 'Aniket', day: 27 })
  const [holidayPanel, setHolidayPanel] = useState(false)
  const [holidayDay, setHolidayDay] = useState('2026-10-30')
  const activeEmployees = employees.filter((employee) => employee.active)
  const days = Array.from({ length: 31 }, (_, index) => index + 1)

  const getStatus = (name: string, day: number): AttendanceStatus | 'weekend' | 'future' => {
    const key = keyFor(day)
    const date = new Date(2026, 9, day)
    if (date.getDay() === 0 || date.getDay() === 6) return 'weekend'
    if (holidays[key]) return 'holiday'
    if (key > TODAY_KEY) return 'future'
    return attendance[`${name}|${key}`]?.status || seededAttendance(name, day)
  }

  const selectedStatus = selected ? getStatus(selected.name, selected.day) : null
  const selectedLabel = selected ? `${selected.name} · ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(2026, 9, selected.day).getDay()]}, ${selected.day} Oct` : ''

  const rows = useMemo(() => activeEmployees.map((employee) => {
    const totals = { present: 0, absent: 0, half: 0, wfh: 0, leave: 0 }
    days.forEach((day) => {
      const status = getStatus(employee.name, day)
      if (status in totals) totals[status as keyof typeof totals] += 1
    })
    return { employee, totals }
  }), [activeEmployees, attendance, holidays])

  const setStatus = (status: AttendanceStatus) => {
    if (!selected) return
    const key = keyFor(selected.day)
    onAttendance((current) => ({ ...current, [`${selected.name}|${key}`]: { status, checkIn: status === 'present' || status === 'wfh' ? '9:41 AM' : undefined } }))
    onToast(`${selected.name} marked ${attendanceMeta[status].label.toLowerCase()} for ${selected.day} Oct`)
  }

  const exportCsv = () => {
    const headings = ['Employee', ...days.map(String), 'Present', 'WFH', 'Half day', 'Leave', 'Absent']
    const lines = [headings.join(',')]
    rows.forEach(({ employee, totals }) => {
      const cells = days.map((day) => {
        const status = getStatus(employee.name, day)
        if (status === 'weekend') return 'WE'
        if (status === 'future') return ''
        return attendanceMeta[status].short
      })
      lines.push([employee.name, ...cells, totals.present, totals.wfh, totals.half, totals.leave, totals.absent].join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'attendance-2026-10.csv'
    anchor.click()
    URL.revokeObjectURL(url)
    onToast('Attendance CSV exported')
  }

  return (
    <main className="page page--wide attendance-page">
      <section className="attendance-head">
        <div className="attendance-title">
          <h1>Attendance</h1>
          <div className="month-switcher"><button type="button" aria-label="Previous month">‹</button><strong>October 2026</strong><button type="button" aria-label="Next month">›</button></div>
        </div>
        <div className="button-row">
          <button className="button button--secondary" type="button" onClick={() => { setHolidayPanel(true); setSelected(null) }}>Mark holiday for everyone</button>
          <button className="button button--primary" type="button" onClick={exportCsv}>Export</button>
        </div>
      </section>

      <div className="attendance-legend" aria-label="Attendance legend">
        {statusOrder.map((status) => <span key={status}><i className={`att att--${attendanceMeta[status].tone}`}>{attendanceMeta[status].short}</i>{attendanceMeta[status].label}</span>)}
        <span><i className="att att--weekend" />Weekend</span>
      </div>

      {selected ? (
        <section className="attendance-editor">
          <div><strong>{selectedLabel}</strong><span>{selectedStatus === 'present' || selectedStatus === 'wfh' ? 'Checked in 9:41 AM' : selectedStatus === 'future' ? 'Not checked in yet' : 'No check-in'}</span></div>
          <div className="attendance-editor__buttons">
            {statusOrder.map((status) => (
              <button className={selectedStatus === status ? `att-button att-button--${attendanceMeta[status].tone}` : 'att-button'} type="button" key={status} onClick={() => setStatus(status)}>{attendanceMeta[status].label}</button>
            ))}
          </div>
          <button className="editor-close" type="button" aria-label="Close attendance editor" onClick={() => setSelected(null)}>×</button>
        </section>
      ) : null}

      {holidayPanel ? (
        <section className="holiday-panel">
          <div><h2>Mark a studio holiday</h2><p>This replaces individual attendance for everyone on the selected weekday.</p></div>
          <select value={holidayDay} onChange={(event) => setHolidayDay(event.target.value)}>
            {days.filter((day) => ![0, 6].includes(new Date(2026, 9, day).getDay())).map((day) => <option value={keyFor(day)} key={day}>{day} Oct{holidays[keyFor(day)] ? ' · already a holiday' : ''}</option>)}
          </select>
          <button className="button button--secondary" type="button" onClick={() => setHolidayPanel(false)}>Cancel</button>
          <button className="button button--ink" type="button" onClick={() => { onHolidays((current) => ({ ...current, [holidayDay]: true })); setHolidayPanel(false); onToast(`${Number(holidayDay.slice(-2))} Oct marked as a holiday for everyone`) }}>Mark holiday</button>
        </section>
      ) : null}

      <section className="card attendance-scroll" aria-label="October attendance grid">
        <div className="attendance-grid" style={{ gridTemplateColumns: `150px repeat(31, 34px) repeat(5, 40px)` }}>
          <div className="att-head att-name att-sticky">Employee</div>
          {days.map((day) => {
            const date = new Date(2026, 9, day)
            const weekend = [0, 6].includes(date.getDay())
            return <div className={`att-head att-day ${weekend ? 'att-cell--weekend' : ''} ${keyFor(day) === TODAY_KEY ? 'att-cell--today' : ''}`} key={day}><span>{dayNames[date.getDay()]}</span><strong>{day}</strong></div>
          })}
          {['P', 'W', 'H', 'L', 'A'].map((label) => <div className="att-head att-total" key={label}>{label}</div>)}

          {rows.map(({ employee, totals }) => (
            <div className="attendance-grid__row" style={{ display: 'contents' }} key={employee.email}>
              <div className="att-name att-sticky">{employee.name}</div>
              {days.map((day) => {
                const status = getStatus(employee.name, day)
                const isSelected = selected?.name === employee.name && selected.day === day
                if (status === 'weekend') return <div className="att-cell att-cell--weekend" key={day} />
                if (status === 'future') return <div className="att-cell" key={day}><button className="att-future" type="button" onClick={() => setSelected({ name: employee.name, day })} aria-label={`Mark ${employee.name} on ${day} October`} /></div>
                const meta = attendanceMeta[status]
                return <div className={`att-cell ${keyFor(day) === TODAY_KEY ? 'att-cell--today' : ''}`} key={day}><button className={`att att--${meta.tone} ${isSelected ? 'att--selected' : ''}`} type="button" onClick={() => setSelected({ name: employee.name, day })} aria-label={`${employee.name}, ${day} October: ${meta.label}`}>{meta.short}</button></div>
              })}
              {([['present', totals.present], ['wfh', totals.wfh], ['half', totals.half], ['leave', totals.leave], ['absent', totals.absent]] as const).map(([status, value]) => <div className={`att-total att-total--${attendanceMeta[status].tone}`} key={status}>{value}</div>)}
            </div>
          ))}
        </div>
      </section>
      <p className="page-hint">Select a cell to edit attendance. Weekends are not counted in totals.</p>
    </main>
  )
}
