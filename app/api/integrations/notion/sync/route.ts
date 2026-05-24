import { NextResponse } from 'next/server'

import { createNotionPage, updateNotionPage } from '@/lib/notion'
import { createClient } from '@/lib/supabase/server'

const tableMap = {
  task: 'operation_tasks',
  event: 'operation_events',
  tournament: 'exceed_tournaments',
} as const

const dbIdMap = {
  task: process.env.NOTION_DATABASE_ID_TASKS,
  event: process.env.NOTION_DATABASE_ID_EVENTS,
  tournament: process.env.NOTION_DATABASE_ID_TOURNAMENTS,
} as const

type SyncType = keyof typeof tableMap

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { type, id } = (await req.json()) as { type?: SyncType; id?: string }
  const table = type ? tableMap[type] : undefined
  const dbId = type ? dbIdMap[type] : undefined

  if (!table || !dbId || !id) {
    return NextResponse.json({ error: '無効なタイプです' }, { status: 400 })
  }

  const { data: record, error } = await supabase.from(table).select('*').eq('id', id).single()
  if (error || !record) {
    return NextResponse.json({ error: 'レコードが見つかりません' }, { status: 404 })
  }

  try {
    let notionPageId = record.notion_page_id as string | null

    if (notionPageId) {
      await updateNotionPage(notionPageId, {
        Name: { title: [{ text: { content: record.title as string } }] },
      })
    } else {
      const page = await createNotionPage({ databaseId: dbId, title: record.title as string })
      notionPageId = page.id
      await supabase.from(table).update({ notion_page_id: notionPageId }).eq('id', id)
    }

    return NextResponse.json({ success: true, notion_page_id: notionPageId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Notion同期エラー'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
