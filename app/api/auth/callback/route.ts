import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  if (tokenHash && type === 'magiclink') {
    const supabase = await createClient()
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
    return NextResponse.redirect(`${origin}${next}`)
  }

  if (tokenHash && type === 'recovery') {
    const supabase = await createClient()
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
    return NextResponse.redirect(`${origin}/reset-password`)
  }

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
