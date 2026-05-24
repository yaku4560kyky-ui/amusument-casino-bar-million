import type { KanbanStatus, TaskCategory, TaskPriority, RecurrenceType } from '@/types/schedule'

export const COLUMNS: Array<{
  id: KanbanStatus
  label: string
  color: string
}> = [
  { id: 'todo', label: '未着手', color: 'bg-slate-500/20 border-slate-500/30' },
  { id: 'in_progress', label: '進行中', color: 'bg-blue-500/20 border-blue-500/30' },
  { id: 'done', label: '完了', color: 'bg-green-500/20 border-green-500/30' },
  { id: 'skipped', label: 'スキップ', color: 'bg-yellow-500/20 border-yellow-500/30' },
]

export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  normal: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  low: 'bg-muted text-muted-foreground border-border',
}

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: '緊急',
  high: '高',
  normal: '普通',
  low: '低',
}

export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  opening: 'オープン',
  during: '営業中',
  closing: 'クローズ',
  weekly: '週次',
  monthly: '月次',
  custom: 'カスタム',
}

export const RECURRENCE_LABEL: Record<RecurrenceType, string> = {
  none: 'なし',
  daily: '毎日',
  weekly: '毎週',
  monthly: '毎月',
}
