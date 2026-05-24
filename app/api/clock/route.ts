import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateWage } from '@/lib/calculations'

// 出勤
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { note } = await request.json()
  const today = new Date().toISOString().split('T')[0]

  // 今日すでに出勤記録があるか確認
  const { data: existing } = await supabase
    .from('time_records')
    .select('id, status')
    .eq('user_id', user.id)
    .gte('clock_in', `${today}T00:00:00`)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: '本日はすでに出勤済みです' }, { status: 400 })
  }

  const { data: record, error } = await supabase
    .from('time_records')
    .insert({
      user_id: user.id,
      clock_in: new Date().toISOString(),
      status: 'working',
      note: note || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ record })
}

// 退勤
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { record_id, note } = await request.json()

  const { data: record } = await supabase
    .from('time_records')
    .select('*')
    .eq('id', record_id)
    .eq('user_id', user.id)
    .single()

  if (!record) return NextResponse.json({ error: '記録が見つかりません' }, { status: 404 })
  if (record.clock_out) return NextResponse.json({ error: 'すでに退勤済みです' }, { status: 400 })

  // 進行中の休憩があれば終了させる
  await supabase
    .from('breaks')
    .update({ break_end: new Date().toISOString() })
    .eq('time_record_id', record_id)
    .is('break_end', null)

  // 休憩記録を取得して給与計算
  const { data: breaks } = await supabase
    .from('breaks')
    .select('break_start, break_end')
    .eq('time_record_id', record_id)

  const { data: profile } = await supabase
    .from('profiles')
    .select('hourly_wage, night_wage_rate')
    .eq('id', user.id)
    .single()

  const clockOut = new Date()
  const wage = calculateWage(
    new Date(record.clock_in),
    clockOut,
    breaks ?? [],
    profile?.hourly_wage ?? 1100,
    profile?.night_wage_rate ?? 1.25
  )

  const { data: updated, error } = await supabase
    .from('time_records')
    .update({
      clock_out: clockOut.toISOString(),
      status: 'finished',
      note: note || record.note,
      total_minutes: wage.workedMinutes,
      night_minutes: wage.nightMinutes,
      regular_wage: wage.regularWage,
      night_premium: wage.nightPremium,
      total_wage: wage.totalWage,
    })
    .eq('id', record_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ record: updated })
}
