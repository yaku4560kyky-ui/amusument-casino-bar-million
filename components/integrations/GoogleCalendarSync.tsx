'use client'

import { useState } from 'react'
import { CalendarPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface GoogleCalendarSyncProps {
  type: 'event' | 'tournament'
  id: string
  gcalEventId?: string | null
}

export default function GoogleCalendarSync({
  type,
  id,
  gcalEventId,
}: GoogleCalendarSyncProps) {
  const [syncedEventId, setSyncedEventId] = useState(gcalEventId ?? '')
  const [isSyncing, setIsSyncing] = useState(false)

  async function sync() {
    setIsSyncing(true)

    try {
      const response = await fetch('/api/integrations/google-calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        gcal_event_id?: string
        error?: string
      }

      if (!response.ok) {
        throw new Error(payload.error ?? 'Google Calendar同期に失敗しました')
      }

      if (payload.gcal_event_id) setSyncedEventId(payload.gcal_event_id)
      toast.success('Google Calendarに追加しました')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Google Calendar同期に失敗しました')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      {syncedEventId && (
        <Badge className="border-green-500/30 bg-green-500/10 text-green-300">
          同期済み
        </Badge>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isSyncing}
        className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
        onClick={() => void sync()}
      >
        {isSyncing ? <Loader2 className="size-3.5 animate-spin" /> : <CalendarPlus className="size-3.5" />}
        Google Calendarに追加
      </Button>
    </div>
  )
}
