import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin') return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const body = await request.json()
  const { name, name_kana, role, employment_type, position, hourly_wage, night_wage_rate, transportation_fee, phone } = body

  const { data, error } = await supabase
    .from('profiles')
    .update({
      name,
      name_kana: name_kana ?? null,
      role: role ?? 'staff',
      employment_type: employment_type ?? 'part_time',
      position: position ?? null,
      hourly_wage: Number(hourly_wage) || 1100,
      night_wage_rate: Number(night_wage_rate) || 1.25,
      transportation_fee: Number(transportation_fee) || 0,
      phone: phone ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
