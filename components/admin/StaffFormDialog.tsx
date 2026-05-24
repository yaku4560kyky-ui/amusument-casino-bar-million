'use client'

import { useState } from 'react'
import React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Profile } from '@/types'

interface Props {
  existing?: Profile
  trigger: React.ReactElement
}

const EMPTY: Omit<Profile, 'id' | 'created_at' | 'updated_at'> & { email: string } = {
  email: '',
  name: '',
  name_kana: null,
  role: 'staff',
  employment_type: 'part_time',
  position: null,
  hourly_wage: 1100,
  night_wage_rate: 1.25,
  transportation_fee: 0,
  phone: null,
  avatar_url: null,
  notification_prefs: {
    in_app: true,
    push: false,
    email: false,
    task_assigned: true,
    event_reminder: true,
    tournament_update: true,
  },
}

export default function StaffFormDialog({ existing, trigger }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [form, setForm] = useState(() =>
    existing ? { ...existing, email: '' } : { ...EMPTY }
  )

  function set(key: string, value: string | number | null) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      if (existing) {
        const res = await fetch(`/api/admin/staff/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        toast.success('スタッフ情報を更新しました')
        router.refresh()
        setOpen(false)
      } else {
        const res = await fetch('/api/admin/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setTempPassword(data.tempPassword)
        toast.success('スタッフを登録しました')
        router.refresh()
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)} style={{ display: 'contents' }}>{trigger}</span>
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setTempPassword(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{existing ? 'スタッフ情報編集' : '新規スタッフ登録'}</DialogTitle>
          </DialogHeader>

          {tempPassword ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="font-medium text-green-800 mb-2">登録完了</div>
                <div className="text-sm text-green-700 mb-3">以下の仮パスワードをスタッフに伝えてください。</div>
                <div className="bg-white border rounded p-3 font-mono text-lg text-center tracking-widest">{tempPassword}</div>
              </div>
              <Button className="w-full" onClick={() => { setOpen(false); setTempPassword(null); setForm({ ...EMPTY }) }}>
                閉じる
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!existing && (
                <div className="space-y-1">
                  <Label>メールアドレス *</Label>
                  <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="staff@example.com" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>氏名 *</Label>
                  <Input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="山田 太郎" />
                </div>
                <div className="space-y-1">
                  <Label>フリガナ</Label>
                  <Input value={form.name_kana ?? ''} onChange={e => set('name_kana', e.target.value)} placeholder="ヤマダ タロウ" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>権限</Label>
                  <Select value={form.role ?? 'staff'} onValueChange={v => set('role', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">スタッフ</SelectItem>
                      <SelectItem value="admin">管理者</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>雇用形態</Label>
                  <Select value={form.employment_type ?? 'part_time'} onValueChange={v => set('employment_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="part_time">アルバイト</SelectItem>
                      <SelectItem value="full_time">正社員</SelectItem>
                      <SelectItem value="contract">契約社員</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>役職・担当</Label>
                <Input value={form.position ?? ''} onChange={e => set('position', e.target.value)} placeholder="ディーラー" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>時給（円）</Label>
                  <Input type="number" value={form.hourly_wage} onChange={e => set('hourly_wage', Number(e.target.value))} min={0} />
                </div>
                <div className="space-y-1">
                  <Label>深夜割増率</Label>
                  <Input type="number" value={form.night_wage_rate} onChange={e => set('night_wage_rate', Number(e.target.value))} step="0.01" min={1} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>非課税交通費（円/月）</Label>
                  <Input type="number" value={form.transportation_fee} onChange={e => set('transportation_fee', Number(e.target.value))} min={0} />
                </div>
                <div className="space-y-1">
                  <Label>電話番号</Label>
                  <Input value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="090-0000-0000" />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '処理中...' : existing ? '更新する' : '登録する'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
