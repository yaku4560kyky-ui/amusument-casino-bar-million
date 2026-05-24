import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, error: NextResponse.json({ error: '認証が必要です' }, { status: 401 }) }
  }

  return { supabase, user, error: null }
}

export async function requireAdmin() {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth

  const { data: profile } = await auth.supabase.from('profiles').select('role').eq('id', auth.user.id).single()
  if (profile?.role !== 'admin') {
    return { ...auth, error: NextResponse.json({ error: '権限がありません' }, { status: 403 }) }
  }

  return auth
}

export function jsonError(error: { message: string }, status = 500) {
  return NextResponse.json({ error: error.message }, { status })
}
