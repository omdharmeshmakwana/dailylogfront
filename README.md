# Daily Log — React app

The design handoff has been converted into a production-buildable Vite + React + TypeScript app. It includes the employee EOD workflow, manager dashboard, attendance grid and CSV export, project and employee management, dark mode and responsive layouts. All data comes from the Daily Log API (the `dailylogback` repo), which stores it in Neon.

## Configure

`VITE_API_URL` points the app at the API (no trailing slash):

- **Vercel:** Project → Settings → Environment Variables, e.g. `https://daily-log-api.onrender.com`. Redeploy after changing it; Vite bakes it in at build time.
- **Locally:** defaults to `http://localhost:4000`. To change it, create `.env` with `VITE_API_URL=...`.

## Run locally

```bash
npm install
npm run dev
```

Create the production bundle with `npm run build`, then inspect it locally with `npm run preview`.

Sign in with any email in the `employees` table: the manager created by `schema.sql`, anyone added on the Employees page, or the demo team from `seed.sql` (e.g. `gauri@studio.ai`).

The original HTML prototype and reference screenshots remain in `prototype/` and `screenshots/`.

---

# Original handoff: Daily Log — EOD tracker for an AI film studio

## Overview
Internal web app replacing a manager's Excel sheet. 21 employees log their own end-of-day (EOD) update; one manager monitors output, attendance, projects and the team list. No task assignment. Minimise typing: dropdowns, chips and counters everywhere except the specified text boxes.

Two roles:
- **Employee** — fills and submits "My EOD".
- **Manager** — Dashboard, Attendance, Projects, Employees.

## About the design files
`prototype/Daily Log.dc.html` is a **design reference built in HTML** (open it in a browser next to `support.js`). It shows intended look and behaviour; it is not production code. Recreate it as a **React app** (recommended: Vite + React + TypeScript, React Router, plain CSS modules or Tailwind with the tokens below). All logic lives in the `class Component` script block at the bottom of the file — reuse its data model, validation rules, and seeded sample-data generator directly.

## Fidelity
**High fidelity.** Final colours, type, spacing, copy and interactions. Match pixel-for-pixel. Note: screenshots render native `<select>` elements as blank/placeholder — in the live prototype they show the selected values.

## Screenshots (`screenshots/`)
01 login · 02 EOD with near-deadline banner · 03 EOD chip with inline stepper · 04 submit confirmation · 05 submitted state · 06 dashboard · 07 project→episode breakdown + feed · 08 attendance grid with cell editor · 09 projects · 10 employees · 11 dashboard dark mode

---

## Global layout
- Font: **Geist** (400/500/600/700) for UI, **Geist Mono** (400/500/600) for numbers, counts, episode codes, logo mark. Google Fonts.
- Page background `--bg`. Content centred, horizontal padding 16px.
- Max widths: My EOD 780px · Dashboard / Attendance 1280px · Projects / Employees 960px. Page top padding 28px, bottom 80–96px.
- Page title (h1): 28px / 600 / letter-spacing −0.025em. Subtitle 14px `--muted`.
- Cards: `--surface`, 1px `--line` border, radius 16px (14px for small cards), shadow `--shadow`, padding 18–20px.
- Section titles (h2): 16px / 600.
- Labels: 13px / 500 `--ink-2`, sentence case, 6px above field.
- Inputs/selects: height 46px (44 in forms, 40 in filter bars), radius 9px, 1px `--line-2` border, 15px text. Focus: border `--accent` + `0 0 0 3px --accent-soft`. Error: border `--danger`.
- Primary button: `--accent` bg, `--on-accent` text, radius 10–12px, 600 weight; hover `filter: brightness(1.07)`. **One primary per screen.**
- Secondary button: `--surface` bg, 1px `--line-2` border, `--ink` text, hover `--surface-2`.
- Ghost button: transparent, `--muted` text; destructive ghost hovers to `--danger` on `--danger-soft`.
- Pills/badges: radius 999px, 12–13px / 600, tone colour on its `-soft` bg.
- Avatars: circle 30–34px, `--surface-2` bg, initial 12–13px / 600.
- Toast: fixed bottom-centre 24px, `--ink` bg / `--bg` text, radius 12px, auto-hides after 2.8s.
- Use flex/grid with `gap` everywhere; layouts wrap (desktop-first, EOD must work on phones).

