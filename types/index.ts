export type UserRole = 'admin' | 'staff'
export type Role = UserRole
export type EmploymentType = 'full_time' | 'part_time' | 'contract'
export type ClockStatus = 'not_started' | 'working' | 'on_break' | 'finished'
export type ShiftAvailability = 'available' | 'preferred' | 'unavailable'
export type ShiftRequestStatus = 'pending' | 'approved' | 'rejected'

export interface NotificationPrefs {
  in_app: boolean
  push: boolean
  email: boolean
  task_assigned: boolean
  event_reminder: boolean
  tournament_update: boolean
}

export interface Profile {
  id: string
  name: string
  name_kana: string | null
  role: UserRole
  position: string | null
  phone: string | null
  avatar_url: string | null
  notification_prefs: NotificationPrefs
  hourly_wage?: number
  night_wage_rate?: number
  employment_type?: EmploymentType
  transportation_fee?: number
  created_at: string
  updated_at: string
}

export interface TimeRecord {
  id: string
  user_id: string
  clock_in: string
  clock_out: string | null
  status: ClockStatus
  note: string | null
  total_minutes: number | null
  night_minutes: number | null
  regular_wage: number | null
  night_premium: number | null
  total_wage: number | null
  drink_back: number
  nomination_count: number
  is_manually_edited: boolean
  edited_by: string | null
  edited_at: string | null
  created_at: string
  profile?: Profile
  breaks?: Break[]
}

export interface Break {
  id: string
  time_record_id: string
  break_start: string
  break_end: string | null
  created_at: string
}

export interface ShiftRequest {
  id: string
  user_id: string
  date: string
  desired_start: string | null
  desired_end: string | null
  availability: ShiftAvailability
  note: string | null
  status: ShiftRequestStatus
  created_at: string
  profile?: Profile
}

export interface Shift {
  id: string
  user_id: string
  date: string
  start_time: string
  end_time: string
  position: string | null
  note: string | null
  created_at: string
  profile?: Profile
}

export interface ShiftPeriod {
  id: string
  label: string
  target_year: number
  target_month: number
  period_start: string | null
  period_end: string | null
  deadline: string | null
  is_open: boolean
  created_by: string | null
  created_at: string
}

export interface WageCalculation {
  totalMinutes: number
  breakMinutes: number
  workedMinutes: number
  nightMinutes: number
  regularMinutes: number
  regularWage: number
  nightPremium: number
  totalWage: number
}
