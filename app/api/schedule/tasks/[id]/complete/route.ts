import { format } from 'date-fns'
import { NextRequest, NextResponse } from 'next/server'
import { jsonError, requireUser } from '@/lib/api/schedule'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user, error } = await requireUser()
  if (error || !user) return error

  const body = await request.json().catch(() => ({}))
  const completionDate = body.completion_date || format(new Date(), 'yyyy-MM-dd')
  const { data, error: queryError } = await supabase
    .from('task_completions')
    .upsert({
      task_id: id,
      completion_date: completionDate,
      status: body.status || 'done',
      completed_by: user.id,
      notes: body.notes || null,
    }, { onConflict: 'task_id,completion_date' })
    .select()
    .single()
  if (queryError) return jsonError(queryError)
  return NextResponse.json({ completion: data })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error } = await requireUser()
  if (error) return error

  const completionDate = request.nextUrl.searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
  const { error: queryError } = await supabase
    .from('task_completions')
    .delete()
    .eq('task_id', id)
    .eq('completion_date', completionDate)
  if (queryError) return jsonError(queryError)
  return NextResponse.json({ ok: true })
}
