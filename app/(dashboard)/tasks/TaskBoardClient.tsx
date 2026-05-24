'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import KanbanBoard from '@/components/tasks/KanbanBoard'
import TaskDialog from '@/components/tasks/TaskDialog'
import TaskFilters from '@/components/tasks/TaskFilters'
import { Button } from '@/components/ui/button'
import type { KanbanStatus, OperationTask, TaskCategory, TaskPriority } from '@/types/schedule'

type ProfileOption = {
  id: string
  name: string
}

type Filters = {
  priority: string
  category: string
  assigneeId: string
}

interface TaskBoardClientProps {
  initialTasks: OperationTask[]
  profiles: ProfileOption[]
  isAdmin: boolean
  userId: string
}

const ALL_FILTER = 'all'

export default function TaskBoardClient({
  initialTasks,
  profiles,
  isAdmin,
  userId,
}: TaskBoardClientProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [filters, setFilters] = useState<Filters>({
    priority: ALL_FILTER,
    category: ALL_FILTER,
    assigneeId: ALL_FILTER,
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<OperationTask | null>(null)

  const filteredTasks = useMemo(
    () =>
      tasks.filter(task => {
        if (filters.priority !== ALL_FILTER && task.priority !== filters.priority) return false
        if (filters.category !== ALL_FILTER && task.category !== filters.category) return false
        if (filters.assigneeId !== ALL_FILTER && (task.assignee_id ?? 'none') !== filters.assigneeId) {
          return false
        }
        return true
      }),
    [filters, tasks]
  )

  async function handleStatusChange(taskId: string, kanbanStatus: KanbanStatus) {
    const before = tasks
    setTasks(current =>
      current.map(task =>
        task.id === taskId ? { ...task, kanban_status: kanbanStatus } : task
      )
    )

    try {
      const response = await fetch(`/api/schedule/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kanban_status: kanbanStatus }),
      })

      if (!response.ok) throw new Error('failed')
    } catch {
      setTasks(before)
      toast.error('更新に失敗しました')
    }
  }

  function handleAddTask() {
    setEditingTask(null)
    setIsDialogOpen(true)
  }

  function handleEditTask(task: OperationTask) {
    if (!isAdmin) return
    setEditingTask(task)
    setIsDialogOpen(true)
  }

  const priorities = ['low', 'normal', 'high', 'urgent'] satisfies TaskPriority[]
  const categories = ['opening', 'during', 'closing', 'weekly', 'monthly', 'custom'] satisfies TaskCategory[]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="mx-auto max-w-7xl space-y-6 p-6"
    >
      <section className="rounded-xl border border-amber-400/15 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(3,7,18,0.92))] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-amber-200/70">業務管理</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-100">
              タスクボード
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              営業タスクの進行状況、担当者、期限を一覧で管理します。
            </p>
          </div>
          {isAdmin && (
            <Button
              type="button"
              className="bg-amber-400 text-slate-950 hover:bg-amber-300"
              onClick={handleAddTask}
            >
              <Plus className="size-4" />
              タスク追加
            </Button>
          )}
        </div>
      </section>

      <TaskFilters
        priorities={priorities}
        categories={categories}
        profiles={profiles}
        value={filters}
        onChange={setFilters}
      />

      <KanbanBoard
        tasks={filteredTasks}
        isAdmin={isAdmin}
        onStatusChange={handleStatusChange}
        onTaskClick={handleEditTask}
      />

      {isAdmin && (
        <TaskDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          task={editingTask}
          profiles={profiles}
          userId={userId}
        />
      )}
    </motion.div>
  )
}
