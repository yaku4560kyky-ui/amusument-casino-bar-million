'use client'

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { AnimatePresence, motion } from 'framer-motion'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { OperationTask, KanbanStatus } from '@/types/schedule'

import TaskCard from './TaskCard'

interface KanbanColumnProps {
  column: {
    id: KanbanStatus
    label: string
    color: string
  }
  tasks: OperationTask[]
  disabled: boolean
  onTaskClick: (task: OperationTask) => void
}

export default function KanbanColumn({
  column,
  tasks,
  disabled,
  onTaskClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'min-h-[32rem] rounded-lg border p-3 transition-colors',
        column.color,
        isOver && 'ring-2 ring-amber-300/60'
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-100">{column.label}</h2>
        <AnimatePresence mode="wait">
          <motion.div
            key={tasks.length}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Badge variant="outline" className="border-border bg-slate-950/40 text-slate-300">
              {tasks.length}
            </Badge>
          </motion.div>
        </AnimatePresence>
      </div>

      <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          <AnimatePresence>
            {tasks.length > 0 ? (
              tasks.map(task => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <TaskCard
                    task={task}
                    disabled={disabled}
                    onClick={() => onTaskClick(task)}
                  />
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg border border-dashed border-slate-600/60 p-6 text-center text-sm text-slate-400"
              >
                タスクなし
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SortableContext>
    </section>
  )
}
