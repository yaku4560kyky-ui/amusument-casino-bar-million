import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { OperationTask } from '@/types/schedule'

import TaskBoardClient from './TaskBoardClient'

type ProfileOption = {
  id: string
  name: string
}

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: tasks }, { data: profiles }, { data: myProfile }] = await Promise.all([
    supabase
      .from('operation_tasks')
      .select('*, assignee:profiles(id,name)')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase.from('profiles').select('id, name').order('name', { ascending: true }),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ])

  return (
    <TaskBoardClient
      initialTasks={(tasks ?? []) as OperationTask[]}
      profiles={(profiles ?? []) as ProfileOption[]}
      isAdmin={myProfile?.role === 'admin'}
      userId={user.id}
    />
  )
}
