import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminAutoRefresh from '@/components/admin/AdminAutoRefresh'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { formatMinutes, formatWage } from '@/lib/calculations'
import type { Profile, TimeRecord, Break } from '@/types'

type StaffWithRecord = {
  profile: Profile
  record: TimeRecord | null
  breaks: Break[]
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  not_started: { label: '未出勤', variant: 'secondary' },
  working:     { label: '勤務中', variant: 'default' },
  on_break:    { label: '休憩中', variant: 'outline' },
  finished:    { label: '退勤済み', variant: 'secondary' },
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (myProfile?.role !== 'admin') redirect('/clock')

  const today = new Date().toISOString().split('T')[0]

  // 全スタッフのプロフィール取得
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('name', { ascending: true })

  // 今日の勤怠記録を全員分取得
  const { data: todayRecords } = await supabase
    .from('time_records')
    .select('*')
    .gte('clock_in', `${today}T00:00:00`)

  // 今日の休憩記録を全員分取得
  const recordIds = todayRecords?.map(r => r.id) ?? []
  let allBreaks: Break[] = []
  if (recordIds.length > 0) {
    const { data: breaks } = await supabase
      .from('breaks')
      .select('*')
      .in('time_record_id', recordIds)
    allBreaks = (breaks ?? []) as Break[]
  }

  const staffList: StaffWithRecord[] = (profiles ?? []).map(profile => {
    const record = (todayRecords ?? []).find(r => r.user_id === profile.id) ?? null
    const breaks = allBreaks.filter(b => b.time_record_id === record?.id)
    return { profile: profile as Profile, record: record as TimeRecord | null, breaks }
  })

  // 今日の集計
  const workingCount = staffList.filter(s => s.record && !s.record.clock_out).length
  const finishedCount = staffList.filter(s => s.record?.status === 'finished').length
  const notStartedCount = staffList.filter(s => !s.record).length

  return (
    <div>
      <AdminAutoRefresh intervalMs={30000} />
      <h1 className="text-xl font-bold mb-6">
        管理者ダッシュボード
        <span className="text-sm font-normal text-muted-foreground ml-2">
          {format(new Date(), 'M月d日（E）', { locale: ja })}
        </span>
      </h1>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-green-600">{workingCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">勤務中</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-gray-600">{notStartedCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">未出勤</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{finishedCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">退勤済み</div>
          </CardContent>
        </Card>
      </div>

      {/* スタッフ一覧 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">本日の出勤状況</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {staffList.map(({ profile, record, breaks }) => {
              const hasActiveBreak = breaks.some(b => !b.break_end)
              const status = !record ? 'not_started'
                : record.clock_out ? 'finished'
                : hasActiveBreak ? 'on_break'
                : 'working'

              const workedMinutes = (() => {
                if (!record) return 0
                const clockIn = new Date(record.clock_in)
                const end = record.clock_out ? new Date(record.clock_out) : new Date()
                let total = Math.floor((end.getTime() - clockIn.getTime()) / 60000)
                for (const b of breaks) {
                  if (!b.break_end) continue
                  total -= Math.floor((new Date(b.break_end).getTime() - new Date(b.break_start).getTime()) / 60000)
                }
                return Math.max(0, total)
              })()

              const sb = STATUS_BADGE[status]

              return (
                <div key={profile.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium text-sm">{profile.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {profile.position ?? 'スタッフ'}
                        {record && ` • 出勤 ${format(new Date(record.clock_in), 'HH:mm')}`}
                        {record?.clock_out && ` 〜 ${format(new Date(record.clock_out), 'HH:mm')}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {status !== 'not_started' && (
                      <div className="text-right text-sm">
                        <div className="text-xs text-muted-foreground">
                          {formatMinutes(workedMinutes)}
                        </div>
                        {record?.total_wage && (
                          <div className="text-xs text-muted-foreground">
                            {formatWage(record.total_wage)}
                          </div>
                        )}
                      </div>
                    )}
                    <Badge variant={sb.variant} className="text-xs">
                      {sb.label}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