### Top bar (sticky, height 60px, bottom border `--line`)
Left: 28px logo square (`--ink` bg, "DL" Geist Mono 11px/600 in `--bg`, radius 7px) + "Daily Log" 15px/600. Manager only: nav buttons Dashboard / Attendance / Projects / Employees (36px tall, radius 8px; active = `--surface-2` bg + `--ink`; inactive `--muted`; horizontal scroll on narrow screens). Right: theme toggle ("Dark"/"Light", bordered 36px), avatar initial ("M" for manager), "Sign out" ghost.

---

## Screens

### 1. Login
Centred column max 400px. Brand row (36px DL mark + "Daily Log" / "End-of-day updates for the studio"). Card radius 16px, padding 24px: "Sign in" (22px/600), field "Name or email" (placeholder `gauri@studio.ai`), full-width primary "Sign in" (46px), note 13px muted: "Your view is set by your email. Demo: gauri@studio.ai (employee) or manager@studio.ai." Below card: text button "Switch to dark mode".
- **Role is decided by email** (no role toggle): `manager@…` or `manager` → Manager; otherwise match an employee by email or by name (email prefix). Enter submits.
- Errors (13px `--danger`, input border red): empty → "Enter your name or email to continue."; no match → "We couldn't find that name or email in the team list."; inactive → "<Name>'s account is inactive. Ask your manager to reactivate it."
- Session persisted (localStorage `dl-session`); manager's current page also persisted.
- **No automatic attendance at login.**

### 2. Employee — My EOD (most important; must work on phone)
**Header** (wraps): h1 "My EOD · 29 Oct", employee name (14px/500 `--ink`). Right: status badge 32px pill with 7px dot:
- default "EOD due 6:30 PM" (`--ink-2` on `--surface-2`)
- near deadline "EOD due 6:30 PM · 25 min left" (warn)
- overdue "EOD overdue" (danger)
- submitted "Submitted at 5:48 PM" (ok)

**Reminder banner** (hidden once submitted), radius 12px, padding 14/16: near → warn tone, title "EOD due in 25 minutes", text "Save any open lines in your scene entries and submit before 6:30 PM." Overdue → danger tone, "Your EOD is overdue" / "It was due at 6:30 PM. Submit now so your manager sees today's work." In production trigger from real time (e.g. from 6:00 PM; overdue after 6:30 PM).

**Scene entry card** (repeatable), gap 18px, in this order:
1. Header: 26px number square (Geist Mono) + "Scene entry"; "Remove scene" ghost (only when >1 card).
2. Grid `repeat(auto-fit,minmax(170px,1fr))` gap 12: **Project** select (active projects; placeholder "Select project") · **Episode** select (filtered by project; disabled with "Pick a project first" until project chosen; changing project resets episode) · **Scene** text input (placeholder "SC 06, SC 07").
3. **Kind of work** select, max-width 280: Fresh, Revision, Test, Trailer, Training.
4. **Work panel** (`--surface-2` bg, radius 12, padding 16, gap 12; border turns `--danger` on any work error):
   - Row: "Work type" label + segmented control (2 cols, min 200px, 38px buttons, active = `--surface` bg + small shadow): **Image | Clip**. Switching clears unsaved chip picks.
   - Chips (wrap, gap 8). Image: Character sheet, Location image, Storyboard, Keyframe. Clip: Clip from keyframes, Lip-sync, Extend clip, Upscale.
     - Unselected: 48px tall, radius 12, 1px `--line-2`, `--surface` bg, "+" muted prefix, 15px/500. Hover border `--accent`.
     - Selected: 48px, 1.5px `--accent` border, `--accent-soft` bg. Contains: label button (18px `--accent` check square "✓" + label, 600; tap deselects) and an inline stepper in a `--surface` pill: **−** (40×38) · count (Geist Mono 16/600, min-width 30) · **+** (40×38). Starts at 1; − at 1 deselects; max 999.
   - "What I made today" textarea (2 rows). Placeholder: Image → "e.g. Kashmir scene revision v3"; Clip → "e.g. lip-sync and changes SC 35, 41, 43".
   - Inline error (13px/500 `--danger`).
   - Right-aligned: **Cancel** (secondary, clears chips + text) and **Save** (outlined accent, hover `--accent-soft`).
   - Save validation: nothing → "Pick at least one output and describe what you made."; no chip → "Pick at least one output above."; no text → "Describe what you made today."
   - Save appends a line item and resets chips + text.
