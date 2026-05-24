import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  const { attachmentId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: attachment, error: findError } = await supabase
    .from('attachments')
    .select('id, bucket, object_path')
    .eq('id', attachmentId)
    .single()

  if (findError || !attachment) {
    return NextResponse.json({ error: '添付ファイルが見つかりません' }, { status: 404 })
  }

  const { error: storageError } = await supabase.storage
    .from(attachment.bucket)
    .remove([attachment.object_path])

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 })
  }

  const { error: dbError } = await supabase.from('attachments').delete().eq('id', attachment.id)
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
