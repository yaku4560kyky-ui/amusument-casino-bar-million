import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isLockActive, isPokerRoadmapPageKey, pokerRoadmapPages, type PokerRoadmapLock } from '@/lib/poker-roadmap-locks'

export const dynamic = 'force-dynamic'

const ALLOWED_ORIGINS = [
  'https://yaku4560kyky-ui.github.io',
  'http://localhost:3000',
]

function corsHeaders(origin: string | null): Record<string, string> {
  const matched = origin && ALLOWED_ORIGINS.includes(origin) ? origin : null
  if (!matched) return { 'Cache-Control': 'no-store' }
  return {
    'Access-Control-Allow-Origin': matched,
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
    'Cache-Control': 'no-store',
  }
}

async function getLockedKeys(adminClient: ReturnType<typeof createAdminClient>) {
  const { data } = await adminClient
    .from('poker_roadmap_page_locks')
    .select('page_key,locked,unlock_at')
  const rows = (data ?? []) as Pick<PokerRoadmapLock, 'page_key' | 'locked' | 'unlock_at'>[]
  const now = Date.now()
  return rows.filter((row) => isLockActive(row, now)).map((row) => row.page_key)
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin')
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}

export async function GET(request: Request) {
  const origin = request.headers.get('origin')
  try {
    const adminClient = createAdminClient()
    const lockedKeys = await getLockedKeys(adminClient)
    return NextResponse.json({ lockedKeys }, { headers: corsHeaders(origin) })
  } catch {
    return NextResponse.json({ lockedKeys: [] }, { headers: corsHeaders(origin) })
  }
}

export async function PATCH(request: Request) {
  const origin = request.headers.get('origin')
  const adminKey = request.headers.get('x-admin-key')
  const expectedKey = process.env.POKER_ROADMAP_ADMIN_KEY

  if (!expectedKey || adminKey !== expectedKey) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders(origin) })
  }

  const body = await request.json()
  const pageKey = typeof body.pageKey === 'string' ? body.pageKey : null
  const locked = Boolean(body.locked)
  const unlockAt = typeof body.unlockAt === 'string' && body.unlockAt ? body.unlockAt : null

  if (!isPokerRoadmapPageKey(pageKey)) {
    return NextResponse.json({ error: 'Unknown page key' }, { status: 400, headers: corsHeaders(origin) })
  }

  const page = pokerRoadmapPages.find((p) => p.pageKey === pageKey)!
  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('poker_roadmap_page_locks')
    .upsert({
      page_key: pageKey,
      title: page.title,
      locked,
      unlock_at: locked ? unlockAt : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'page_key' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders(origin) })
  }

  const lockedKeys = await getLockedKeys(adminClient)
  return NextResponse.json({ lockedKeys }, { headers: corsHeaders(origin) })
}
