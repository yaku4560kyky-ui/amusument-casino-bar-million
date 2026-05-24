'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('パスワードが一致しません')
      return
    }
    if (password.length < 8) {
      toast.error('パスワードは8文字以上にしてください')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error('パスワードの更新に失敗しました: ' + error.message)
      setLoading(false)
      return
    }
    toast.success('パスワードを更新しました')
    router.push('/clock')
  }

  return (
    <Card className="w-full max-w-sm shadow-2xl">
      <CardHeader className="text-center pb-2">
        <div className="text-4xl mb-2">🔑</div>
        <CardTitle className="text-2xl">パスワード再設定</CardTitle>
        <CardDescription>新しいパスワードを入力してください</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="password">新しいパスワード</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="8文字以上"
              required
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm">パスワード確認</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="もう一度入力"
              required
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '更新中...' : 'パスワードを更新する'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
