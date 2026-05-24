import { NextRequest, NextResponse } from 'next/server'
import { jsonError, requireAdmin, requireUser } from '@/lib/api/schedule'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const { supabase, error } = await requireUser()
  if (error) return error

  const { data, error: queryError } = await supabase
    .from('operation_tasks')
    .select('*, assignee:profiles(name)')
    .eq('is_active', true)
    .order('sort_order')
  if (queryError) return jsonError(queryError)
  return NextResponse.json({ tasks: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { supabase, user, error } = await requireAdmin()
  if (error || !user) return error

  const body = await request.json()
  if (!body.title) return NextResponse.json({ error: 'タイトルは必須です' }, { status: 400 })

  const { data, error: queryError } = await supabase
    .from('operation_tasks')
    .insert({
      title: body.title,
      category: body.category || 'custom',
      priority: body.priority || 'normal',
      recurrence_type: body.recurrence_type || 'none',
      recurrence_days: body.recurrence_days || null,
      recurrence_day_of_month: body.recurrence_day_of_month || null,
      assignee_id: body.assignee_id || null,
      due_date: body.due_date || null,
      notes: body.notes || null,
      image_urls: Array.isArray(body.image_urls) ? body.image_urls : [],
      kanban_status: body.kanban_status || 'todo',
      created_by: user.id,
    })
    .select()
    .single()
  if (queryError) return jsonError(queryError)

  if (data?.assignee_id) {
    try {
      const notificationClient = createAdminClient()
      await notificationClient.from('notifications').insert({
        user_id: data.assignee_id,
        type: 'task_assigned',
        title: 'タスクが割り当てられました',
        body: `「${data.title}」が担当に設定されました`,
        link_url: '/tasks',
        ref_table: 'operation_tasks',
        ref_id: data.id,
      })
    } catch {
      await supabase.from('notifications').insert({
        user_id: data.assignee_id,
        type: 'task_assigned',
        title: 'タスクが割り当てられました',
        body: `「${data.title}」が担当に設定されました`,
        link_url: '/tasks',
        ref_table: 'operation_tasks',
        ref_id: data.id,
      })
    }
  }

  return NextResponse.json({ task: data }, { status: 201 })
}
