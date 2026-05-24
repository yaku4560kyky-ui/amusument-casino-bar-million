'use client'

import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { format, isBefore, parseISO, startOfToday } from 'date-fns'
import { CalendarClock, GripVertical, UserRound } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { OperationTask } from '@/types/schedule'

import { CATEGORY_LABEL, PRIORITY_LABEL, PRIORITY_STYLES } from './task-labels'

interface TaskCardProps {
  task: OperationTask
  disabled: boolean
  onClick: () => void
  isOverlay?: boolean
}

export default function TaskCard({ task, disabled, onClick, isOverlay = false }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  const isOverdue = task.due_date
    ? isBefore(parseISO(task.due_date), startOfToday()) && task.kanban_status !== 'done'
    : false

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      className={cn(
        'w-full rounded-lg border border-border bg-card p-3 text-left text-card-foreground shadow-sm transition hover:border-amber-300/40 hover:bg-muted/30',
        isDragging && 'opacity-40',
        isOverlay && 'rotate-1 shadow-xl'
      )}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 font-semibold leading-5 text-slate-100">{task.title}</div>
        {!disabled && <GripVertical className="mt-0.5 size-4 shrink-0 text-slate-500" />}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge className={PRIORITY_STYLES[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
        <Badge variant="outline" className="border-amber-400/20 text-amber-200">
          {CATEGORY_LABEL[task.category]}
        </Badge>
      </div>

      {(task.assignee?.name || task.due_date) && (
        <div className="mt-3 space-y-1.5 text-xs text-slate-400">
          {task.assignee?.name && (
            <div className="flex items-center gap-1.5">
              <UserRound className="size-3.5" />
              <span>{task.assignee.name}</span>
            </div>
          )}
          {task.due_date && (
            <div className={cn('flex items-center gap-1.5', isOverdue && 'text-red-400')}>
              <CalendarClock className="size-3.5" />
              <span>{format(parseISO(task.due_date), 'yyyy/MM/dd')}</span>
            </div>
          )}
        </div>
      )}
    </button>
  )
}
