import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  defaultPokerRoadmapLocks,
  isPokerRoadmapPageKey,
  serializePokerRoadmapLock,
  type PokerRoadmapLock,
} from '@/lib/poker-roadmap-locks'

export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...corsHeaders,
      ...init?.headers,
    },
  })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  const pageKey = request.nextUrl.searchParams.get('page')
  if (pageKey && !isPokerRoadmapPageKey(pageKey)) {
    return json({ error: 'Unknown poker-roadmap page key' }, { status: 400 })
  }

  let supabase
  try {
    supabase = createAdminClient()
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Supabase admin client is unavailable' },
      { status: 500 }
    )
  }

  const { data, error } = await supabase
    .from('poker_roadmap_page_locks')
    .select('page_key,title,locked,unlock_at,updated_at')
    .order('page_key', { ascending: true })

  if (error) return json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as PokerRoadmapLock[]
  const merged = defaultPokerRoadmapLocks().map((fallback) => ({
    ...fallback,
    ...rows.find((row) => row.page_key === fallback.page_key),
  }))
  const locks = merged.map(serializePokerRoadmapLock)

  if (pageKey) {
    const page = locks.find((lock) => lock.pageKey === pageKey)
    return json({ page })
  }

  return json({ locks })
}
