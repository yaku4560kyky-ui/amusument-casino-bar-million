'use client'

import { useState, type FormEvent } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { Calendar, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import VoiceInput from '@/components/voice/VoiceInput'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { EventType, OperationEvent } from '@/types/schedule'

interface CalendarTabProps {
  events: OperationEvent[]
  onAddEvent: (data: {
    title: string
    description?: string
    event_date: string
    start_time?: string
    end_time?: string
    event_type: EventType
  }) => Promise<void>
  onDeleteEvent: (id: string) => Promise<void>
  isAdmin: boolean
}

interface EventFormData {
  title: string
  description: string
  event_date: string
  start_time: string
  end_time: string
  event_type: EventType
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

const EVENT_STYLES: Record<EventType, string> = {
  regular: 'bg-amber-500/15 border border-amber-500/30 text-amber-200',
  special: 'bg-amber-600/25 border border-amber-600/40 text-amber-100',
  exceed: 'bg-purple-500/15 border border-purple-500/30 text-purple-200',
  closed: 'bg-red-500/10 border border-red-500/20 text-red-400',
}

const EVENT_LABELS: Record<EventType, string> = {
  regular: '通常営業',
  special: '特別イベント',
  exceed: 'EXCEED大会',
  closed: '臨時休業',
}

const EMPTY_FORM: EventFormData = {
  title: '',
  description: '',
  event_date: format(new Date(), 'yyyy-MM-dd'),
  start_time: '',
  end_time: '',
  event_type: 'regular',
}

function getEventsForDate(events: OperationEvent[], date: string) {
  return events.filter(event => event.event_date === date)
}

function getTimeRange(event: OperationEvent) {
  if (event.start_time && event.end_time) return `${event.start_time} - ${event.end_time}`
  if (event.start_time) return `${event.start_time} 開始`
  if (event.end_time) return `${event.end_time} 終了`
  return ''
}

export default function CalendarTab({
  events,
  onAddEvent,
  onDeleteEvent,
  isAdmin,
}: CalendarTabProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [formData, setFormData] = useState<EventFormData>(EMPTY_FORM)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPadding = Array.from({ length: getDay(monthStart) }, (_, index) => (
    new Date(monthStart.getFullYear(), monthStart.getMonth(), index - getDay(monthStart) + 1)
  ))
  const calendarDays = [...startPadding, ...monthDays]
  const activeDate = selectedDate ?? format(new Date(), 'yyyy-MM-dd')
  const selectedEvents = getEventsForDate(events, activeDate)

  function openAddDialog(date: string) {
    setSelectedDate(date)
    setFormData({ ...EMPTY_FORM, event_date: date })
    setIsAddDialogOpen(true)
  }

  function handleDayClick(date: Date) {
    const dateKey = format(date, 'yyyy-MM-dd')
    setSelectedDate(dateKey)
    if (isAdmin) openAddDialog(dateKey)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      await onAddEvent({
        title: formData.title,
        description: formData.description || undefined,
        event_date: formData.event_date,
        start_time: formData.start_time || undefined,
        end_time: formData.end_time || undefined,
        event_type: formData.event_type,
      })
      toast.success('イベントを追加しました')
      setIsAddDialogOpen(false)
      setFormData(EMPTY_FORM)
    } catch {
      toast.error('エラーが発生しました')
    }
  }

  async function handleDeleteEvent(id: string) {
    try {
      await onDeleteEvent(id)
      toast.success('イベントを削除しました')
    } catch {
      toast.error('エラーが発生しました')
    }
  }

  function appendTranscript(text: string) {
    setFormData(current => ({
      ...current,
      title: current.title ? `${current.title} ${text}` : text,
    }))
  }

  return (
    <div className="lg:flex lg:gap-6">
      <Card className="flex-1 border-amber-400/10 bg-[oklch(0.18_0.02_260)] text-slate-100">
        <CardHeader className="border-b border-amber-400/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="size-5 text-amber-300" />
              <CardTitle className="text-lg text-amber-100">
                {format(currentMonth, 'yyyy年M月', { locale: ja })}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="border-amber-400/20 bg-transparent text-amber-200 hover:bg-amber-400/10"
                onClick={() => setCurrentMonth(month => subMonths(month, 1))}
                aria-label="前月"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="border-amber-400/20 bg-transparent text-amber-200 hover:bg-amber-400/10"
                onClick={() => setCurrentMonth(month => addMonths(month, 1))}
                aria-label="翌月"
              >
                <ChevronRight className="size-4" />
              </Button>
              {isAdmin && (
                <Button
                  type="button"
                  size="sm"
                  className="bg-amber-400 text-slate-950 hover:bg-amber-300"
                  onClick={() => openAddDialog(selectedDate ?? format(new Date(), 'yyyy-MM-dd'))}
                >
                  <Plus className="size-4" />
                  追加
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-amber-400/10 bg-[oklch(0.12_0.02_260)]">
            {WEEKDAYS.map(day => (
              <div
                key={day}
                className="border-b border-r border-amber-400/10 p-2 text-center text-xs font-medium text-amber-200 last:border-r-0"
              >
                {day}
              </div>
            ))}

            {calendarDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const dayEvents = getEventsForDate(events, dateKey)
              const visibleEvents = dayEvents.slice(0, 3)
              const hiddenCount = Math.max(dayEvents.length - visibleEvents.length, 0)
              const isCurrentMonth = isSameMonth(day, currentMonth)

              return (
                <button
                  type="button"
                  key={dateKey}
                  onClick={() => handleDayClick(day)}
                  className={[
                    'min-h-[80px] border-r border-b border-amber-400/10 p-2 text-left align-top transition-colors hover:bg-amber-400/5',
                    !isCurrentMonth ? 'opacity-40' : '',
                    isToday(day) ? 'bg-amber-400/5 ring-1 ring-amber-400/50' : '',
                    selectedDate === dateKey ? 'bg-amber-400/10' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <div className="mb-1 text-xs font-medium text-slate-200">
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {visibleEvents.map(event => (
                      <div key={event.id} className="group relative">
                        <div className={`truncate rounded px-1.5 py-0.5 text-[11px] leading-4 ${EVENT_STYLES[event.event_type]}`}>
                          {event.title}
                        </div>
                        <div className="absolute bottom-full left-0 z-50 mb-1 hidden w-48 rounded-lg border border-border bg-card p-2 text-xs text-card-foreground shadow-xl group-hover:block">
                          <div className="font-medium text-amber-100">{event.title}</div>
                          {getTimeRange(event) && (
                            <div className="mt-1 text-slate-300">{getTimeRange(event)}</div>
                          )}
                          {event.description && (
                            <div className="mt-1 whitespace-normal text-slate-400">{event.description}</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {hiddenCount > 0 && (
                      <div className="text-[11px] leading-4 text-slate-400">
                        +{hiddenCount} 件
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-slate-300">
            {Object.entries(EVENT_LABELS).map(([type, label]) => (
              <div key={type} className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${type === 'regular' ? 'bg-amber-500' : type === 'special' ? 'bg-amber-600' : type === 'exceed' ? 'bg-purple-500' : 'bg-red-500'}`} />
                {label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 w-full border-amber-400/10 bg-[oklch(0.18_0.02_260)] text-slate-100 lg:mt-0 lg:w-80">
        <CardHeader className="border-b border-amber-400/10">
          <CardTitle className="text-base text-amber-100">
            {format(parseISO(activeDate), 'M月d日 EEEE', { locale: ja })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {selectedEvents.length > 0 ? (
            selectedEvents.map(event => (
              <div
                key={event.id}
                className="rounded-lg border border-border bg-[oklch(0.12_0.02_260)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-100">{event.title}</div>
                    {getTimeRange(event) && (
                      <div className="mt-1 text-xs text-slate-400">{getTimeRange(event)}</div>
                    )}
                  </div>
                  {isAdmin && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => handleDeleteEvent(event.id)}
                      aria-label="削除"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Badge className={EVENT_STYLES[event.event_type]}>
                    {EVENT_LABELS[event.event_type]}
                  </Badge>
                </div>
                {event.description && (
                  <p className="mt-2 text-xs leading-5 text-slate-400">{event.description}</p>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-amber-400/20 p-6 text-center text-sm text-slate-400">
              予定はありません
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-md border border-amber-400/10 bg-[oklch(0.18_0.02_260)] text-slate-100">
            <DialogHeader>
              <DialogTitle className="text-amber-100">イベント追加</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="event_date" className="text-slate-200">日付</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={event => setFormData(prev => ({ ...prev, event_date: event.target.value }))}
                  className="border-amber-400/20 bg-[oklch(0.12_0.02_260)] text-slate-100"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-slate-200">タイトル</Label>
                <div className="flex gap-2">
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={event => setFormData(prev => ({ ...prev, title: event.target.value }))}
                    className="border-amber-400/20 bg-[oklch(0.12_0.02_260)] text-slate-100"
                    required
                  />
                  <VoiceInput onTranscript={appendTranscript} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-200">種別</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={value => setFormData(prev => ({ ...prev, event_type: value as EventType }))}
                >
                  <SelectTrigger className="w-full border-amber-400/20 bg-[oklch(0.12_0.02_260)] text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border border-border bg-[oklch(0.18_0.02_260)] text-slate-100">
                    {Object.entries(EVENT_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="start_time" className="text-slate-200">開始時間</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={event => setFormData(prev => ({ ...prev, start_time: event.target.value }))}
                    className="border-amber-400/20 bg-[oklch(0.12_0.02_260)] text-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end_time" className="text-slate-200">終了時間</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={event => setFormData(prev => ({ ...prev, end_time: event.target.value }))}
                    className="border-amber-400/20 bg-[oklch(0.12_0.02_260)] text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-slate-200">説明</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={event => setFormData(prev => ({ ...prev, description: event.target.value }))}
                  className="border-amber-400/20 bg-[oklch(0.12_0.02_260)] text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-amber-400/20 bg-transparent text-slate-200 hover:bg-amber-400/10"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  キャンセル
                </Button>
                <Button type="submit" className="bg-amber-400 text-slate-950 hover:bg-amber-300">
                  追加
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
