import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin' ? supabase : null
}

export async function GET() {
  const supabase = await assertAdmin()
  if (!supabase) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ staff: data })
}

export async function POST(request: NextRequest) {
  const supabase = await assertAdmin()
  if (!supabase) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const body = await request.json()
  const { email, name, name_kana, role, employment_type, position, hourly_wage, night_wage_rate, transportation_fee, phone } = body

  if (!email || !name) return NextResponse.json({ error: 'メールと名前は必須です' }, { status: 400 })

  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const tempPassword = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') + 'A1!'

  let adminClient
  try {
    adminClient = createAdminClient()
  } catch {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY が設定されていません。.env.local を確認してください。' }, { status: 500 })
  }

  const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name, role: role ?? 'staff' },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  const { error: profileError } = await adminClient
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
    .eq('id', newUser.user.id)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  return NextResponse.json({ ok: true, tempPassword, userId: newUser.user.id })
}
