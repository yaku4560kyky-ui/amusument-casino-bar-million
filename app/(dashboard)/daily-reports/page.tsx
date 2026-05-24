import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function DailyReportsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザーのプロフィールを取得して権限に応じた表示を切り替える予定
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">日報作成・閲覧</h1>
          <p className="text-muted-foreground mt-1">
            各部門の業務内容の報告と、店長・他部門との情報共有を行います。
          </p>
        </div>
        <Button>本日の日報を作成</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>最近の日報</CardTitle>
              <CardDescription>各部門から提出された日報一覧</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10 text-muted-foreground border rounded-lg border-dashed">
                日報データはまだありません
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>部門別フォーマット</CardTitle>
              <CardDescription>作成時に適用される入力項目</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="font-bold">店長部門:</span>
                <p className="text-muted-foreground">売上報告、顧客フィードバック、トラブル報告、全体所感</p>
              </div>
              <div>
                <span className="font-bold">経理部門:</span>
                <p className="text-muted-foreground">日次売上集計、経費精算額、特記事項</p>
              </div>
              <div>
                <span className="font-bold">企画・スケジュール:</span>
                <p className="text-muted-foreground">イベント進捗、次回スケジュール調整状況</p>
              </div>
              <div>
                <span className="font-bold">マーケティング:</span>
                <p className="text-muted-foreground">SNSインプレッション、広告反響、顧客データサマリー</p>
              </div>
              <div>
                <span className="font-bold">在庫・備品管理:</span>
                <p className="text-muted-foreground">発注リスト、欠品報告、棚卸し進捗</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
