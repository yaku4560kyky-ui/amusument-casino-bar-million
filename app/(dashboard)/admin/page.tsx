import Link from 'next/link'
import { Bell, CheckSquare, Trophy, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminPage() {
  const supabase = await createClient()

  const [
    { count: profilesCount },
    { count: tasksCount },
    { count: tournamentsCount },
    { count: notificationsCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('operation_tasks').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('exceed_tournaments')
      .select('*', { count: 'exact', head: true })
      .in('status', ['planning', 'registration', 'active']),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false),
  ])

  const stats = [
    { label: 'スタッフ数', value: profilesCount ?? 0, icon: Users, color: 'text-amber-300' },
    { label: 'アクティブタスク', value: tasksCount ?? 0, icon: CheckSquare, color: 'text-blue-300' },
    { label: '開催予定大会', value: tournamentsCount ?? 0, icon: Trophy, color: 'text-purple-300' },
    { label: '未読通知 (全体)', value: notificationsCount ?? 0, icon: Bell, color: 'text-red-300' },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <section className="rounded-xl border border-amber-400/15 bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,0.13),transparent_24rem),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(3,7,18,0.88))] p-6">
        <div className="text-sm font-medium text-amber-200/70">管理者専用</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-100">管理者ダッシュボード</h1>
        <p className="mt-2 text-muted-foreground">スタッフ・タスク・大会の統合管理</p>
      </section>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-amber-400/10 bg-card/95">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className={`size-4 ${color}`} />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-amber-100">
              {value}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/users">
          <Card className="border-amber-400/10 bg-card/95 hover:border-amber-400/30 hover:bg-muted/20 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-amber-100">
                <Users className="size-5 text-amber-300" />
                スタッフ管理
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              スタッフの登録・編集・権限設定を行います
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/shifts">
          <Card className="border-amber-400/10 bg-card/95 hover:border-amber-400/30 hover:bg-muted/20 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-amber-100">
                <CheckSquare className="size-5 text-blue-300" />
                シフト管理
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              シフトの作成・調整・承認を行います
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
