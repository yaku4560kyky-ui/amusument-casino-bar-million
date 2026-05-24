import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateWage } from '@/lib/calculations'

// 管理者による手動修正
export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/clock/[id]'>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (myProfile?.role !== 'admin') return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { id } = await ctx.params
  const body = await request.json()
  const { clock_in, clock_out, drink_back, nomination_count, note } = body

  // 給与再計算
  const { data: breaks } = await supabase
    .from('breaks')
    .select('break_start, break_end')
    .eq('time_record_id', id)

  const { data: record } = await supabase
    .from('time_records')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!record) return NextResponse.json({ error: '記録が見つかりません' }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('hourly_wage, night_wage_rate')
    .eq('id', record.user_id)
    .single()

  let wageFields = {}
  if (clock_out) {
    const wage = calculateWage(
      new Date(clock_in),
      new Date(clock_out),
      (breaks ?? []).filter(b => b.break_end),
      profile?.hourly_wage ?? 1100,
      profile?.night_wage_rate ?? 1.25
    )
    wageFields = {
      total_minutes: wage.workedMinutes,
      night_minutes: wage.nightMinutes,
      regular_wage: wage.regularWage,
      night_premium: wage.nightPremium,
      total_wage: wage.totalWage,
      status: 'finished',
    }
  }

  const { data: updated, error } = await supabase
    .from('time_records')
    .update({
      clock_in,
      clock_out,
      drink_back: drink_back ?? 0,
      nomination_count: nomination_count ?? 0,
      note,
      is_manually_edited: true,
      edited_by: user.id,
      edited_at: new Date().toISOString(),
      ...wageFields,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ record: updated })
}
