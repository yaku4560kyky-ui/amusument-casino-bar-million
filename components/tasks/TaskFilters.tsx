'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TaskCategory, TaskPriority } from '@/types/schedule'

import { CATEGORY_LABEL, PRIORITY_LABEL } from './task-labels'

interface TaskFiltersProps {
  priorities: string[]
  categories: string[]
  profiles: { id: string; name: string }[]
  value: { priority: string; category: string; assigneeId: string }
  onChange: (filters: { priority: string; category: string; assigneeId: string }) => void
}

const ALL_FILTER = 'all'

export default function TaskFilters({
  priorities,
  categories,
  profiles,
  value,
  onChange,
}: TaskFiltersProps) {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-3">
      <Select
        value={value.priority}
        onValueChange={priority => onChange({ ...value, priority: priority ?? ALL_FILTER })}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="優先度フィルター" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FILTER}>すべて</SelectItem>
          {priorities.map(priority => (
            <SelectItem key={priority} value={priority}>
              {PRIORITY_LABEL[priority as TaskPriority]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.category}
        onValueChange={category => onChange({ ...value, category: category ?? ALL_FILTER })}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="カテゴリフィルター" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FILTER}>すべて</SelectItem>
          {categories.map(category => (
            <SelectItem key={category} value={category}>
              {CATEGORY_LABEL[category as TaskCategory]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.assigneeId}
        onValueChange={assigneeId => onChange({ ...value, assigneeId: assigneeId ?? ALL_FILTER })}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="担当者フィルター" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FILTER}>すべて</SelectItem>
          <SelectItem value="none">未設定</SelectItem>
          {profiles.map(profile => (
            <SelectItem key={profile.id} value={profile.id}>
              {profile.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
