import { NextResponse } from 'next/server'

import { createCalendarEvent } from '@/lib/google-calendar'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { type, id } = (await req.json()) as {
    type?: 'event' | 'tournament'
    id?: string
  }

  const { data: config } = await supabase
    .from('integration_configs')
    .select('access_token, refresh_token')
    .eq('user_id', user.id)
    .eq('provider', 'google_calendar')
    .single()

  if (!config?.access_token) {
    return NextResponse.json(
      { error: 'Google Calendarが連携されていません' },
      { status: 400 }
    )
  }

  const table = type === 'tournament' ? 'exceed_tournaments' : 'operation_events'
  const { data: record } = await supabase.from(table).select('*').eq('id', id).single()

  if (!record) {
    return NextResponse.json({ error: 'レコードが見つかりません' }, { status: 404 })
  }

  try {
    const eventDate = (record.event_date ?? record.tournament_date) as string
    const gcalEvent = await createCalendarEvent(
      {
        access_token: config.access_token,
        refresh_token: config.refresh_token ?? undefined,
      },
      {
        summary: record.title as string,
        description: ((record.description ?? record.notes) as string | null) ?? '',
        start: eventDate,
        end: eventDate,
      }
    )

    await supabase.from(table).update({ gcal_event_id: gcalEvent.id }).eq('id', id)
    return NextResponse.json({ success: true, gcal_event_id: gcalEvent.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Google Calendar同期エラー'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
