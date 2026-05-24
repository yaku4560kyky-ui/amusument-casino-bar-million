import { NextResponse } from 'next/server'

import { getOAuthClient } from '@/lib/google-calendar'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/settings?error=no_code', req.url))
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    const oauth2Client = getOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)

    await supabase.from('integration_configs').upsert(
      {
        user_id: user.id,
        provider: 'google_calendar',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        config_json: {},
      },
      { onConflict: 'user_id,provider' }
    )

    return NextResponse.redirect(new URL('/settings?connected=google', req.url))
  } catch {
    return NextResponse.redirect(new URL('/settings?error=oauth_failed', req.url))
  }
}
