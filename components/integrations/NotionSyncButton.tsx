'use client'

import { useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

interface NotionSyncButtonProps {
  type: 'task' | 'event' | 'tournament'
  id: string
  notionPageId?: string | null
}

export default function NotionSyncButton({
  type,
  id,
  notionPageId,
}: NotionSyncButtonProps) {
  const [pageId, setPageId] = useState(notionPageId ?? '')
  const [isSyncing, setIsSyncing] = useState(false)

  async function sync() {
    setIsSyncing(true)

    try {
      const response = await fetch('/api/integrations/notion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        notion_page_id?: string
        error?: string
      }

      if (!response.ok) throw new Error(payload.error ?? 'Notion同期に失敗しました')
      if (payload.notion_page_id) setPageId(payload.notion_page_id)
      toast.success('Notionに同期しました')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Notion同期に失敗しました')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isSyncing}
        className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
        onClick={() => void sync()}
      >
        {isSyncing ? <Loader2 className="size-3.5 animate-spin" /> : <ExternalLink className="size-3.5" />}
        Notionに同期
      </Button>
      {pageId && (
        <a
          href={`https://notion.so/${pageId.replaceAll('-', '')}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-amber-200 underline-offset-4 hover:underline"
        >
          Notion
        </a>
      )}
    </div>
  )
}
