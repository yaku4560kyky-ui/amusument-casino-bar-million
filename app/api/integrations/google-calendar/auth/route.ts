import { NextResponse } from 'next/server'

import { getAuthUrl } from '@/lib/google-calendar'

export async function GET() {
  try {
    const url = getAuthUrl()
    return NextResponse.json({ url })
  } catch {
    return NextResponse.json(
      { error: 'Google認証URLの生成に失敗しました' },
      { status: 500 }
    )
  }
}
