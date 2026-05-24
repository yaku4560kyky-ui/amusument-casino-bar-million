import type { OperationTask } from '@/types/schedule'

export function isTaskActiveToday(task: OperationTask, date: Date): boolean {
  switch (task.recurrence_type) {
    case 'none':
    case 'daily':
      return true
    case 'weekly':
      return task.recurrence_days?.includes(date.getDay()) ?? false
    case 'monthly':
      return task.recurrence_day_of_month === date.getDate()
    default:
      return false
  }
}
