import { NextRequest, NextResponse } from 'next/server'
import { jsonError, requireAdmin, requireUser } from '@/lib/api/schedule'
import { EXCEED_TASK_TEMPLATES } from '@/types/schedule'

export async function GET(request: NextRequest) {
  const { supabase, error } = await requireUser()
  if (error) return error

  const limit = Number(request.nextUrl.searchParams.get('limit') ?? 20)
  const { data, error: queryError } = await supabase
    .from('exceed_tournaments')
    .select('*, tasks:exceed_tasks(*), participants:exceed_participants(*)')
    .order('tournament_date', { ascending: false })
    .limit(limit)
  if (queryError) return jsonError(queryError)
  return NextResponse.json({ tournaments: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { supabase, user, error } = await requireAdmin()
  if (error || !user) return error

  const body = await request.json()
  if (!body.title || !body.tournament_date) {
    return NextResponse.json({ error: 'タイトルと開催日は必須です' }, { status: 400 })
  }

  const { data: tournament, error: insertError } = await supabase
    .from('exceed_tournaments')
    .insert({
      title: body.title,
      tournament_date: body.tournament_date,
      start_time: body.start_time || null,
      venue_notes: body.venue_notes || null,
      max_participants: Number(body.max_participants ?? 20),
      notes: body.notes || null,
      status: body.status || 'planning',
      created_by: user.id,
    })
    .select()
    .single()
  if (insertError) return jsonError(insertError)

  const tasks = Object.entries(EXCEED_TASK_TEMPLATES).flatMap(([phase, titles]) =>
    titles.map((title, index) => ({
      tournament_id: tournament.id,
      phase,
      title,
      sort_order: index * 10,
    }))
  )
  const { error: tasksError } = await supabase.from('exceed_tasks').insert(tasks)
  if (tasksError) return jsonError(tasksError)

  const { data, error: fetchError } = await supabase
    .from('exceed_tournaments')
    .select('*, tasks:exceed_tasks(*), participants:exceed_participants(*)')
    .eq('id', tournament.id)
    .single()
  if (fetchError) return jsonError(fetchError)
  return NextResponse.json({ tournament: data }, { status: 201 })
}
