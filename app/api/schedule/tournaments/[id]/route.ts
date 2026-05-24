import { NextRequest, NextResponse } from 'next/server'
import { jsonError, requireAdmin } from '@/lib/api/schedule'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error } = await requireAdmin()
  if (error) return error

  const body = await request.json()
  const { data, error: queryError } = await supabase.from('exceed_tournaments').update(body).eq('id', id).select().single()
  if (queryError) return jsonError(queryError)
  return NextResponse.json({ tournament: data })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error } = await requireAdmin()
  if (error) return error

  const { error: queryError } = await supabase.from('exceed_tournaments').delete().eq('id', id)
  if (queryError) return jsonError(queryError)
  return NextResponse.json({ ok: true })
}