5. **Logged lines** ("Logged for this scene · N"): each row radius 10, 1px `--line`: type tag (Image/Clip, 12px/600 on `--surface-2`) · summary 14/600 e.g. "3 × character sheet + 12 × keyframe" · typed text 14 muted · 36px "×" remove button.
6. **Status** select max-width 280: In progress, Sent for approval, On hold, Done.

Below cards: dashed full-width "+ Add another scene" (52px, radius 14, 1.5px dashed `--line-2`, hover accent).

Notes card: "Suggestion / remarks / feedback · optional" (placeholder "Anything blocking you, or ideas for the team") and "Tomorrow's plan and availability · optional" (placeholder "Work plan, leaving early, coming late, leave…").

**Submit EOD** — primary, full width, 54px, radius 12, 16/600.
- Validation per card: project, episode, kind, status required (red borders); ≥1 saved line ("Add at least one line: pick outputs, describe them, then Save."); unsaved picks/text block submit ("You have unsaved picks or text here. Save them as a line or cancel."). Summary error above button (danger-soft box): "Fix N items marked in red before submitting."
- Valid → **confirmation panel** replaces button (1.5px accent border, radius 16): "Submit today's EOD?" + "2 scenes · 4 lines · 31 outputs. You can still edit it afterwards." Buttons "Keep editing" (secondary) / "Confirm and submit" (primary).
- **Submitted state**: ok-soft banner "EOD submitted at 5:48 PM" / "Thanks, Gauri. Your manager can see it on the dashboard now." + "Edit EOD" secondary; read-only summary cards (title "18 days · EP 01 · SC 06, SC 07", kind pill, status pill with tone, lines); remarks/plan cards if filled. Toast "EOD submitted".

### 3. Manager — Dashboard
**Header row** (wraps): h1 "Dashboard" + "Today, Thu 29 Oct 2026". Filter bar (40px controls, gap 8): date input (max = today) · period segmented Day / Week / Month · Project select ("All projects") · Episode select (disabled until project) · Employee select ("All employees") · "Clear filters" accent text button when any filter set.

**Summary cards** grid `auto-fit,minmax(200px,1fr)`: 8px tone dot + label, value Geist Mono 34/500 −0.03em, sub 13 muted.
- Present (ok dot) — "of 21 people"
- Absent / leave (violet) — "Includes planned leave"
- EOD submitted (accent) — "74% of people present"
- EOD missed (danger; value red when >0) — "Due 6:30 PM" (today) / "Not submitted that day"
Present = present + WFH + half day. Weekend/holiday → sub shows "It's a weekend. No EODs expected." / "Studio holiday. No EODs expected."

**Two columns** (flex wrap): left `flex 2 1 560px`, right `flex 1 1 320px`.

Left:
- **Output** card: "Output" + period label ("29 Oct · today" / "26 Oct – 29 Oct") + total right. Tile grid with 1px hairlines (`--line` gap background), 4 per row desktop, 2 on narrow: Character sheets, Location images, Storyboards, Keyframes, Clips, Lip-syncs, Extended clips, Upscales (value Geist Mono 24/500; zero values `--muted`). Then **By project and episode** table: cols `1fr 64 64 64` → Images / Clips / Total. Project rows 14/600 with top border; episode rows indented with a 6px accent bar proportional to the max episode total. Empty: "No output logged for this selection." Respects period + all filters.
- **Team feed**: "Team feed" + "14 submitted". Rows (min 56px, hover `--surface-2`): avatar · name 15/600 · "Submitted 6:12 PM · 2 scenes · 15 outputs" · "Show ▾"/"Hide ▴". Expanded: scene entry boxes (`--bg`, radius 12) with title, kind pill, status pill, lines. Selected day only; filtered by project/episode/employee.

Right:
- **Missed EOD** + red count pill; "Remind all" (today, >1 pending). Rows: avatar, name, "Checked in 9:40 AM · WFH"; "Send reminder" secondary → becomes "Reminder sent · 5:12 PM" (ok text) + toast. Past days show "Missed". Empty: "Everyone present has submitted."
- **Notes**: group "Tomorrow's plan and availability" — flagged items first and highlighted with tone row bg + pill: On leave (violet), Leaving early (warn), Coming late (warn), WFH (info). Flag detection from text (regex: leave/day off, early/leaving at, late, wfh/work from home) — in production consider explicit chips. Group "Suggestions, remarks and feedback": name + text.

