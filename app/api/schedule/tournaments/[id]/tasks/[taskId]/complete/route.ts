import { NextResponse } from 'next/server'
import { jsonError, requireUser } from '@/lib/api/schedule'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id, taskId } = await params
  const { supabase, user, error } = await requireUser()
  if (error || !user) return error

  const { data, error: queryError } = await supabase
    .from('exceed_tasks')
    .update({ is_done: true, done_by: user.id, done_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('tournament_id', id)
    .select()
    .single()
  if (queryError) return jsonError(queryError)
  return NextResponse.json({ task: data })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id, taskId } = await params
  const { supabase, error } = await requireUser()
  if (error) return error

  const { data, error: queryError } = await supabase
    .from('exceed_tasks')
    .update({ is_done: false, done_by: null, done_at: null })
    .eq('id', taskId)
    .eq('tournament_id', id)
    .select()
    .single()
  if (queryError) return jsonError(queryError)
  return NextResponse.json({ task: data })
}
