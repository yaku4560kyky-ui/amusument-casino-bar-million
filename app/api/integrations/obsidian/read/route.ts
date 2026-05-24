import { NextResponse } from 'next/server'

import { listVaultDirectory, readVaultMarkdown } from '@/lib/obsidian'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
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

  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path')
  const dir = searchParams.get('dir')

  try {
    if (dir) {
      const files = await listVaultDirectory(dir)
      return NextResponse.json({ files })
    }

    if (path) {
      const content = await readVaultMarkdown(path)
      return NextResponse.json({ content })
    }

    return NextResponse.json({ error: 'path または dir パラメータが必要です' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ファイル読み込みエラー'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
