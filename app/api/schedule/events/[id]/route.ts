import { NextRequest, NextResponse } from 'next/server'
import { jsonError, requireAdmin, requireUser } from '@/lib/api/schedule'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error } = await requireUser()
  if (error) return error

  const { data, error: queryError } = await supabase.from('operation_events').select('*').eq('id', id).single()
  if (queryError) return jsonError(queryError)
  return NextResponse.json({ event: data })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error } = await requireAdmin()
  if (error) return error

  const body = await request.json()
  const { data, error: queryError } = await supabase.from('operation_events').update(body).eq('id', id).select().single()
  if (queryError) return jsonError(queryError)
  return NextResponse.json({ event: data })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error } = await requireAdmin()
  if (error) return error

  const { error: queryError } = await supabase.from('operation_events').delete().eq('id', id)
  if (queryError) return jsonError(queryError)
  return NextResponse.json({ ok: true })
}
