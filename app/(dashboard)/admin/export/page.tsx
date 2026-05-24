'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { toast } from 'sonner'

export default function ExportPage() {
  const now = new Date()
  const [from, setFrom] = useState(format(startOfMonth(now), 'yyyy-MM-dd'))
  const [to, setTo] = useState(format(endOfMonth(now), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const res = await fetch(`/api/export?from=${from}&to=${to}`)
      if (!res.ok) throw new Error('エクスポートに失敗しました')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `勤怠記録_${from}_${to}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSVファイルをダウンロードしました')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">CSV出力</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">期間を指定してダウンロード</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>開始日</Label>
              <Input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>終了日</Label>
              <Input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-sm text-muted-foreground">
            <div className="font-medium text-foreground mb-1">出力内容</div>
            <ul className="space-y-0.5 text-xs">
              <li>• スタッフ名・日付・出勤時間・退勤時間</li>
              <li>• 実働時間（時間・分）</li>
              <li>• 深夜時間・深夜手当</li>
              <li>• 概算給与合計</li>
              <li>• ドリンクバック数・指名数</li>
              <li>• メモ・修正フラグ</li>
            </ul>
          </div>

          <Button className="w-full" onClick={handleExport} disabled={loading}>
            <Download size={16} className="mr-2" />
            {loading ? 'ダウンロード中...' : 'CSVダウンロード'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
