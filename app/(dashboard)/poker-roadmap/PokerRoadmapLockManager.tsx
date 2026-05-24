'use client'

import { useMemo, useState } from 'react'
import { Clock, Lock, Unlock } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PokerRoadmapLockResponse, PokerRoadmapPageKey } from '@/lib/poker-roadmap-locks'

type PageOption = {
  pageKey: PokerRoadmapPageKey
  title: string
}

type PendingState = {
  locked: boolean
  unlockAt: string
}

function toDatetimeLocal(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toIsoOrNull(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function describeLock(lock: PokerRoadmapLockResponse) {
  if (!lock.locked) return '公開中'
  if (!lock.unlockAt) return 'ロック中'
  return `${new Date(lock.unlockAt).toLocaleString('ja-JP')} までロック`
}

export default function PokerRoadmapLockManager({
  pages,
  initialLocks,
}: {
  pages: PageOption[]
  initialLocks: PokerRoadmapLockResponse[]
}) {
  const [locks, setLocks] = useState(initialLocks)
  const [pending, setPending] = useState<Record<string, PendingState>>(() => {
    return Object.fromEntries(
      initialLocks.map((lock) => [
        lock.pageKey,
        { locked: lock.locked, unlockAt: toDatetimeLocal(lock.unlockAt) },
      ])
    )
  })
  const [saving, setSaving] = useState<string | null>(null)

  const lockByKey = useMemo(() => {
    return new Map(locks.map((lock) => [lock.pageKey, lock]))
  }, [locks])

  async function save(pageKey: PokerRoadmapPageKey) {
    const next = pending[pageKey]
    if (!next) return

    setSaving(pageKey)
    try {
      const response = await fetch('/api/admin/poker-roadmap-locks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageKey,
          locked: next.locked,
          unlockAt: next.locked ? toIsoOrNull(next.unlockAt) : null,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Lock update failed')

      setLocks((current) => current.map((lock) => (lock.pageKey === pageKey ? payload.lock : lock)))
      setPending((current) => ({
        ...current,
        [pageKey]: {
          locked: payload.lock.locked,
          unlockAt: toDatetimeLocal(payload.lock.unlockAt),
        },
      }))
      toast.success('ロック設定を保存しました')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ロック設定の保存に失敗しました')
    } finally {
      setSaving(null)
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-amber-400/20 bg-slate-950/50 p-4 shadow-2xl shadow-black/20">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-amber-100">Poker Roadmap page locks</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Public poker-roadmap pages read these settings from the shift-app API.
          </p>
        </div>
        <Badge variant="outline" className="border-amber-400/30 text-amber-100">
          Supabase persisted
        </Badge>
      </div>

      <div className="grid gap-3">
        {pages.map((page) => {
          const lock = lockByKey.get(page.pageKey)
          const state = pending[page.pageKey] ?? { locked: false, unlockAt: '' }

          return (
            <div
              key={page.pageKey}
              className="grid gap-3 rounded-lg border border-slate-700/70 bg-slate-950/55 p-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-100">{page.title}</span>
                  <Badge variant={lock?.isLocked ? 'destructive' : 'secondary'}>
                    {lock?.isLocked ? 'locked' : 'open'}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  key: {page.pageKey} / {lock ? describeLock(lock) : '公開中'}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={state.locked ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setPending((current) => ({
                      ...current,
                      [page.pageKey]: { ...state, locked: !state.locked },
                    }))
                  }}
                >
                  {state.locked ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                  {state.locked ? 'Locked' : 'Open'}
                </Button>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-4 text-amber-300" />
                  <input
                    className="h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                    type="datetime-local"
                    disabled={!state.locked}
                    value={state.unlockAt}
                    onChange={(event) => {
                      setPending((current) => ({
                        ...current,
                        [page.pageKey]: { ...state, unlockAt: event.target.value },
                      }))
                    }}
                  />
                </label>
              </div>

              <Button
                type="button"
                size="sm"
                disabled={saving === page.pageKey}
                onClick={() => save(page.pageKey)}
              >
                {saving === page.pageKey ? 'Saving' : 'Save'}
              </Button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