Status pill tones: In progress → info, Sent for approval → violet, On hold → warn, Done → ok.

### 4. Manager — Attendance
Header: h1 + month nav (‹ "October 2026" ›, 36px bordered buttons). Right: "Mark holiday for everyone" (secondary) + **Export** (primary).
Legend: 20px swatches with letter — Present P (ok), Absent A (danger), Half day H (warn), Work from home W (info), Leave L (violet), Holiday Ho (hol) + Weekend (striped).
Grid in horizontally scrolling card; row layout with flex (not table):
- Sticky first column 150px "Employee" (right border).
- Day columns 34px: weekday initial + date (Geist Mono 12). Weekend columns `repeating-linear-gradient(135deg, --weekend 0 4px, --line 4px 5px)`, no buttons. Today column `--accent-soft` with accent bold header.
- Cells: 28×28 buttons radius 6, Geist Mono 11/700, tone bg/fg. Future unmarked: dashed `--line-2` border, empty. Selected: 2px `--ink` outline offset 1.
- Totals columns 40px with left border: P, W, H, L, A (tone-coloured, muted when 0).
- Row height 40px.
**Cell editor panel** (above grid, 1.5px `--ink` border): "Aniket · Tue, 27 Oct", "Checked in 9:41 AM" / "No check-in" / "Not checked in yet"; 6 status buttons (38px, active = tone bg + tone border); close ×. Changing → toast "Aniket marked leave for 27 Oct".
**Mark holiday panel**: select of the month's weekdays (" · already a holiday" suffix), Cancel / "Mark holiday" (ink button). Applies to all and clears per-person overrides for that day.
**Export**: downloads `attendance-YYYY-MM.csv` (Employee, day 1..N letters, WE for weekends, totals).
Footer hint 13px muted.
Seed holidays: 2 Oct, 20 Oct 2026.

### 5. Manager — Projects
Header: h1 + "3 active · 1 archived" + primary "New project". Create panel (1.5px accent border): "Project name" input (placeholder "e.g. Ramayan – Part 2"), Cancel / "Create with EP 01". Errors: empty "Give the project a name."; duplicate "A project with this name already exists." Enter/Escape supported.
Project cards: name 18/600 + "7 episodes" muted + "Archive" secondary. Episode chips (40px, Geist Mono 13, radius 10) — click to rename inline (input 150px, accent border; Enter/blur saves, Escape cancels). Dashed "+ Add EP 08" auto-numbers.
"Show archived (n)" toggles a list with "Restore". Empty state: dashed box "No active projects. Create one to start logging work against it."
Archived projects disappear from EOD and dashboard dropdowns.

### 6. Manager — Employees
Header: h1 + "21 active of 21" + primary "Add employee". Add panel: Name, Email, Cancel / Add. Errors: "Name and email are both required." / "That email doesn't look right." / "Someone already uses this email."
Rows (min 60px): avatar 34 · name 15/600 · email 13 muted (row at 50% opacity when inactive) · switch (44×26 track, 20px white knob; `--accent` on, `--line-2` off) + "Active"/"Inactive" · "Remove" ghost → inline confirm "Remove Kishan? Past logs are kept." Keep / Remove (danger). Inactive employees can't sign in and are excluded from dashboard and attendance.

---

