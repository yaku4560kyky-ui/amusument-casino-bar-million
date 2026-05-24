import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { NotificationPrefs } from '@/types'

import SettingsClient from './SettingsClient'

export const dynamic = 'force-dynamic'

const defaultNotificationPrefs: NotificationPrefs = {
  in_app: true,
  push: false,
  email: false,
  task_assigned: true,
  event_reminder: true,
  tournament_update: true,
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: integrations }] = await Promise.all([
    supabase
      .from('profiles')
      .select('role, notification_prefs')
      .eq('id', user.id)
      .single(),
    supabase
      .from('integration_configs')
      .select('provider')
      .eq('user_id', user.id),
  ])

  const providers = new Set((integrations ?? []).map(config => config.provider))

  return (
    <SettingsClient
      isAdmin={profile?.role === 'admin'}
      initialNotificationPrefs={{
        ...defaultNotificationPrefs,
        ...((profile?.notification_prefs as Partial<NotificationPrefs> | null) ?? {}),
      }}
      googleConnected={providers.has('google_calendar')}
      notionConnected={providers.has('notion')}
    />
  )
}
