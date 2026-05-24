import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import ShiftPeriodDialog from '@/components/admin/ShiftPeriodDialog'
import ShiftRequestsGrid from '@/components/admin/ShiftRequestsGrid'
import CopyButton from '@/components/admin/CopyButton'
import type { Profile, ShiftPeriod, ShiftRequest } from '@/types'

export default async function AdminShiftsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: periodId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin') redirect('/clock')

  const { data: periods } = await supabase
    .from('shift_periods')
    .select('*')
    .order('created_at', { ascending: false })

  const allPeriods = (periods ?? []) as ShiftPeriod[]
  const selectedPeriod = allPeriods.find(p => p.id === periodId) ?? allPeriods[0] ?? null

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'staff')
    .order('name', { ascending: true })
  const staff = (profiles ?? []) as Profile[]

  let requests: ShiftRequest[] = []
  if (selectedPeriod) {
    let from: string
    let to: string
    if (selectedPeriod.period_start && selectedPeriod.period_end) {
      from = selectedPeriod.period_start
      to = selectedPeriod.period_end
    } else {
      const { target_year: y, target_month: m } = selectedPeriod
      from = `${y}-${String(m).padStart(2, '0')}-01`
      const lastDay = new Date(y, m, 0).getDate()
      to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    }

    const { data: reqs } = await supabase
      .from('shift_requests')
      .select('*, profile:profiles(name)')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
    requests = (reqs ?? []) as ShiftRequest[]
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">シフト希望管理</h1>
        <ShiftPeriodDialog trigger={<Button size="sm">+ 期間を作成</Button>} />
      </div>

      {/* 期間一覧 */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">提出期間一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {allPeriods.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">まだ提出期間が作成されていません</p>
          ) : (
            <div className="space-y-2">
              {allPeriods.map(period => (
                <div key={period.id} className="flex items-center justify-between py-2 border-b last:border-0 gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge variant={period.is_open ? 'default' : 'secondary'}>
                      {period.is_open ? '受付中' : '締切'}
                    </Badge>
                    <a href={`/admin/shifts?period=${period.id}`} className="font-medium text-sm hover:underline">
                      {period.label}
                    </a>
                    {period.deadline && (
                      <span className="text-xs text-muted-foreground">期限: {period.deadline}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <CopyButton text={`${appUrl}/shift`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* シフト希望グリッド */}
      {selectedPeriod ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{selectedPeriod.label} — 希望一覧</CardTitle>
              <div className="text-xs text-muted-foreground bg-slate-100 px-2 py-1 rounded font-mono truncate max-w-[300px]">
                スタッフ共有URL: {appUrl}/shift
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ShiftRequestsGrid
              period={selectedPeriod}
              staff={staff}
              requests={requests}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-sm">上の「+ 期間を作成」からシフト提出期間を作成してください</p>
        </div>
      )}
    </div>
  )
}
