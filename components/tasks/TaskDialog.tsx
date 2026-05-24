'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import ImageGallery from '@/components/image/ImageGallery'
import ImageUpload from '@/components/image/ImageUpload'
import VoiceInput from '@/components/voice/VoiceInput'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { OperationTask, RecurrenceType, TaskCategory, TaskPriority } from '@/types/schedule'

import { CATEGORY_LABEL, PRIORITY_LABEL, RECURRENCE_LABEL } from './task-labels'

type ProfileOption = {
  id: string
  name: string
}

type TaskForm = {
  title: string
  category: TaskCategory
  priority: TaskPriority
  assignee_id: string
  due_date: string
  recurrence_type: RecurrenceType
  notes: string
  image_urls: string[]
}

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: OperationTask | null
  profiles: ProfileOption[]
  userId: string
}

const EMPTY_FORM: TaskForm = {
  title: '',
  category: 'custom',
  priority: 'normal',
  assignee_id: 'none',
  due_date: '',
  recurrence_type: 'none',
  notes: '',
  image_urls: [],
}

export default function TaskDialog({
  open,
  onOpenChange,
  task,
  profiles,
  userId: _userId,
}: TaskDialogProps) {
  const router = useRouter()
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [draftRefId, setDraftRefId] = useState('')

  useEffect(() => {
    if (!open) return
    setDraftRefId(crypto.randomUUID())
    setForm(
      task
        ? {
            title: task.title,
            category: task.category,
            priority: task.priority,
            assignee_id: task.assignee_id ?? 'none',
            due_date: task.due_date ?? '',
            recurrence_type: task.recurrence_type,
            notes: task.notes ?? '',
            image_urls: task.image_urls ?? [],
          }
        : EMPTY_FORM
    )
  }, [open, task])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    const payload = {
      title: form.title,
      category: form.category,
      priority: form.priority,
      assignee_id: form.assignee_id === 'none' ? null : form.assignee_id,
      due_date: form.due_date || null,
      recurrence_type: form.recurrence_type,
      notes: form.notes || null,
      image_urls: form.image_urls,
    }

    try {
      const response = await fetch(task ? `/api/schedule/tasks/${task.id}` : '/api/schedule/tasks', {
        method: task ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('failed')

      toast.success('タスクを保存しました')
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('タスクの保存に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  function appendTranscript(text: string) {
    setForm(current => ({
      ...current,
      title: current.title ? `${current.title} ${text}` : text,
    }))
  }

  const uploadRefId = task?.id ?? draftRefId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border border-amber-400/10 bg-[oklch(0.18_0.02_260)] text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-amber-100">
            {task ? 'タスク編集' : 'タスク追加'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">タイトル</Label>
            <div className="flex gap-2">
              <Input
                id="task-title"
                value={form.title}
                onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
                className="border-amber-400/20 bg-[oklch(0.12_0.02_260)] text-slate-100"
                required
              />
              <VoiceInput onTranscript={appendTranscript} disabled={isSubmitting} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>カテゴリ</Label>
              <Select
                value={form.category}
                onValueChange={category => setForm(current => ({ ...current, category: category as TaskCategory }))}
              >
                <SelectTrigger className="w-full border-amber-400/20 bg-[oklch(0.12_0.02_260)] text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>優先度</Label>
              <Select
                value={form.priority}
                onValueChange={priority => setForm(current => ({ ...current, priority: priority as TaskPriority }))}
              >
                <SelectTrigger className="w-full border-amber-400/20 bg-[oklch(0.12_0.02_260)] text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>担当者</Label>
              <Select
                value={form.assignee_id}
                onValueChange={assignee_id =>
                  setForm(current => ({ ...current, assignee_id: assignee_id ?? 'none' }))
                }
              >
                <SelectTrigger className="w-full border-amber-400/20 bg-[oklch(0.12_0.02_260)] text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未設定</SelectItem>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-due-date">期限日</Label>
              <Input
                id="task-due-date"
                type="date"
                value={form.due_date}
                onChange={event => setForm(current => ({ ...current, due_date: event.target.value }))}
                className="border-amber-400/20 bg-[oklch(0.12_0.02_260)] text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>繰り返し</Label>
            <Select
              value={form.recurrence_type}
              onValueChange={recurrence_type => setForm(current => ({ ...current, recurrence_type: recurrence_type as RecurrenceType }))}
            >
              <SelectTrigger className="w-full border-amber-400/20 bg-[oklch(0.12_0.02_260)] text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RECURRENCE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-notes">メモ</Label>
            <Textarea
              id="task-notes"
              value={form.notes}
              onChange={event => setForm(current => ({ ...current, notes: event.target.value }))}
              className="min-h-24 border-amber-400/20 bg-[oklch(0.12_0.02_260)] text-slate-100"
            />
          </div>

          <div className="space-y-3">
            <Label>画像</Label>
            <ImageGallery
              urls={form.image_urls}
              onDelete={url =>
                setForm(current => ({
                  ...current,
                  image_urls: current.image_urls.filter(currentUrl => currentUrl !== url),
                }))
              }
            />
            <ImageUpload
              refTable="operation_tasks"
              refId={uploadRefId}
              disabled={!uploadRefId || isSubmitting}
              onUploaded={url =>
                setForm(current => ({
                  ...current,
                  image_urls: [...current.image_urls, url],
                }))
              }
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="border-amber-400/20 bg-transparent text-slate-200 hover:bg-amber-400/10"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-400 text-slate-950 hover:bg-amber-300"
            >
              保存
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
