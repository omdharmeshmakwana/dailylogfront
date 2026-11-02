export type Role = 'employee' | 'manager'
export type Theme = 'light' | 'dark'
export type ManagerPage = 'dashboard' | 'attendance' | 'projects' | 'employees' | 'eod'
export type WorkType = 'image' | 'clip'
export type OutputKey = 'charsheet' | 'location' | 'storyboard' | 'keyframe' | 'clip' | 'lipsync' | 'extend' | 'upscale'
export type WorkKind = 'Fresh' | 'Revision' | 'Test' | 'Trailer' | 'Training'
export type WorkStatus = 'In progress' | 'Sent for approval' | 'On hold' | 'Done'
export type AttendanceStatus = 'present' | 'absent' | 'half' | 'wfh' | 'leave' | 'holiday'

export interface LineItem {
  id: string
  type: WorkType
  items: { k: OutputKey; count: number }[]
  text: string
}

export interface SceneEntry {
  id: string
  project: string
  episode: string
  scene: string
  kind: WorkKind | ''
  status: WorkStatus | ''
  type: WorkType
  selected: Partial<Record<OutputKey, number>>
  text: string
  lines: LineItem[]
  errors: Partial<Record<'project' | 'episode' | 'kind' | 'status' | 'lines' | 'unsaved' | 'work', string>>
}

export interface Project {
  id: string
  name: string
  episodes: string[]
  archived: boolean
}

export interface Employee {
  name: string
  email: string
  role: Role
  active: boolean
}

export interface AttendanceRecord {
  status: AttendanceStatus
  checkIn?: string
}
