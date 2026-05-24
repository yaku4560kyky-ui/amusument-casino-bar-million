import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type { NotificationPrefs } from '@/types'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const body = (await req.json()) as Partial<NotificationPrefs>
  const prefs = {
    in_app: Boolean(body.in_app),
    push: Boolean(body.push),
    email: Boolean(body.email),
    task_assigned: body.task_assigned ?? true,
    event_reminder: body.event_reminder ?? true,
    tournament_update: body.tournament_update ?? true,
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ notification_prefs: prefs })
    .eq('id', user.id)
    .select('notification_prefs')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ notification_prefs: data.notification_prefs })
}
