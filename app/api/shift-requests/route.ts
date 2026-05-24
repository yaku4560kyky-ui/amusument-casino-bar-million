import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { month, requests } = await request.json()

  // 対象月の既存希望を全削除してから再登録（upsert）
  const [year, mon] = month.split('-')
  const from = `${year}-${mon}-01`
  const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate()
  const to = `${year}-${mon}-${lastDay.toString().padStart(2, '0')}`

  await supabase
    .from('shift_requests')
    .delete()
    .eq('user_id', user.id)
    .gte('date', from)
    .lte('date', to)

  if (requests.length > 0) {
    const { error } = await supabase
      .from('shift_requests')
      .insert(
        requests.map((r: { date: string; availability: string; desired_start: string | null; desired_end: string | null; note: string | null }) => ({
          user_id: user.id,
          date: r.date,
          availability: r.availability,
          desired_start: r.desired_start,
          desired_end: r.desired_end,
          note: r.note,
          status: 'pending',
        }))
      )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')

  let query = supabase
    .from('shift_requests')
    .select('*, profile:profiles(name)')
    .order('date', { ascending: true })

  if (profile?.role !== 'admin') {
    query = query.eq('user_id', user.id)
  }

  if (month) {
    const [year, mon] = month.split('-')
    query = query
      .gte('date', `${year}-${mon}-01`)
      .lte('date', `${year}-${mon}-31`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ requests: data })
}
