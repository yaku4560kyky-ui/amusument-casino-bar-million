import { redirect } from 'next/navigation'
import { format } from 'date-fns'

import { createClient } from '@/lib/supabase/server'
import type {
  ExceedTournament,
  OperationEvent,
  OperationTask,
  TaskCompletion,
} from '@/types/schedule'

import ScheduleClient from './ScheduleClient'

export const dynamic = 'force-dynamic'

type StaffProfile = {
  id: string
  name: string
}

export default async function SchedulePage() {
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = profile?.role === 'admin'

  const [
    eventsResult,
    tasksResult,
    completionsResult,
    tournamentsResult,
    staffProfilesResult,
  ] = await Promise.all([
    supabase
      .from('operation_events')
      .select('*')
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true }),
    supabase
      .from('operation_tasks')
      .select('*, assignee:profiles(name)')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('task_completions')
      .select('*')
      .gte('completion_date', today)
      .lte('completion_date', today),
    supabase
      .from('exceed_tournaments')
      .select('*, tasks:exceed_tasks(*)')
      .order('tournament_date', { ascending: false })
      .limit(20),
    supabase
      .from('profiles')
      .select('id, name')
      .order('name', { ascending: true }),
  ])

  return (
    <ScheduleClient
      initialEvents={(eventsResult.data ?? []) as OperationEvent[]}
      initialTasks={(tasksResult.data ?? []) as OperationTask[]}
      initialCompletions={(completionsResult.data ?? []) as TaskCompletion[]}
      initialTournaments={(tournamentsResult.data ?? []) as ExceedTournament[]}
      staffProfiles={(staffProfilesResult.data ?? []) as StaffProfile[]}
      today={today}
      isAdmin={isAdmin}
    />
  )
}
