import type { ManagerPage, Role, Theme } from '../types'

interface Props {
  role: Role
  page: ManagerPage
  name: string
  theme: Theme
  exporting: boolean
  onPage: (page: ManagerPage) => void
  onExport: () => void
  onToggleTheme: () => void
  onSignOut: () => void
}

const pages: { value: ManagerPage; label: string }[] = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'projects', label: 'Projects' },
  { value: 'employees', label: 'Employees' },
  { value: 'eod', label: 'My EOD' },
]

export default function TopBar({ role, page, name, theme, exporting, onPage, onExport, onToggleTheme, onSignOut }: Props) {
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <div className="brand">
          <span className="brand__mark">DL</span>
          <strong>Daily Log</strong>
        </div>
        {role === 'manager' ? (
          <nav className="nav" aria-label="Manager navigation">
            {pages.map((item) => (
              <button
                key={item.value}
                className={`nav__item ${page === item.value ? 'nav__item--active' : ''}`}
                type="button"
                onClick={() => onPage(item.value)}
                aria-current={page === item.value ? 'page' : undefined}
              >
                {item.label}
              </button>
            ))}
          </nav>
        ) : null}
        <div className="topbar__actions">
          {role === 'manager' ? (
            <button className="button button--secondary button--compact" type="button" disabled={exporting} onClick={onExport} title="Download EODs and attendance as one CSV sheet">
              {exporting ? 'Exporting…' : 'Export data'}
            </button>
          ) : null}
          <button className="button button--secondary button--compact" type="button" onClick={onToggleTheme}>
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
          <span className="avatar" aria-label={`${name} account`}>{name.charAt(0)}</span>
          <button className="button button--text button--compact" type="button" onClick={onSignOut}>Sign out</button>
        </div>
      </div>
    </header>
  )
}
