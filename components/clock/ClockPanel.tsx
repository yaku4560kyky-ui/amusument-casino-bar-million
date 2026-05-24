'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import type { TimeRecord, Break } from '@/types'

type ClockStatus = 'not_started' | 'working' | 'on_break' | 'finished'

interface ClockPanelProps {
  initialRecord: TimeRecord | null
  initialBreaks: Break[]
}

const STATUS_CONFIG = {
  not_started: { label: '未出勤', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  working:     { label: '勤務中', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  on_break:    { label: '休憩中', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  finished:    { label: '退勤済み', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
}

export default function ClockPanel({ initialRecord, initialBreaks }: ClockPanelProps) {
  const [now, setNow] = useState<Date>(() => new Date())
  const [record, setRecord] = useState<TimeRecord | null>(initialRecord)
  const [breaks, setBreaks] = useState<Break[]>(initialBreaks)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const status: ClockStatus = (() => {
    if (!record) return 'not_started'
    if (record.clock_out) return 'finished'
    if (breaks.some(b => !b.break_end)) return 'on_break'
    return 'working'
  })()

  // 実働時間（分）
  const workedMinutes = (() => {
    if (!record) return 0
    const clockIn = new Date(record.clock_in)
    const end = record.clock_out ? new Date(record.clock_out) : now
    let total = Math.floor((end.getTime() - clockIn.getTime()) / 60000)
    for (const b of breaks) {
      const bStart = new Date(b.break_start)
      const bEnd = b.break_end ? new Date(b.break_end) : now
      total -= Math.floor((bEnd.getTime() - bStart.getTime()) / 60000)
    }
    return Math.max(0, total)
  })()

  async function clockIn() {
    setLoading(true)
    try {
      const res = await fetch('/api/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRecord(data.record)
      setNote('')
      toast.success('出勤しました')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  async function clockOut() {
    if (!record) return
    setLoading(true)
    try {
      const res = await fetch('/api/clock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_id: record.id, note }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRecord(data.record)
      setNote('')
      toast.success('退勤しました。お疲れ様でした！')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  async function breakStart() {
    if (!record) return
    setLoading(true)
    try {
      const res = await fetch('/api/breaks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time_record_id: record.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBreaks(prev => [...prev, data.break])
      toast.info('休憩入りしました')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  async function breakEnd() {
    const active = breaks.find(b => !b.break_end)
    if (!active) return
    setLoading(true)
    try {
      const res = await fetch('/api/breaks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ break_id: active.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBreaks(prev => prev.map(b => b.id === active.id ? data.break : b))
      toast.success('休憩から戻りました')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const sc = STATUS_CONFIG[status]
  const h = Math.floor(workedMinutes / 60)
  const m = workedMinutes % 60

  return (
    <div className="space-y-4 max-w-sm mx-auto">
      {/* 時計 */}
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="text-6xl font-bold tabular-nums tracking-tight">
            {format(now, 'HH:mm:ss')}
          </div>
          <div className="text-muted-foreground mt-2 text-sm">
            {format(now, 'yyyy年M月d日（E）', { locale: ja })}
          </div>
        </CardContent>
      </Card>

      {/* ステータス */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">現在の状態</div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${sc.color}`}>
                <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                {sc.label}
              </div>
            </div>
            {(status === 'working' || status === 'on_break') && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">実働時間</div>
                <div className="text-2xl font-bold tabular-nums">
                  {h}:{m.toString().padStart(2, '0')}
                </div>
              </div>
            )}
          </div>

          {record && (
            <div className="mt-3 pt-3 border-t text-sm text-muted-foreground space-y-0.5">
              <div>出勤: {format(new Date(record.clock_in), 'HH:mm')}</div>
              {record.clock_out && (
                <div>退勤: {format(new Date(record.clock_out), 'HH:mm')}</div>
              )}
              {breaks.filter(b => b.break_end).length > 0 && (
                <div>休憩: {breaks.filter(b => b.break_end).length}回</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* メモ */}
      {(status === 'not_started' || status === 'working') && (
        <div>
          <label className="text-xs text-muted-foreground">管理者へのメモ（任意）</label>
          <Textarea
            className="mt-1"
            placeholder="引き継ぎ事項・遅刻理由など"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
          />
        </div>
      )}

      {/* ボタン */}
      <div className="grid gap-3">
        {status === 'not_started' && (
          <Button
            size="lg"
            className="h-16 text-lg font-bold bg-green-600 hover:bg-green-700"
            onClick={clockIn}
            disabled={loading}
          >
            出勤
          </Button>
        )}

        {status === 'working' && (
          <>
            <Button
              size="lg"
              className="h-14 text-base bg-yellow-500 hover:bg-yellow-600 text-white"
              onClick={breakStart}
              disabled={loading}
            >
              休憩入り
            </Button>
            <Button
              size="lg"
              className="h-14 text-base bg-red-600 hover:bg-red-700"
              onClick={clockOut}
              disabled={loading}
            >
              退勤
            </Button>
          </>
        )}

        {status === 'on_break' && (
          <Button
            size="lg"
            className="h-16 text-lg font-bold bg-blue-600 hover:bg-blue-700"
            onClick={breakEnd}
            disabled={loading}
          >
            休憩戻り
          </Button>
        )}

        {status === 'finished' && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <div className="text-3xl mb-2">🏠</div>
            本日の勤務は完了です。<br />お疲れ様でした！
          </div>
        )}
      </div>

      {/* 深夜帯注意 */}
      {status === 'working' && now.getHours() >= 22 && (
        <Badge variant="secondary" className="w-full justify-center py-1">
          🌙 深夜手当（22:00〜翌5:00）が加算されています
        </Badge>
      )}
    </div>
  )
}
