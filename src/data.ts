import type { AttendanceStatus, LineItem, OutputKey, SceneEntry, WorkKind, WorkStatus, WorkType } from './types'

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

export const attendanceMeta: Record<AttendanceStatus, { label: string; short: string; tone: string }> = {
  present: { label: 'Present', short: 'P', tone: 'ok' },
  absent: { label: 'Absent', short: 'A', tone: 'danger' },
  half: { label: 'Half day', short: 'H', tone: 'warn' },
  wfh: { label: 'Work from home', short: 'W', tone: 'info' },
  leave: { label: 'Leave', short: 'L', tone: 'violet' },
  holiday: { label: 'Holiday', short: 'Ho', tone: 'hol' },
}

export function titleForLine(key: OutputKey, count: number) {
  const item = allOutputs.find((output) => output.key === key)
  return `${count} × ${(count === 1 ? item?.label : item?.plural)?.toLowerCase()}`
}

// "3 × character sheet + 12 × keyframes"
export function lineSummary(line: Pick<LineItem, 'items'>) {
  return line.items.map((item) => titleForLine(item.k, item.count)).join(' + ')
}

// "18 days · EP 01 · SC 06, SC 07"
export function entryTitle(entry: { project: string; episode: string; scene: string }) {
  return [entry.project, entry.episode, entry.scene].filter(Boolean).join(' · ')
}

export function statusTone(status: string) {
  if (status === 'Done') return 'ok'
  if (status === 'On hold') return 'warn'
  if (status === 'Sent for approval') return 'violet'
  return 'info'
}
