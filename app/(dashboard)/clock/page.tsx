import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClockPanel from '@/components/clock/ClockPanel'
import type { TimeRecord, Break } from '@/types'

export default async function ClockPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  // 今日の勤怠記録を取得
  const { data: record } = await supabase
    .from('time_records')
    .select('*')
    .eq('user_id', user.id)
    .gte('clock_in', `${today}T00:00:00`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 今日の休憩記録を取得
  let breaks: Break[] = []
  if (record) {
    const { data } = await supabase
      .from('breaks')
      .select('*')
      .eq('time_record_id', record.id)
      .order('created_at', { ascending: true })
    breaks = data ?? []
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">打刻</h1>
      <ClockPanel
        initialRecord={record as TimeRecord | null}
        initialBreaks={breaks}
      />
    </div>
  )
}
