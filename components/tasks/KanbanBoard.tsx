'use client'

import { useState } from 'react'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'

import type { KanbanStatus, OperationTask } from '@/types/schedule'

import KanbanColumn from './KanbanColumn'
import TaskCard from './TaskCard'
import { COLUMNS } from './task-labels'

interface KanbanBoardProps {
  tasks: OperationTask[]
  isAdmin: boolean
  onStatusChange: (taskId: string, status: KanbanStatus) => void
  onTaskClick: (task: OperationTask) => void
}

export default function KanbanBoard({
  tasks,
  isAdmin,
  onStatusChange,
  onTaskClick,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const activeTask = activeId ? tasks.find(task => task.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const taskId = String(event.active.id)
    const task = tasks.find(candidate => candidate.id === taskId)
    const overId = event.over?.id ? String(event.over.id) : null

    if (!task || !overId) return

    const directColumn = COLUMNS.find(column => column.id === overId)?.id
    const overTask = tasks.find(candidate => candidate.id === overId)
    const nextStatus = directColumn ?? overTask?.kanban_status

    if (nextStatus && nextStatus !== task.kanban_status) {
      onStatusChange(task.id, nextStatus)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid gap-4 xl:grid-cols-4">
        {COLUMNS.map(column => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasks.filter(task => task.kanban_status === column.id)}
            disabled={!isAdmin}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <TaskCard task={activeTask} disabled onClick={() => undefined} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
