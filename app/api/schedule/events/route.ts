import { NextRequest, NextResponse } from 'next/server'
import { jsonError, requireAdmin, requireUser } from '@/lib/api/schedule'

export async function GET(request: NextRequest) {
  const { supabase, error } = await requireUser()
  if (error) return error

  const from = request.nextUrl.searchParams.get('from')
  const to = request.nextUrl.searchParams.get('to')
  let query = supabase.from('operation_events').select('*').order('event_date').order('start_time')
  if (from) query = query.gte('event_date', from)
  if (to) query = query.lte('event_date', to)

  const { data, error: queryError } = await query
  if (queryError) return jsonError(queryError)
  return NextResponse.json({ events: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { supabase, user, error } = await requireAdmin()
  if (error || !user) return error

  const body = await request.json()
  if (!body.title || !body.event_date) {
    return NextResponse.json({ error: 'タイトルと日付は必須です' }, { status: 400 })
  }

  const { data, error: queryError } = await supabase
    .from('operation_events')
    .insert({
      title: body.title,
      description: body.description || null,
      event_date: body.event_date,
      start_time: body.start_time || null,
      end_time: body.end_time || null,
      event_type: body.event_type || 'regular',
      color_override: body.color_override || null,
      recurrence_type: body.recurrence_type || 'none',
      recurrence_days: body.recurrence_days || null,
      recurrence_day_of_month: body.recurrence_day_of_month || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (queryError) return jsonError(queryError)
  return NextResponse.json({ event: data }, { status: 201 })
}
