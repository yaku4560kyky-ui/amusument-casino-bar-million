import { NextResponse } from 'next/server'

import { writeVaultMarkdown } from '@/lib/obsidian'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: '管理者のみ利用できます' }, { status: 403 })
  }

  const { path, content } = await req.json()
  if (!path || content === undefined) {
    return NextResponse.json({ error: 'path と content が必要です' }, { status: 400 })
  }

  try {
    await writeVaultMarkdown(path, String(content))
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ファイル書き込みエラー'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
