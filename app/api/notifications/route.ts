import { NextRequest, NextResponse } from 'next/server'

import { jsonError, requireUser } from '@/lib/api/schedule'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export async function GET(request: NextRequest) {
  const { supabase, user, error } = await requireUser()
  if (error || !user) return error

  const url = new URL(request.url)
  const page = Math.max(Number(url.searchParams.get('page') ?? '1'), 1)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT), 1), MAX_LIMIT)
  const from = (page - 1) * limit
  const to = from + limit - 1

  const [{ data: notifications, error: listError }, { count, error: countError }] = await Promise.all([
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
  ])

  if (listError) return jsonError(listError)
  if (countError) return jsonError(countError)

  return NextResponse.json({
    notifications: notifications ?? [],
    unreadCount: count ?? 0,
  })
}

export async function POST(request: NextRequest) {
  const { supabase, user, error } = await requireUser()
  if (error || !user) return error

  const body = await request.json()
  const userId = body.user_id ?? user.id

  const { data, error: insertError } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type: body.type ?? 'system',
      title: body.title,
      body: body.body ?? null,
      link_url: body.link_url ?? null,
      ref_table: body.ref_table ?? null,
      ref_id: body.ref_id ?? null,
    })
    .select()
    .single()

  if (insertError) return jsonError(insertError)
  return NextResponse.json({ notification: data }, { status: 201 })
}
