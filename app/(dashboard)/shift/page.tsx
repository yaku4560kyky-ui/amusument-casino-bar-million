import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import ShiftCalendar from '@/components/shift/ShiftCalendar'
import type { ShiftPeriod, ShiftRequest } from '@/types'

export default async function ShiftPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 受付中のシフト期間を取得
  const { data: periods } = await supabase
    .from('shift_periods')
    .select('*')
    .eq('is_open', true)
    .order('created_at', { ascending: false })

  const openPeriods = (periods ?? []) as ShiftPeriod[]
  const activePeriod = openPeriods[0] ?? null

  let existingRequests: ShiftRequest[] = []

  if (activePeriod) {
    let from: string
    let to: string
    if (activePeriod.period_start && activePeriod.period_end) {
      from = activePeriod.period_start
      to = activePeriod.period_end
    } else {
      const { target_year: y, target_month: m } = activePeriod
      from = `${y}-${String(m).padStart(2, '0')}-01`
      const lastDay = new Date(y, m, 0).getDate()
      to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    }

    const { data } = await supabase
      .from('shift_requests')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })

    existingRequests = (data ?? []) as ShiftRequest[]
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">シフト希望提出</h1>

      {activePeriod ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{activePeriod.label}</CardTitle>
              <Badge variant="default" className="text-xs">受付中</Badge>
            </div>
            {activePeriod.deadline && (
              <p className="text-xs text-muted-foreground mt-1">提出期限: {activePeriod.deadline}</p>
            )}
          </CardHeader>
          <CardContent>
            <ShiftCalendar
              existingRequests={existingRequests}
              targetYear={activePeriod.target_year}
              targetMonth={activePeriod.target_month}
              periodStart={activePeriod.period_start ?? undefined}
              periodEnd={activePeriod.period_end ?? undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-sm">現在受付中のシフト提出期間はありません</p>
          <p className="text-xs mt-1">管理者が提出期間を設定するまでお待ちください</p>
        </div>
      )}
    </div>
  )
}
