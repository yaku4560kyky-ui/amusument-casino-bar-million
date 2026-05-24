'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSchedule(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('認証されていません')
  }

  const title = formData.get('title') as string
  const date = formData.get('date') as string
  const start_time = formData.get('start_time') as string
  const end_time = formData.get('end_time') as string
  const department_target = formData.get('department_target') as string
  const description = formData.get('description') as string

  if (!title || !date) {
    return { error: 'タイトルと日付は必須です' }
  }

  const { error } = await supabase.from('schedules').insert({
    title,
    date,
    start_time: start_time || null,
    end_time: end_time || null,
    department_target,
    description,
    created_by: user.id
  })

  if (error) {
    console.error('Error inserting schedule:', error)
    return { error: 'スケジュールの登録に失敗しました' }
  }

  revalidatePath('/schedule')
  return { success: true }
}
