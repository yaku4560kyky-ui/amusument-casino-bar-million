'use client'

import { useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createSchedule } from '@/app/(dashboard)/schedule/actions'

export default function ScheduleForm() {
  const formRef = useRef<HTMLFormElement>(null)

  async function action(formData: FormData) {
    const res = await createSchedule(formData)
    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success('スケジュールを登録しました')
      formRef.current?.reset()
    }
  }

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">タイトル</Label>
        <Input id="title" name="title" placeholder="全体ミーティング" required />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="date">日付</Label>
        <Input id="date" name="date" type="date" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time">開始時間</Label>
          <Input id="start_time" name="start_time" type="time" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_time">終了時間</Label>
          <Input id="end_time" name="end_time" type="time" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="department_target">対象部門</Label>
        <Select name="department_target" defaultValue="all">
          <SelectTrigger>
            <SelectValue placeholder="対象を選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全員</SelectItem>
            <SelectItem value="manager">店長</SelectItem>
            <SelectItem value="accounting">経理部門</SelectItem>
            <SelectItem value="planning">企画部門</SelectItem>
            <SelectItem value="marketing">マーケティング部門</SelectItem>
            <SelectItem value="inventory">在庫管理部門</SelectItem>
            <SelectItem value="staff_management">スタッフ管理部門</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">詳細・アジェンダ</Label>
        <Textarea id="description" name="description" placeholder="ミーティングのアジェンダ等を記載" rows={4} />
      </div>

      <Button type="submit" className="w-full">
        追加する
      </Button>
    </form>
  )
}
