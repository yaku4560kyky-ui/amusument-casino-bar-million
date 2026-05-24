import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const maxFileSize = 5 * 1024 * 1024

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  const refTable = formData.get('ref_table')
  const refId = formData.get('ref_id')

  if (!(file instanceof File) || typeof refTable !== 'string' || typeof refId !== 'string') {
    return NextResponse.json({ error: 'アップロード情報が不足しています' }, { status: 400 })
  }

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: '画像ファイルのみアップロードできます' }, { status: 400 })
  }

  if (file.size > maxFileSize) {
    return NextResponse.json({ error: 'ファイルサイズは5MB以下にしてください' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'bin'
  const objectPath = `${refTable}/${refId}/${crypto.randomUUID()}.${ext}`

  await supabase.storage.createBucket('uploads', { public: true }).catch(() => {})

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(objectPath, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('uploads').getPublicUrl(objectPath)

  const { data: attachment, error: dbError } = await supabase
    .from('attachments')
    .insert({
      bucket: 'uploads',
      object_path: objectPath,
      file_name: file.name,
      content_type: file.type,
      size_bytes: file.size,
      ref_table: refTable,
      ref_id: refId,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (dbError) {
    await supabase.storage.from('uploads').remove([objectPath]).catch(() => {})
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ url: publicUrl, attachment })
}
