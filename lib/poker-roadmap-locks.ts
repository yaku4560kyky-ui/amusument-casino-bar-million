export type PokerRoadmapPageKey = 'qa' | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'

export type PokerRoadmapLock = {
  page_key: PokerRoadmapPageKey
  title: string
  locked: boolean
  unlock_at: string | null
  updated_at?: string | null
}

export type PokerRoadmapLockResponse = {
  pageKey: PokerRoadmapPageKey
  title: string
  locked: boolean
  unlockAt: string | null
  isLocked: boolean
}

export const pokerRoadmapPages: ReadonlyArray<{ pageKey: PokerRoadmapPageKey; title: string }> = [
  { pageKey: 'qa', title: 'Q&A' },
  { pageKey: '0', title: 'Chapter 0' },
  { pageKey: '1', title: 'Chapter 1' },
  { pageKey: '2', title: 'Chapter 2' },
  { pageKey: '3', title: 'Chapter 3' },
  { pageKey: '4', title: 'Chapter 4' },
  { pageKey: '5', title: 'Chapter 5' },
  { pageKey: '6', title: 'Chapter 6' },
  { pageKey: '7', title: 'Chapter 7' },
  { pageKey: '8', title: 'Chapter 8' },
]

export function isPokerRoadmapPageKey(value: string | null): value is PokerRoadmapPageKey {
  return pokerRoadmapPages.some((page) => page.pageKey === value)
}

export function isLockActive(lock: Pick<PokerRoadmapLock, 'locked' | 'unlock_at'>, now = Date.now()) {
  if (!lock.locked) return false
  if (!lock.unlock_at) return true

  const unlockTime = new Date(lock.unlock_at).getTime()
  if (Number.isNaN(unlockTime)) return true

  return now < unlockTime
}

export function serializePokerRoadmapLock(lock: PokerRoadmapLock): PokerRoadmapLockResponse {
  return {
    pageKey: lock.page_key,
    title: lock.title,
    locked: lock.locked,
    unlockAt: lock.unlock_at,
    isLocked: isLockActive(lock),
  }
}

export function defaultPokerRoadmapLocks(): PokerRoadmapLock[] {
  return pokerRoadmapPages.map((page) => ({
    page_key: page.pageKey,
    title: page.title,
    locked: false,
    unlock_at: null,
  }))
}
