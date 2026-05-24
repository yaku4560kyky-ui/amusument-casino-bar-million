import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  defaultPokerRoadmapLocks,
  isPokerRoadmapPageKey,
  pokerRoadmapPages,
  serializePokerRoadmapLock,
  type PokerRoadmapLock,
} from '@/lib/poker-roadmap-locks'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' ? user : null
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('poker_roadmap_page_locks')
    .select('page_key,title,locked,unlock_at,updated_at')
    .order('page_key', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as PokerRoadmapLock[]
  const locks = defaultPokerRoadmapLocks().map((fallback) => ({
    ...fallback,
    ...rows.find((row) => row.page_key === fallback.page_key),
  }))

  return NextResponse.json({ locks: locks.map(serializePokerRoadmapLock) })
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const pageKey = typeof body.pageKey === 'string' ? body.pageKey : null
  const locked = Boolean(body.locked)
  const unlockAt = typeof body.unlockAt === 'string' && body.unlockAt.trim() ? body.unlockAt : null

  if (!isPokerRoadmapPageKey(pageKey)) {
    return NextResponse.json({ error: 'Unknown poker-roadmap page key' }, { status: 400 })
  }

  if (unlockAt && Number.isNaN(new Date(unlockAt).getTime())) {
    return NextResponse.json({ error: 'Invalid unlockAt value' }, { status: 400 })
  }

  const page = pokerRoadmapPages.find((item) => item.pageKey === pageKey)!
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('poker_roadmap_page_locks')
    .upsert({
      page_key: page.pageKey,
      title: page.title,
      locked,
      unlock_at: locked ? unlockAt : null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'page_key' })
    .select('page_key,title,locked,unlock_at,updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ lock: serializePokerRoadmapLock(data as PokerRoadmapLock) })
}
