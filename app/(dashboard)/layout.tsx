import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  return (
    <div className="flex min-h-screen bg-background text-foreground max-md:flex-col">
      <Sidebar profile={profile as Profile} />
      <main className="ml-64 flex-1 p-6 max-md:ml-0 max-md:p-4">{children}</main>
    </div>
  )
}
