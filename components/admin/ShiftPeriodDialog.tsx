'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, addMonths } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  trigger: React.ReactNode
}

export default function ShiftPeriodDialog({ trigger }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const nextMonth = addMonths(new Date(), 1)
  const defaultStart = format(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1), 'yyyy-MM-dd')
  const defaultEnd = format(new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0), 'yyyy-MM-dd')

  const [form, setForm] = useState({
    label: '',
    period_start: defaultStart,
    period_end: defaultEnd,
    deadline: '',
  })

  function formatDateJP(dateStr: string) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  }

  function autoLabel(start: string, end: string) {
    if (!start || !end) return ''
    return `${formatDateJP(start)}〜${formatDateJP(end)} シフト希望`
  }

  function handleDateChange(field: 'period_start' | 'period_end', value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      const isLabelAuto = !prev.label || prev.label === autoLabel(prev.period_start, prev.period_end)
      if (isLabelAuto) {
        next.label = autoLabel(next.period_start, next.period_end)
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.period_start || !form.period_end) {
      toast.error('開始日と終了日を入力してください')
      return
    }
    if (form.period_start > form.period_end) {
      toast.error('開始日は終了日より前にしてください')
      return
    }
    setLoading(true)
    try {
      const startDate = new Date(form.period_start)
      const res = await fetch('/api/admin/shift-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          label: form.label || autoLabel(form.period_start, form.period_end),
          target_year: startDate.getFullYear(),
          target_month: startDate.getMonth() + 1,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('シフト提出期間を作成しました')
      router.refresh()
      setOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    const label = autoLabel(form.period_start, form.period_end)
    setForm(prev => ({ ...prev, label: prev.label || label }))
    setOpen(true)
  }

  return (
    <>
      <span onClick={handleOpen} style={{ display: 'contents' }}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>シフト提出期間を作成</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>収集するシフトの期間</Label>
              <div className="grid grid-cols-2 gap-2 items-center">
                <Input
                  type="date"
                  value={form.period_start}
                  onChange={e => handleDateChange('period_start', e.target.value)}
                  required
                />
                <Input
                  type="date"
                  value={form.period_end}
                  onChange={e => handleDateChange('period_end', e.target.value)}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">例: 2026/05/11 〜 2026/05/25</p>
            </div>
            <div className="space-y-1">
              <Label>タイトル</Label>
              <Input
                value={form.label}
                onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                placeholder={autoLabel(form.period_start, form.period_end)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>提出期限（任意）</Label>
              <Input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '作成中...' : '作成する'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
