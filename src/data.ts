import type { AttendanceStatus, Employee, OutputKey, Project, SceneEntry, WorkKind, WorkStatus, WorkType } from './types'

export const TODAY = new Date(2026, 9, 29)
export const TODAY_KEY = '2026-10-29'
export const EMPLOYEE_NAMES = ['Vipul', 'Aniket', 'Gauri', 'Isha', 'Kishan', 'Samiksha', 'Chirag', 'Ninad', 'Riya', 'Ravi', 'Leena', 'Swapnil', 'Ajay', 'Kritik', 'Tirth', 'Aditya', 'Jayesh', 'Tanvi', 'Jinal', 'Vedashree', 'Darsh']

export const initialEmployees: Employee[] = EMPLOYEE_NAMES.map((name) => ({
  name,
  email: `${name.toLowerCase()}@studio.ai`,
  active: true,
}))

export const episodeNames = Array.from({ length: 7 }, (_, index) => `EP ${String(index + 1).padStart(2, '0')}`)

export const initialProjects: Project[] = [
  { id: 'p-18-days', name: '18 days', episodes: episodeNames, archived: false },
  { id: 'p-dva', name: 'DVA', episodes: episodeNames, archived: false },
  { id: 'p-yash', name: 'Yash – Sadma', episodes: episodeNames, archived: false },
  { id: 'p-archive', name: 'Studio tests 2025', episodes: ['EP 01', 'EP 02'], archived: true },
]

export const outputs: Record<WorkType, { key: OutputKey; label: string; plural: string }[]> = {
  image: [
    { key: 'charsheet', label: 'Character sheet', plural: 'Character sheets' },
    { key: 'location', label: 'Location image', plural: 'Location images' },
    { key: 'storyboard', label: 'Storyboard', plural: 'Storyboards' },
    { key: 'keyframe', label: 'Keyframe', plural: 'Keyframes' },
  ],
  clip: [
    { key: 'clip', label: 'Clip from keyframes', plural: 'Clips' },
    { key: 'lipsync', label: 'Lip-sync', plural: 'Lip-syncs' },
    { key: 'extend', label: 'Extend clip', plural: 'Extended clips' },
    { key: 'upscale', label: 'Upscale', plural: 'Upscales' },
  ],
}

export const allOutputs = [...outputs.image, ...outputs.clip]
export const kinds: WorkKind[] = ['Fresh', 'Revision', 'Test', 'Trailer', 'Training']
export const statuses: WorkStatus[] = ['In progress', 'Sent for approval', 'On hold', 'Done']

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export function emptyScene(): SceneEntry {
  return {
    id: uid('scene'),
    project: '',
    episode: '',
    scene: '',
    kind: '',
    status: '',
    type: 'image',
    selected: {},
    text: '',
    lines: [],
    errors: {},
  }
}

export function demoScene(): SceneEntry {
  return {
    ...emptyScene(),
    project: '18 days',
    episode: 'EP 01',
    scene: 'SC 06, SC 07',
    kind: 'Revision',
    status: 'In progress',
    lines: [{
      id: uid('line'),
      type: 'image',
      items: [{ k: 'charsheet', count: 3 }, { k: 'keyframe', count: 12 }],
      text: 'EP 01 SC 07 Leela–Meera cab scene',
    }],
  }
}

export const dashboardOutput: Record<OutputKey, number> = {
  charsheet: 22,
  location: 19,
  storyboard: 45,
  keyframe: 31,
  clip: 12,
  lipsync: 22,
  extend: 21,
  upscale: 24,
}

export const teamFeed = [
  { name: 'Gauri', time: '5:48 PM', scenes: 2, outputs: 31, project: '18 days', episode: 'EP 01', scene: 'SC 06, SC 07', kind: 'Revision', status: 'Sent for approval', note: 'EP 01 cab scene keyframes and lip-sync changes' },
  { name: 'Riya', time: '5:56 PM', scenes: 1, outputs: 18, project: 'DVA', episode: 'EP 03', scene: 'SC 18, SC 19', kind: 'Fresh', status: 'In progress', note: 'Market chase storyboard pass' },
  { name: 'Aniket', time: '6:04 PM', scenes: 2, outputs: 14, project: 'Yash – Sadma', episode: 'EP 02', scene: 'SC 31', kind: 'Revision', status: 'Done', note: 'Upscaled final clips for review' },
  { name: 'Isha', time: '6:12 PM', scenes: 1, outputs: 11, project: '18 days', episode: 'EP 04', scene: 'SC 08–10', kind: 'Fresh', status: 'On hold', note: 'Waiting on final lighting reference' },
]

export const missedEmployees = ['Kishan', 'Chirag', 'Ajay', 'Tirth', 'Darsh']

export const managerNotes = [
  { name: 'Samiksha', text: 'On leave tomorrow for a family function. Back Monday.', flag: 'On leave', tone: 'violet' },
  { name: 'Gauri', text: "Continue SC 08–10 keyframes. Leaving at 4 PM for a doctor's appointment.", flag: 'Leaving early', tone: 'warn' },
  { name: 'Ravi', text: 'Working from home tomorrow, available on chat.', flag: 'WFH', tone: 'info' },
  { name: 'Isha', text: 'A shared reference pack for EP 03 would help keep lighting consistent.', flag: '', tone: '' },
]

export const attendanceMeta: Record<AttendanceStatus, { label: string; short: string; tone: string }> = {
  present: { label: 'Present', short: 'P', tone: 'ok' },
  absent: { label: 'Absent', short: 'A', tone: 'danger' },
  half: { label: 'Half day', short: 'H', tone: 'warn' },
  wfh: { label: 'Work from home', short: 'W', tone: 'info' },
  leave: { label: 'Leave', short: 'L', tone: 'violet' },
  holiday: { label: 'Holiday', short: 'Ho', tone: 'hol' },
}

function hash(input: string) {
  let value = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

export function seededAttendance(name: string, day: number): AttendanceStatus {
  if (day === 2 || day === 20) return 'holiday'
  const date = new Date(2026, 9, day)
  if (date.getDay() === 0 || date.getDay() === 6) return 'present'
  const value = hash(`${name}|2026-10-${day}`) % 100
  if (value < 4) return 'absent'
  if (value < 9) return 'leave'
  if (value < 14) return 'half'
  if (value < 22) return 'wfh'
  return 'present'
}

export function titleForLine(key: OutputKey, count: number) {
  const item = allOutputs.find((output) => output.key === key)
  return `${count} × ${(count === 1 ? item?.label : item?.plural)?.toLowerCase()}`
}
