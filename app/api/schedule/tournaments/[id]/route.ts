import { NextRequest, NextResponse } from 'next/server'
import { jsonError, requireAdmin } from '@/lib/api/schedule'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TournamentStatus } from '@/types/schedule'

const STATUS_LABEL: Record<TournamentStatus, string> = {
  planning: '企画中',
  registration: '参加受付中',
  active: '開催中',
  completed: '終了',
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error } = await requireAdmin()
  if (error) return error

  const body = await request.json()
  const { data: existing, error: existingError } = await supabase
    .from('exceed_tournaments')
    .select('id, title, status')
    .eq('id', id)
    .single()
  if (existingError) return jsonError(existingError)

  const { data, error: queryError } = await supabase.from('exceed_tournaments').update(body).eq('id', id).select().single()
  if (queryError) return jsonError(queryError)

  if (body.status && body.status !== existing.status) {
    const { data: staffProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'staff')

    if (staffProfiles?.length) {
      const notifications = staffProfiles.map(profile => ({
        user_id: profile.id,
        type: 'tournament_update',
        title: `大会ステータス更新: ${existing.title}`,
        body: `ステータスが「${STATUS_LABEL[body.status as TournamentStatus]}」に変わりました`,
        link_url: '/schedule',
        ref_table: 'exceed_tournaments',
        ref_id: id,
      }))

      try {
        const notificationClient = createAdminClient()
        await notificationClient.from('notifications').insert(notifications)
      } catch {
        await supabase.from('notifications').insert(notifications)
      }
    }
  }

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
