'use client'

import { useMemo, useState } from 'react'
import { format, getDay } from 'date-fns'
import {
  BarChart2,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Moon,
  Plus,
  Star,
  Sun,
  Trash2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type TaskCategory = 'opening' | 'during' | 'closing' | 'weekly' | 'monthly' | 'custom'
type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly'

type TaskCompletion = {
  id: string
  task_id: string
  completion_date: string
  status: 'done' | 'skipped'
  completed_by: string
  completed_at: string
  notes: string | null
}

type OperationTask = {
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
  sort_order: number
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  assignee: { name: string } | null
  completion: TaskCompletion | null
}

interface OperationsTabProps {
  tasks: OperationTask[]
  completions: TaskCompletion[]
  today: string
  staffProfiles: Array<{ id: string; name: string }>
  onCompleteTask: (taskId: string) => Promise<void>
  onUncompleteTask: (taskId: string) => Promise<void>
  onAddTask: (data: Partial<OperationTask>) => Promise<void>
  onDeleteTask: (id: string) => Promise<void>
  isAdmin: boolean
}

type StatusFilter = 'all' | 'todo' | 'done'

const categoryOrder: TaskCategory[] = ['opening', 'during', 'closing', 'weekly', 'monthly', 'custom']

const categoryConfig = {
  opening: { label: '開店前チェック', icon: Sun, className: 'text-amber-300' },
  during: { label: '営業中タスク', icon: Building2, className: 'text-blue-300' },
  closing: { label: '閉店チェック', icon: Moon, className: 'text-purple-300' },
  weekly: { label: '週次タスク', icon: Calendar, className: 'text-green-300' },
  monthly: { label: '月次タスク', icon: BarChart2, className: 'text-pink-300' },
  custom: { label: 'カスタムタスク', icon: Star, className: 'text-slate-300' },
} satisfies Record<TaskCategory, { label: string; icon: typeof Sun; className: string }>

const priorityConfig = {
  low: { label: '低', className: 'border-border text-muted-foreground' },
  normal: { label: '通常', className: 'border-amber-500/30 text-amber-300/70' },
  high: { label: '高', className: 'border-amber-500/40 bg-amber-500/15 text-amber-300' },
  urgent: { label: '緊急', className: 'border-red-500/40 bg-red-500/15 text-red-300' },
} satisfies Record<TaskPriority, { label: string; className: string }>

const recurrenceLabels = {
  none: '単発',
  daily: '毎日',
  weekly: '毎週',
  monthly: '毎月',
} satisfies Record<RecurrenceType, string>

const emptyForm = {
  title: '',
  category: 'opening' as TaskCategory,
  priority: 'normal' as TaskPriority,
  recurrence_type: 'daily' as RecurrenceType,
  assignee_id: 'unassigned',
  notes: '',
  due_date: '',
}

function isTaskActiveToday(task: OperationTask, todayDate: Date) {
  if (!task.is_active) return false

  const dow = getDay(todayDate)
  const dom = todayDate.getDate()

  if (task.recurrence_type === 'daily') return true
  if (task.recurrence_type === 'weekly') return task.recurrence_days?.includes(dow) ?? false
  if (task.recurrence_type === 'monthly') return task.recurrence_day_of_month === dom
  return task.due_date === format(todayDate, 'yyyy-MM-dd')
}

export default function OperationsTab({
  tasks,
  completions,
  today,
  staffProfiles,
  onCompleteTask,
  onUncompleteTask,
  onAddTask,
  onDeleteTask,
  isAdmin,
}: OperationsTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all')
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [addingForCategory, setAddingForCategory] = useState<TaskCategory | null>(null)
  const [addFormData, setAddFormData] = useState(emptyForm)
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const todayDate = useMemo(() => new Date(`${today}T00:00:00`), [today])

  const activeTasks = useMemo(
    () =>
      tasks
        .filter(task => isTaskActiveToday(task, todayDate))
        .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'ja')),
    [tasks, todayDate]
  )

  const completedTaskIds = useMemo(
    () =>
      new Set(
        completions
          .filter(completion => completion.completion_date === today && completion.status === 'done')
          .map(completion => completion.task_id)
      ),
    [completions, today]
  )

  const completedCount = activeTasks.filter(task => completedTaskIds.has(task.id)).length
  const totalCount = activeTasks.length
  const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const visibleTasks = activeTasks.filter(task => {
    const isDone = completedTaskIds.has(task.id)
    if (statusFilter === 'todo' && isDone) return false
    if (statusFilter === 'done' && !isDone) return false
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
    return true
  })

  const tasksByCategory = categoryOrder.map(category => ({
    category,
    tasks: visibleTasks.filter(task => task.category === category),
    allActiveTasks: activeTasks.filter(task => task.category === category),
  }))

  function openAddDialog(category: TaskCategory) {
    setAddingForCategory(category)
    setAddFormData({ ...emptyForm, category })
    setIsAddDialogOpen(true)
  }

  function toggleNotes(taskId: string) {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  async function withTaskPending(taskId: string, action: () => Promise<void>) {
    setPendingTaskIds(prev => new Set(prev).add(taskId))
    try {
      await action()
    } finally {
      setPendingTaskIds(prev => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }
  }

  async function handleSubmitTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!addFormData.title.trim()) return

    setIsSubmitting(true)
    try {
      await onAddTask({
        title: addFormData.title.trim(),
        category: addFormData.category,
        priority: addFormData.priority,
        recurrence_type: addFormData.recurrence_type,
        assignee_id: addFormData.assignee_id === 'unassigned' ? null : addFormData.assignee_id,
        notes: addFormData.notes.trim() || null,
        due_date: addFormData.recurrence_type === 'none' ? addFormData.due_date || today : null,
        is_active: true,
      })
      setIsAddDialogOpen(false)
      setAddingForCategory(null)
      setAddFormData(emptyForm)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function completeAll(tasksToComplete: OperationTask[]) {
    const incompleteTasks = tasksToComplete.filter(task => !completedTaskIds.has(task.id))
    await Promise.all(incompleteTasks.map(task => withTaskPending(task.id, () => onCompleteTask(task.id))))
  }

  return (
    <div className="space-y-4 rounded-xl border border-amber-400/10 bg-[oklch(0.12_0.02_260)] p-4 text-slate-100 shadow-2xl shadow-black/30">
      <Card className="border border-amber-400/10 bg-slate-950/50 ring-amber-400/10">
        <CardHeader className="pb-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-amber-100">
              今日のタスク {completedCount}/{totalCount} 完了 ({overallProgress}%)
            </CardTitle>
            <Badge className="border border-amber-500/30 bg-amber-500/10 text-amber-200">
              {format(todayDate, 'yyyy/MM/dd')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/10 bg-slate-950/40 p-3">
        <div className="flex rounded-lg border border-amber-400/10 bg-slate-900/70 p-1">
          {[
            ['all', '全て'],
            ['todo', '未完了'],
            ['done', '完了'],
          ].map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter(value as StatusFilter)}
              className={cn(
                'text-slate-300 hover:bg-amber-500/10 hover:text-amber-100',
                statusFilter === value && 'bg-amber-500/15 text-amber-200'
              )}
            >
              {label}
            </Button>
          ))}
        </div>

        <Select
          value={priorityFilter}
          onValueChange={value => setPriorityFilter(value as 'all' | TaskPriority)}
        >
          <SelectTrigger className="min-w-36 border-amber-400/10 bg-slate-900/70 text-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border border-amber-400/10 bg-slate-950 text-slate-100">
            <SelectItem value="all">優先度すべて</SelectItem>
            {Object.entries(priorityConfig).map(([priority, config]) => (
              <SelectItem key={priority} value={priority}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {tasksByCategory.map(({ category, tasks: categoryTasks, allActiveTasks }) => {
          if (categoryTasks.length === 0) return null

          const config = categoryConfig[category]
          const Icon = config.icon
          const doneCount = allActiveTasks.filter(task => completedTaskIds.has(task.id)).length
          const categoryProgress =
            allActiveTasks.length > 0 ? Math.round((doneCount / allActiveTasks.length) * 100) : 0

          return (
            <Card key={category} className="border border-amber-400/10 bg-slate-950/60 ring-amber-400/10">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon className={cn('size-5 shrink-0', config.className)} />
                    <div className="min-w-0">
                      <CardTitle className="truncate text-slate-100">{config.label}</CardTitle>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <span>{doneCount}/{allActiveTasks.length}件</span>
                        <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-amber-400"
                            style={{ width: `${categoryProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => completeAll(categoryTasks)}
                      className="border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                    >
                      全て完了
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                {categoryTasks.map(task => {
                  const isDone = completedTaskIds.has(task.id)
                  const isPending = pendingTaskIds.has(task.id)
                  const hasNotes = Boolean(task.notes?.trim())

                  return (
                    <div key={task.id} className="rounded-lg border border-amber-400/10 bg-slate-900/45">
                      <div className="flex items-center gap-3 p-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            withTaskPending(task.id, () =>
                              isDone ? onUncompleteTask(task.id) : onCompleteTask(task.id)
                            )
                          }
                          className={cn(
                            'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border transition-all disabled:opacity-60',
                            isDone
                              ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                              : 'border-border text-muted-foreground hover:border-amber-500/30 hover:bg-amber-500/10'
                          )}
                          aria-label={isDone ? '未完了に戻す' : '完了にする'}
                        >
                          <Check className={cn('size-5', isDone ? 'opacity-100' : 'opacity-30')} />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                'min-w-0 truncate font-medium text-slate-100',
                                isDone && 'text-slate-500 line-through'
                              )}
                            >
                              {task.title}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn('shrink-0 bg-transparent', priorityConfig[task.priority].className)}
                            >
                              {priorityConfig[task.priority].label}
                            </Badge>
                            {task.assignee && (
                              <Badge className="shrink-0 border border-slate-700 bg-slate-800 text-slate-300">
                                {task.assignee.name}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {hasNotes && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => toggleNotes(task.id)}
                            className="text-slate-400 hover:bg-amber-500/10 hover:text-amber-200"
                            aria-label="メモを開閉"
                          >
                            <ChevronDown
                              className={cn(
                                'size-4 transition-transform',
                                expandedNotes.has(task.id) && 'rotate-180'
                              )}
                            />
                          </Button>
                        )}

                        {isAdmin && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => withTaskPending(task.id, () => onDeleteTask(task.id))}
                            className="text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                            aria-label="タスクを削除"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>

                      {hasNotes && expandedNotes.has(task.id) && (
                        <div className="ml-[64px] border-t border-amber-400/10 px-2 py-3 text-sm leading-relaxed text-slate-300">
                          {task.notes}
                        </div>
                      )}
                    </div>
                  )
                })}

                {isAdmin && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openAddDialog(category)}
                    className="w-full border-dashed border-amber-500/30 bg-amber-500/5 text-amber-200 hover:bg-amber-500/10"
                  >
                    <Plus className="size-4" />
                    タスクを追加
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {isAdmin && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-lg border border-amber-400/10 bg-slate-950 text-slate-100 ring-amber-400/10">
            <DialogHeader>
              <DialogTitle className="text-amber-100">
                {addingForCategory ? `${categoryConfig[addingForCategory].label}に追加` : 'タスクを追加'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmitTask} className="space-y-4">
              <div className="space-y-1.5">
                <Label>タスク名</Label>
                <Input
                  required
                  value={addFormData.title}
                  onChange={event => setAddFormData(prev => ({ ...prev, title: event.target.value }))}
                  className="border-amber-400/10 bg-slate-900/70 text-slate-100"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>カテゴリ</Label>
                  <Select
                    value={addFormData.category}
                    onValueChange={value =>
                      setAddFormData(prev => ({ ...prev, category: value as TaskCategory }))
                    }
                  >
                    <SelectTrigger className="w-full border-amber-400/10 bg-slate-900/70 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border border-amber-400/10 bg-slate-950 text-slate-100">
                      {categoryOrder.map(category => (
                        <SelectItem key={category} value={category}>
                          {categoryConfig[category].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>優先度</Label>
                  <Select
                    value={addFormData.priority}
                    onValueChange={value =>
                      setAddFormData(prev => ({ ...prev, priority: value as TaskPriority }))
                    }
                  >
                    <SelectTrigger className="w-full border-amber-400/10 bg-slate-900/70 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border border-amber-400/10 bg-slate-950 text-slate-100">
                      {Object.entries(priorityConfig).map(([priority, config]) => (
                        <SelectItem key={priority} value={priority}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>繰り返し</Label>
                  <Select
                    value={addFormData.recurrence_type}
                    onValueChange={value =>
                      setAddFormData(prev => ({ ...prev, recurrence_type: value as RecurrenceType }))
                    }
                  >
                    <SelectTrigger className="w-full border-amber-400/10 bg-slate-900/70 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border border-amber-400/10 bg-slate-950 text-slate-100">
                      {Object.entries(recurrenceLabels).map(([recurrence, label]) => (
                        <SelectItem key={recurrence} value={recurrence}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>担当</Label>
                  <Select
                    value={addFormData.assignee_id ?? 'unassigned'}
                    onValueChange={value =>
                      setAddFormData(prev => ({ ...prev, assignee_id: value ?? 'unassigned' }))
                    }
                  >
                    <SelectTrigger className="w-full border-amber-400/10 bg-slate-900/70 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border border-amber-400/10 bg-slate-950 text-slate-100">
                      <SelectItem value="unassigned">未割当</SelectItem>
                      {staffProfiles.map(staff => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {addFormData.recurrence_type === 'none' && (
                <div className="space-y-1.5">
                  <Label>期限日</Label>
                  <Input
                    type="date"
                    value={addFormData.due_date}
                    onChange={event => setAddFormData(prev => ({ ...prev, due_date: event.target.value }))}
                    className="border-amber-400/10 bg-slate-900/70 text-slate-100"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>メモ</Label>
                <Textarea
                  value={addFormData.notes}
                  onChange={event => setAddFormData(prev => ({ ...prev, notes: event.target.value }))}
                  className="border-amber-400/10 bg-slate-900/70 text-slate-100"
                />
              </div>

              <DialogFooter className="border-amber-400/10 bg-slate-900/70">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !addFormData.title.trim()}
                  className="bg-amber-500 text-slate-950 hover:bg-amber-400"
                >
                  追加
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
