'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  trigger: React.ReactElement
}

export default function InviteDialog({ trigger }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('staff')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('招待メールを送信しました')
      setOpen(false)
      setEmail('')
      setName('')
      setRole('staff')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)} style={{ display: 'contents' }}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border border-amber-400/10 bg-[oklch(0.18_0.02_260)] text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-amber-100">新規スタッフ招待</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-200">メールアドレス *</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="staff@example.com"
                className="border-amber-400/20 bg-[oklch(0.12_0.02_260)] text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-200">氏名</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="山田 太郎"
                className="border-amber-400/20 bg-[oklch(0.12_0.02_260)] text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-200">権限</Label>
              <Select value={role} onValueChange={v => v && setRole(v)}>
                <SelectTrigger className="border-amber-400/20 bg-[oklch(0.12_0.02_260)] text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border border-border bg-[oklch(0.18_0.02_260)] text-slate-100">
                  <SelectItem value="staff">スタッフ</SelectItem>
                  <SelectItem value="admin">管理者</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="border-amber-400/20 bg-transparent text-slate-200 hover:bg-amber-400/10"
                onClick={() => setOpen(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={loading} className="bg-amber-400 text-slate-950 hover:bg-amber-300">
                {loading ? '送信中...' : '招待メールを送信'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
