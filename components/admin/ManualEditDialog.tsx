'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Pencil } from 'lucide-react'
import type { TimeRecord } from '@/types'

interface ManualEditDialogProps {
  record: TimeRecord
}

export default function ManualEditDialog({ record }: ManualEditDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [clockIn, setClockIn] = useState(
    format(new Date(record.clock_in), "yyyy-MM-dd'T'HH:mm")
  )
  const [clockOut, setClockOut] = useState(
    record.clock_out ? format(new Date(record.clock_out), "yyyy-MM-dd'T'HH:mm") : ''
  )
  const [drinkBack, setDrinkBack] = useState(record.drink_back.toString())
  const [nomination, setNomination] = useState(record.nomination_count.toString())
  const [note, setNote] = useState(record.note ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    try {
      const res = await fetch(`/api/clock/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clock_in: new Date(clockIn).toISOString(),
          clock_out: clockOut ? new Date(clockOut).toISOString() : null,
          drink_back: parseInt(drinkBack) || 0,
          nomination_count: parseInt(nomination) || 0,
          note: note || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('勤怠記録を修正しました')
      setOpen(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button className="inline-flex items-center justify-center size-7 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" />}>
        <Pencil size={14} />
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>勤怠記録の修正</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">出勤時間</Label>
              <Input
                type="datetime-local"
                value={clockIn}
                onChange={e => setClockIn(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">退勤時間</Label>
              <Input
                type="datetime-local"
                value={clockOut}
                onChange={e => setClockOut(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">ドリンクバック（本）</Label>
              <Input
                type="number"
                min="0"
                value={drinkBack}
                onChange={e => setDrinkBack(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">指名数</Label>
              <Input
                type="number"
                min="0"
                value={nomination}
                onChange={e => setNomination(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">メモ</Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="mt-1 text-sm"
              placeholder="修正理由など"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button size="sm" onClick={handleSave} disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
