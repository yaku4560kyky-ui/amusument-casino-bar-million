'use client'

import { useState } from 'react'
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ShiftAvailability, ShiftRequest } from '@/types'

interface DayData {
  availability: ShiftAvailability | null
  desired_start: string
  desired_end: string
  note: string
}

interface ShiftCalendarProps {
  existingRequests: ShiftRequest[]
  targetYear?: number
  targetMonth?: number
  periodStart?: string
  periodEnd?: string
}

const AVAILABILITY_CONFIG: Record<ShiftAvailability, { label: string; color: string }> = {
  available:   { label: '○ 出勤可', color: 'bg-green-100 border-green-400 text-green-700' },
  preferred:   { label: '◎ 希望', color: 'bg-blue-100 border-blue-400 text-blue-700' },
  unavailable: { label: '× 不可', color: 'bg-red-100 border-red-400 text-red-600' },
}

const CYCLE: (ShiftAvailability | null)[] = [null, 'available', 'preferred', 'unavailable']

export default function ShiftCalendar({ existingRequests, targetYear, targetMonth: targetMonthProp, periodStart, periodEnd }: ShiftCalendarProps) {
  const [targetMonth, setTargetMonth] = useState(() => {
    if (periodStart) {
      const d = new Date(periodStart)
      return new Date(d.getFullYear(), d.getMonth(), 1)
    }
    if (targetYear && targetMonthProp) {
      return new Date(targetYear, targetMonthProp - 1, 1)
    }
    return addMonths(new Date(), 1)
  })
  const [dayData, setDayData] = useState<Record<string, DayData>>(() => {
    const init: Record<string, DayData> = {}
    for (const req of existingRequests) {
      init[req.date] = {
        availability: req.availability,
        desired_start: req.desired_start ?? '',
        desired_end: req.desired_end ?? '',
        note: req.note ?? '',
      }
    }
    return init
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const monthStart = startOfMonth(targetMonth)
  const monthEnd = endOfMonth(targetMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = getDay(monthStart)

  function toggleDay(dateStr: string) {
    setDayData(prev => {
      const current = prev[dateStr]?.availability ?? null
      const idx = CYCLE.indexOf(current)
      const next = CYCLE[(idx + 1) % CYCLE.length]
      if (next === null) {
        const { [dateStr]: _, ...rest } = prev
        return rest
      }
      return {
        ...prev,
        [dateStr]: {
          availability: next,
          desired_start: prev[dateStr]?.desired_start ?? '',
          desired_end: prev[dateStr]?.desired_end ?? '',
          note: prev[dateStr]?.note ?? '',
        },
      }
    })
  }

  function updateField(dateStr: string, field: keyof Omit<DayData, 'availability'>, value: string) {
    setDayData(prev => ({
      ...prev,
      [dateStr]: {
        ...prev[dateStr],
        availability: prev[dateStr]?.availability ?? 'available',
        desired_start: prev[dateStr]?.desired_start ?? '',
        desired_end: prev[dateStr]?.desired_end ?? '',
        note: prev[dateStr]?.note ?? '',
        [field]: value,
      },
    }))
  }

  async function handleSubmit() {
    const entries = Object.entries(dayData).filter(([, d]) => d.availability !== null)
    if (entries.length === 0) {
      toast.warning('日付を選択してください')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/shift-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: format(targetMonth, 'yyyy-MM'),
          requests: entries.map(([date, d]) => ({
            date,
            availability: d.availability,
            desired_start: d.desired_start || null,
            desired_end: d.desired_end || null,
            note: d.note || null,
          })),
        }),
      })
      if (!res.ok) throw new Error('送信に失敗しました')
      toast.success('シフト希望を提出しました')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const selected = selectedDate ? dayData[selectedDate] : null

  return (
    <div className="space-y-4">
      {/* 月選択 */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setTargetMonth(m => addMonths(m, -1))}>
          <ChevronLeft size={16} />
        </Button>
        <span className="font-bold text-lg">
          {format(targetMonth, 'yyyy年M月', { locale: ja })}のシフト希望
        </span>
        <Button variant="outline" size="sm" onClick={() => setTargetMonth(m => addMonths(m, 1))}>
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* 凡例 */}
      <div className="flex gap-2 flex-wrap text-xs">
        <span className="text-muted-foreground">タップで切替:</span>
        {Object.entries(AVAILABILITY_CONFIG).map(([key, { label, color }]) => (
          <span key={key} className={`px-2 py-0.5 rounded border ${color}`}>{label}</span>
        ))}
        <span className="px-2 py-0.5 rounded border text-muted-foreground">（空白）未設定</span>
      </div>

      {/* カレンダー */}
      <div>
        <div className="grid grid-cols-7 mb-1">
          {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
            <div
              key={d}
              className={cn(
                'text-center text-xs font-medium py-1',
                i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-muted-foreground'
              )}
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const data = dayData[dateStr]
            const avail = data?.availability
            const isSelected = selectedDate === dateStr
            const dow = getDay(day)
            const outOfRange = (periodStart && dateStr < periodStart) || (periodEnd && dateStr > periodEnd)

            return (
              <button
                key={dateStr}
                disabled={!!outOfRange}
                onClick={() => {
                  toggleDay(dateStr)
                  setSelectedDate(dateStr)
                }}
                className={cn(
                  'aspect-square flex flex-col items-center justify-center rounded-lg border-2 text-xs transition-all',
                  outOfRange
                    ? 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50'
                    : avail
                      ? AVAILABILITY_CONFIG[avail].color
                      : 'border-gray-200 hover:border-gray-300',
                  isSelected && !outOfRange && 'ring-2 ring-offset-1 ring-slate-700',
                  !outOfRange && dow === 0 && !avail && 'text-red-400',
                  !outOfRange && dow === 6 && !avail && 'text-blue-400',
                )}
              >
                <span className="font-bold">{format(day, 'd')}</span>
                {avail && (
                  <span className="text-[9px] leading-tight">
                    {avail === 'available' ? '○' : avail === 'preferred' ? '◎' : '×'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 選択日の詳細 */}
      {selectedDate && dayData[selectedDate]?.availability && (
        <div className="border rounded-lg p-4 space-y-3 bg-white">
          <div className="font-medium text-sm">
            {format(new Date(selectedDate), 'M月d日（E）', { locale: ja })} の詳細設定
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">希望開始時間</label>
              <Input
                type="time"
                value={selected?.desired_start ?? ''}
                onChange={e => updateField(selectedDate, 'desired_start', e.target.value)}
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">希望終了時間</label>
              <Input
                type="time"
                value={selected?.desired_end ?? ''}
                onChange={e => updateField(selectedDate, 'desired_end', e.target.value)}
                className="mt-1 h-8 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">メモ</label>
            <Textarea
              value={selected?.note ?? ''}
              onChange={e => updateField(selectedDate, 'note', e.target.value)}
              placeholder="「この日は16時以降なら可」など"
              rows={2}
              className="mt-1 text-sm"
            />
          </div>
        </div>
      )}

      {/* 集計と送信 */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-muted-foreground">
          選択: {Object.values(dayData).filter(d => d.availability).length}日
        </div>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? '送信中...' : 'シフト希望を提出'}
        </Button>
      </div>
    </div>
  )
}
