import { format } from 'date-fns'
import { CalendarDays, CheckSquare, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [tasksResult, eventsResult, tournamentResult] = await Promise.all([
    supabase.from('operation_tasks').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('operation_events')
      .select('id,title,event_date,start_time,event_type')
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(3),
    supabase
      .from('exceed_tournaments')
      .select('*')
      .neq('status', 'completed')
      .gte('tournament_date', today)
      .order('tournament_date', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">Million と EXCEED の本日の状況</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">今日のタスク数</CardTitle>
            <CheckSquare className="size-4 text-amber-300" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{tasksResult.count ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">直近のイベント</CardTitle>
            <CalendarDays className="size-4 text-amber-300" />
          </CardHeader>
          <CardContent className="space-y-3">
            {(eventsResult.data ?? []).map((event) => (
              <div key={event.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.event_date} {event.start_time ?? ''}</p>
                </div>
                <Badge variant="outline">{event.event_type}</Badge>
              </div>
            ))}
            {(eventsResult.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">予定はありません</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">EXCEED次回大会</CardTitle>
            <Trophy className="size-4 text-amber-300" />
          </CardHeader>
          <CardContent>
            {tournamentResult.data ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{tournamentResult.data.title}</p>
                  <p className="text-sm text-muted-foreground">{tournamentResult.data.tournament_date} {tournamentResult.data.start_time ?? ''}</p>
                </div>
                <Badge>{tournamentResult.data.current_participants} / {tournamentResult.data.max_participants} 名</Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">予定されている大会はありません</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
