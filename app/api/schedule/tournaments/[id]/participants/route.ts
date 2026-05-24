import { NextRequest, NextResponse } from 'next/server'
import { jsonError, requireAdmin, requireUser } from '@/lib/api/schedule'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error } = await requireUser()
  if (error) return error

  const { data, error: queryError } = await supabase.from('exceed_participants').select('*').eq('tournament_id', id).order('registered_at')
  if (queryError) return jsonError(queryError)
  return NextResponse.json({ participants: data ?? [] })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error } = await requireAdmin()
  if (error) return error

  const body = await request.json()
  if (!body.name) return NextResponse.json({ error: '名前は必須です' }, { status: 400 })

  const { data, error: queryError } = await supabase
    .from('exceed_participants')
    .insert({ tournament_id: id, name: body.name, seat_number: body.seat_number || null, status: body.status || 'registered', notes: body.notes || null })
    .select()
    .single()
  if (queryError) return jsonError(queryError)
  const { count } = await supabase
    .from('exceed_participants')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', id)
  await supabase.from('exceed_tournaments').update({ current_participants: count ?? 0 }).eq('id', id)
  return NextResponse.json({ participant: data }, { status: 201 })
}