## State / data model
```ts
type Role = 'employee' | 'manager';
type WorkType = 'image' | 'clip';
type OutputKey = 'charsheet'|'location'|'storyboard'|'keyframe'|'clip'|'lipsync'|'extend'|'upscale';
interface Line { id: string; type: WorkType; items: { k: OutputKey; count: number }[]; text: string }
interface SceneEntry { id; project; episode; scene; kind: Kind; status: Status; lines: Line[] }
interface Eod { employee; date: 'YYYY-MM-DD'; entries: SceneEntry[]; remarks; plan; submittedAt? }
interface Project { id; name; episodes: string[]; archived: boolean }
interface Employee { name; email; active: boolean }
type Att = 'present'|'absent'|'half'|'wfh'|'leave'|'holiday';
attendance: Record<`${email}|${date}`, { status: Att; checkIn?: string }>
holidays: Record<date, true>
```
Draft (unsaved per card): `type`, `sel: Record<OutputKey, count>`, `text`, `err`, field-error flags. EOD stage: `edit → confirm → done` (done → edit via "Edit EOD").
Dashboard UI state: date, period, project/episode/employee filters, expanded feed rows, reminders sent (name → time).
The prototype seeds deterministic sample data per employee per day (`gen()` with a string-hash RNG) — use it as mock API data. Needed endpoints: auth (resolve role by email), EODs by date range, submit/update EOD, attendance by month + update, holidays, projects CRUD, employees CRUD, send reminder.

## Design tokens
Defined as CSS variables on `[data-theme="light"|"dark"]` (persist choice in localStorage `dl-theme`).

| token | light | dark |
|---|---|---|
| --bg | oklch(0.972 0.005 80) | oklch(0.17 0.006 260) |
| --surface | oklch(0.995 0.002 80) | oklch(0.205 0.007 260) |
| --surface-2 | oklch(0.95 0.006 80) | oklch(0.245 0.008 260) |
| --ink | oklch(0.24 0.012 260) | oklch(0.95 0.004 80) |
| --ink-2 | oklch(0.38 0.012 260) | oklch(0.84 0.006 80) |
| --muted | oklch(0.5 0.012 260) | oklch(0.7 0.01 260) |
| --line | oklch(0.91 0.006 80) | oklch(0.285 0.008 260) |
| --line-2 | oklch(0.85 0.008 80) | oklch(0.36 0.01 260) |
| --accent | oklch(0.48 0.1 175) | oklch(0.76 0.11 175) |
| --on-accent | #fff | oklch(0.18 0.02 175) |
| --accent-soft | oklch(0.94 0.035 175) | oklch(0.3 0.05 175) |
| --ok / -soft | oklch(0.47 0.12 150) / oklch(0.94 0.05 150) | oklch(0.78 0.13 150) / oklch(0.3 0.06 150) |
| --danger / -soft | oklch(0.52 0.18 25) / oklch(0.95 0.035 25) | oklch(0.75 0.15 25) / oklch(0.31 0.07 25) |
| --warn / -soft | oklch(0.5 0.12 65) / oklch(0.95 0.055 85) | oklch(0.82 0.12 75) / oklch(0.32 0.06 75) |
| --info / -soft | oklch(0.5 0.13 245) / oklch(0.94 0.035 245) | oklch(0.77 0.11 245) / oklch(0.3 0.06 245) |
| --violet / -soft | oklch(0.5 0.15 300) / oklch(0.94 0.04 300) | oklch(0.78 0.12 300) / oklch(0.31 0.07 300) |
| --hol / -soft | oklch(0.45 0.02 260) / oklch(0.91 0.01 260) | oklch(0.8 0.01 260) / oklch(0.32 0.008 260) |
| --weekend | oklch(0.945 0.005 80) | oklch(0.225 0.006 260) |
| --shadow | 0 1px 2px oklch(0.2 0.01 260 / 0.05) | none |

Type scale: 11, 12, 13, 14, 15, 16, 17, 18, 22, 24, 28, 34px. Radii: 5, 6, 7, 8, 9, 10, 12, 14, 16, 999. Spacing: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28px. Tap targets ≥ 40px (chips 48px).

## Sample data
Employees: Vipul, Aniket, Gauri, Isha, Kishan, Samiksha, Chirag, Ninad, Riya, Ravi, Leena, Swapnil, Ajay, Kritik, Tirth, Aditya, Jayesh, Tanvi, Jinal, Vedashree, Darsh (`name@studio.ai`). Projects: "18 days", "DVA", "Yash – Sadma", each EP 01–EP 07. Example texts in `TX`, `REMARKS`, `PLANS` constants in the prototype.

## Assets
None — no images or icon fonts. Glyphs used: ✓ − + × ‹ › ▾ ▴.

## Files
- `prototype/Daily Log.dc.html` — full prototype (template markup + `class Component` logic at the bottom). Open in a browser with `support.js` beside it.
- `prototype/support.js` — runtime for the prototype only; not needed in the React app.
- `screenshots/*.png` — reference captures.
