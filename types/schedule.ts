export type EventType = 'regular' | 'special' | 'closed' | 'exceed'
export type TaskCategory = 'opening' | 'during' | 'closing' | 'weekly' | 'monthly' | 'custom'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly'
export type TournamentStatus = 'planning' | 'registration' | 'active' | 'completed'
export type ExceedPhase = 'pre' | 'day' | 'post'
export type KanbanStatus = 'todo' | 'in_progress' | 'done' | 'skipped'

export interface OperationEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  event_type: EventType
  color_override: string | null
  recurrence_type: RecurrenceType
  recurrence_days: number[] | null
  recurrence_day_of_month: number | null
  recurrence_end_date: string | null
  parent_event_id: string | null
  image_urls: string[]
  notion_page_id: string | null
  gcal_event_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface OperationTask {
  id: string
  title: string
  category: TaskCategory
  priority: TaskPriority
  recurrence_type: RecurrenceType
  recurrence_days: number[] | null
  recurrence_day_of_month: number | null
  assignee_id: string | null
  due_date: string | null
  notes: string | null
  image_urls: string[]
  sort_order: number
  is_active: boolean
  kanban_status: KanbanStatus
  notion_page_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  assignee?: { name: string } | null
  completion?: TaskCompletion | null
}

export interface TaskCompletion {
  id: string
  task_id: string
  completion_date: string
  status: 'done' | 'skipped'
  completed_by: string | null
  completed_at: string
  notes: string | null
}

export interface ExceedTournament {
  id: string
  title: string
  tournament_date: string
  start_time: string | null
  venue_notes: string | null
  max_participants: number
  current_participants: number
  status: TournamentStatus
  notes: string | null
  image_urls: string[]
  notion_page_id: string | null
  gcal_event_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  tasks?: ExceedTask[]
  participants?: ExceedParticipant[]
}

export interface ExceedTask {
  id: string
  tournament_id: string
  phase: ExceedPhase
  title: string
  is_done: boolean
  assignee_id: string | null
  sort_order: number
  notes: string | null
  image_urls: string[]
  done_at: string | null
  done_by: string | null
  created_at: string
  assignee?: { name: string } | null
}

export interface ExceedParticipant {
  id: string
  tournament_id: string
  name: string
  seat_number: number | null
  registered_at: string
  status: 'registered' | 'checked_in' | 'eliminated' | 'final_table' | 'winner'
  notes: string | null
}

export const EXCEED_TASK_TEMPLATES: Record<ExceedPhase, string[]> = {
  pre: [
    '会場レイアウト確認',
    '参加者リスト最終確認',
    'チップとカード準備',
    '賞品と景品準備',
    '告知SNS最終投稿',
  ],
  day: [
    '受付テーブル設置',
    '参加者チェックイン',
    'ゲーム開始アナウンス',
    '進行とスコア管理',
    '表彰と景品渡し',
  ],
  post: [
    '結果をシステムに記録',
    '会場原状復帰',
    'SNS結果投稿',
    '次回大会メモ作成',
  ],
}
