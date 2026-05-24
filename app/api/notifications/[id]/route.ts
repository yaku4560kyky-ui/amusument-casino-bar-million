import { NextRequest, NextResponse } from 'next/server'

import { jsonError, requireUser } from '@/lib/api/schedule'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user, error } = await requireUser()
  if (error || !user) return error

  const body = await request.json()
  const { data, error: updateError } = await supabase
    .from('notifications')
    .update({ is_read: Boolean(body.is_read) })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (updateError) return jsonError(updateError)
  return NextResponse.json({ notification: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user, error } = await requireUser()
  if (error || !user) return error

  const { error: deleteError } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (deleteError) return jsonError(deleteError)
  return NextResponse.json({ ok: true })
}
