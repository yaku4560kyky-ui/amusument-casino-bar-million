import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (myProfile?.role !== 'admin') return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) return NextResponse.json({ error: 'from と to が必要です' }, { status: 400 })

  const { data: records, error } = await supabase
    .from('time_records')
    .select('*, profile:profiles(name, position, hourly_wage)')
    .gte('clock_in', `${from}T00:00:00`)
    .lte('clock_in', `${to}T23:59:59`)
    .order('clock_in', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // CSV生成
  const BOM = '﻿'
  const headers = [
    '名前',
    'ポジション',
    '日付',
    '出勤時間',
    '退勤時間',
    '実働時間（分）',
    '深夜時間（分）',
    '通常給与（円）',
    '深夜手当（円）',
    '合計給与（円）',
    'ドリンクバック（本）',
    '指名数',
    'メモ',
    '手動修正',
  ]

  const rows = (records ?? []).map(r => {
    const profile = r.profile as { name: string; position: string; hourly_wage: number } | null
    return [
      profile?.name ?? '',
      profile?.position ?? '',
      r.clock_in ? format(new Date(r.clock_in), 'yyyy/MM/dd（E）', { locale: ja }) : '',
      r.clock_in ? format(new Date(r.clock_in), 'HH:mm') : '',
      r.clock_out ? format(new Date(r.clock_out), 'HH:mm') : '未退勤',
      r.total_minutes ?? '',
      r.night_minutes ?? '',
      r.regular_wage ? Math.floor(r.regular_wage) : '',
      r.night_premium ? Math.floor(r.night_premium) : '',
      r.total_wage ? Math.floor(r.total_wage) : '',
      r.drink_back ?? 0,
      r.nomination_count ?? 0,
      r.note ?? '',
      r.is_manually_edited ? '修正済' : '',
    ]
  })

  const csv = BOM + [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=UTF-8',
      'Content-Disposition': `attachment; filename*=UTF-8''勤怠記録_${from}_${to}.csv`,
    },
  })
}
