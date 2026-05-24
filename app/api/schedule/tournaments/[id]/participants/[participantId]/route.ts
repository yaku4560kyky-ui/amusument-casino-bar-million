import { NextRequest, NextResponse } from 'next/server'
import { jsonError, requireAdmin } from '@/lib/api/schedule'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; participantId: string }> }) {
  const { id, participantId } = await params
  const { supabase, error } = await requireAdmin()
  if (error) return error

  const body = await request.json()
  const { data, error: queryError } = await supabase
    .from('exceed_participants')
    .update(body)
    .eq('id', participantId)
    .eq('tournament_id', id)
    .select()
    .single()
  if (queryError) return jsonError(queryError)
  return NextResponse.json({ participant: data })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; participantId: string }> }) {
  const { id, participantId } = await params
  const { supabase, error } = await requireAdmin()
  if (error) return error

  const { error: queryError } = await supabase.from('exceed_participants').delete().eq('id', participantId).eq('tournament_id', id)
  if (queryError) return jsonError(queryError)
  const { count } = await supabase
    .from('exceed_participants')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', id)
  await supabase.from('exceed_tournaments').update({ current_participants: count ?? 0 }).eq('id', id)
  return NextResponse.json({ ok: true })
}
