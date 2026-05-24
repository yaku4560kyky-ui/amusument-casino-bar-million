import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { apiKey } = (await req.json()) as { apiKey?: string }
  if (!apiKey?.trim()) {
    return NextResponse.json({ error: 'Notion APIキーを入力してください' }, { status: 400 })
  }

  const { error } = await supabase.from('integration_configs').upsert(
    {
      user_id: user.id,
      provider: 'notion',
      config_json: { api_key_set: true, api_key_hint: apiKey.slice(-4) },
    },
    { onConflict: 'user_id,provider' }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
