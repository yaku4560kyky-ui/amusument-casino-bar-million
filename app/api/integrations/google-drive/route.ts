import { NextResponse } from 'next/server'

import { getDriveFiles } from '@/lib/google-drive'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: config } = await supabase
    .from('integration_configs')
    .select('access_token, refresh_token')
    .eq('user_id', user.id)
    .eq('provider', 'google_calendar')
    .single()

  if (!config?.access_token) {
    return NextResponse.json({ error: 'Google連携が必要です' }, { status: 400 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') ?? undefined
    const files = await getDriveFiles(
      {
        access_token: config.access_token,
        refresh_token: config.refresh_token ?? undefined,
      },
      query
    )

    return NextResponse.json({ files })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Drive取得エラー'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
