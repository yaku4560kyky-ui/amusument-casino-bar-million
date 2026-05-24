import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 休憩入り
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { time_record_id } = await request.json()

  // 記録が自分のものか確認
  const { data: record } = await supabase
    .from('time_records')
    .select('id, status, user_id')
    .eq('id', time_record_id)
    .eq('user_id', user.id)
    .single()

  if (!record) return NextResponse.json({ error: '記録が見つかりません' }, { status: 404 })
  if (record.status !== 'working') return NextResponse.json({ error: '勤務中ではありません' }, { status: 400 })

  // 進行中の休憩がないか確認
  const { data: activeBreak } = await supabase
    .from('breaks')
    .select('id')
    .eq('time_record_id', time_record_id)
    .is('break_end', null)
    .maybeSingle()

  if (activeBreak) return NextResponse.json({ error: 'すでに休憩中です' }, { status: 400 })

  // 休憩記録を作成 & ステータス更新
  const [{ data: brk, error }, _] = await Promise.all([
    supabase
      .from('breaks')
      .insert({ time_record_id, break_start: new Date().toISOString() })
      .select()
      .single(),
    supabase
      .from('time_records')
      .update({ status: 'on_break' })
      .eq('id', time_record_id),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ break: brk })
}

// 休憩戻り
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { break_id } = await request.json()

  // 休憩記録が自分のものか確認
  const { data: brk } = await supabase
    .from('breaks')
    .select('*, time_records!inner(user_id, id)')
    .eq('id', break_id)
    .is('break_end', null)
    .single()

  if (!brk) return NextResponse.json({ error: '進行中の休憩が見つかりません' }, { status: 404 })

  const recordUserId = (brk as { time_records: { user_id: string; id: string } }).time_records?.user_id
  if (recordUserId !== user.id) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const timeRecordId = (brk as { time_records: { user_id: string; id: string } }).time_records?.id

  const [{ data: updated, error }, _] = await Promise.all([
    supabase
      .from('breaks')
      .update({ break_end: new Date().toISOString() })
      .eq('id', break_id)
      .select()
      .single(),
    supabase
      .from('time_records')
      .update({ status: 'working' })
      .eq('id', timeRecordId),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ break: updated })
}
