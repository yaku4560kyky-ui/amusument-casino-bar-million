import PokerRoadmapClient from './PokerRoadmapClient'
import PokerRoadmapLockManager from './PokerRoadmapLockManager'
import { pokerRoadmapChapters } from './roadmap-data'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  defaultPokerRoadmapLocks,
  isPokerRoadmapPageKey,
  serializePokerRoadmapLock,
  type PokerRoadmapLock,
  type PokerRoadmapPageKey,
} from '@/lib/poker-roadmap-locks'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

function chapterIdToPageKey(id: string): PokerRoadmapPageKey {
  return id === 'qa' ? 'qa' : id.replace(/^ch/, '') as PokerRoadmapPageKey
}

async function getInitialLocks() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('poker_roadmap_page_locks')
      .select('page_key,title,locked,unlock_at,updated_at')
      .order('page_key', { ascending: true })

    const rows = (data ?? []) as PokerRoadmapLock[]
    return defaultPokerRoadmapLocks()
      .map((fallback) => ({
        ...fallback,
        ...rows.find((row) => row.page_key === fallback.page_key),
      }))
      .map(serializePokerRoadmapLock)
  } catch {
    return defaultPokerRoadmapLocks().map(serializePokerRoadmapLock)
  }
}

function getRequestedPageKey(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && isPokerRoadmapPageKey(raw) ? raw : null
}

function LockedRoadmapPage({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-[#0a0e0a] p-6 text-[#f0e8d0]">
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center">
        <section className="w-full rounded-lg border border-[#c9a84c40] bg-[#0d1510] p-8 text-center shadow-2xl shadow-black/30">
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-[#e8c76a]">
            locked
          </div>
          <h1 className="mt-3 font-serif text-3xl font-bold text-[#f0e8d0]">
            このページはロックされています
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#a09070]">
            {title} は現在閲覧できません。管理者がロックを解除すると再度アクセスできます。
          </p>
        </section>
      </div>
    </div>
  )
}

export default async function PokerRoadmapPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }
  const initialLocks = await getInitialLocks()
  const query = await searchParams
  const requestedPageKey = getRequestedPageKey(query.page)
  const isAdmin = profile?.role === 'admin'
  const pages = pokerRoadmapChapters.map((chapter) => ({
    pageKey: chapterIdToPageKey(chapter.id),
    title: chapter.title,
  }))

  const lockedKeys = new Set(initialLocks.filter((lock) => lock.isLocked).map((lock) => lock.pageKey))
  const requestedPage = requestedPageKey
    ? pages.find((page) => page.pageKey === requestedPageKey)
    : null

  if (!isAdmin && requestedPageKey && lockedKeys.has(requestedPageKey)) {
    return <LockedRoadmapPage title={requestedPage?.title ?? requestedPageKey} />
  }

  // Non-admin responses never include markdown for locked chapters.
  const chapters = isAdmin
    ? pokerRoadmapChapters
    : pokerRoadmapChapters.map((chapter) =>
        lockedKeys.has(chapterIdToPageKey(chapter.id)) ? { ...chapter, markdown: '' } : chapter
      )

  return (
    <div>
      {isAdmin ? (
        <PokerRoadmapLockManager pages={pages} initialLocks={initialLocks} />
      ) : null}
      <PokerRoadmapClient chapters={chapters} serverLockedKeys={lockedKeys} isAdmin={isAdmin} />
    </div>
  )
}
