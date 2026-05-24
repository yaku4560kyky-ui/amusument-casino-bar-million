import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatMinutes, formatWage } from '@/lib/calculations'
import type { TimeRecord } from '@/types'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('hourly_wage')
    .eq('id', user.id)
    .single()

  // 過去30日分の勤怠記録を取得
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: records } = await supabase
    .from('time_records')
    .select('*')
    .eq('user_id', user.id)
    .gte('clock_in', thirtyDaysAgo.toISOString())
    .order('clock_in', { ascending: false })

  const typedRecords = (records ?? []) as TimeRecord[]

  // 今月の集計
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthRecords = typedRecords.filter(r =>
    new Date(r.clock_in) >= monthStart && r.status === 'finished'
  )
  const totalMinutes = monthRecords.reduce((s, r) => s + (r.total_minutes ?? 0), 0)
  const totalWage = monthRecords.reduce((s, r) => s + (r.total_wage ?? 0), 0)
  const nightPremium = monthRecords.reduce((s, r) => s + (r.night_premium ?? 0), 0)

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">勤怠履歴</h1>

      {/* 今月サマリー */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">今月の実働時間</div>
            <div className="text-xl font-bold mt-1">{formatMinutes(totalMinutes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">概算給与</div>
            <div className="text-xl font-bold mt-1">{formatWage(totalWage)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">深夜手当</div>
            <div className="text-xl font-bold mt-1">{formatWage(nightPremium)}</div>
          </CardContent>
        </Card>
      </div>

      {/* 勤怠一覧 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">過去30日の記録</CardTitle>
        </CardHeader>
        <CardContent>
          {typedRecords.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">記録がありません</p>
          ) : (
            <div className="space-y-2">
              {typedRecords.map(record => (
                <div key={record.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <div className="font-medium text-sm">
                      {format(new Date(record.clock_in), 'M月d日（E）', { locale: ja })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(record.clock_in), 'HH:mm')}
                      {record.clock_out && ` 〜 ${format(new Date(record.clock_out), 'HH:mm')}`}
                      {record.is_manually_edited && (
                        <span className="ml-1 text-orange-500">（修正済）</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {record.status === 'finished' ? (
                      <>
                        <div className="text-sm font-medium">
                          {formatMinutes(record.total_minutes ?? 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatWage(record.total_wage ?? 0)}
                          {(record.night_minutes ?? 0) > 0 && (
                            <span className="ml-1 text-blue-600">
                              🌙{formatMinutes(record.night_minutes ?? 0)}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <Badge variant={record.status === 'working' ? 'default' : 'secondary'}>
                        {record.status === 'working' ? '勤務中' : '休憩中'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
