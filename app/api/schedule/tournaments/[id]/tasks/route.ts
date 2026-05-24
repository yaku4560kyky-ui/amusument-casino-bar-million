import { NextRequest, NextResponse } from 'next/server'
import { jsonError, requireAdmin, requireUser } from '@/lib/api/schedule'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error } = await requireUser()
  if (error) return error

  const { data, error: queryError } = await supabase.from('exceed_tasks').select('*').eq('tournament_id', id).order('sort_order')
  if (queryError) return jsonError(queryError)
  return NextResponse.json({ tasks: data ?? [] })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error } = await requireAdmin()
  if (error) return error

  const body = await request.json()
  if (!body.title || !body.phase) return NextResponse.json({ error: 'タイトルとフェーズは必須です' }, { status: 400 })

  const { data, error: queryError } = await supabase
    .from('exceed_tasks')
    .insert({ tournament_id: id, title: body.title, phase: body.phase, assignee_id: body.assignee_id || null, notes: body.notes || null })
    .select()
    .single()
  if (queryError) return jsonError(queryError)
  return NextResponse.json({ task: data }, { status: 201 })
}
