import { NextResponse } from 'next/server'

import { jsonError, requireUser } from '@/lib/api/schedule'

export async function POST() {
  const { supabase, user, error } = await requireUser()
  if (error || !user) return error

  const { error: updateError } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (updateError) return jsonError(updateError)
  return NextResponse.json({ ok: true })
}
