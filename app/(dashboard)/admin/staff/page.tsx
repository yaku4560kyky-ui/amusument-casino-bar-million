import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import StaffFormDialog from '@/components/admin/StaffFormDialog'
import type { Profile } from '@/types'

const EMPLOYMENT_LABEL: Record<string, string> = {
  part_time: 'アルバイト',
  full_time: '正社員',
  contract: '契約社員',
}

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin') redirect('/clock')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('name', { ascending: true })

  const staff = (profiles ?? []) as Profile[]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">スタッフ管理</h1>
        <StaffFormDialog
          trigger={<Button size="sm">+ 新規登録</Button>}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">スタッフ一覧（{staff.length}名）</CardTitle>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">スタッフが登録されていません</p>
          ) : (
            <div className="space-y-2">
              {staff.map(member => (
                <div key={member.id} className="flex items-center justify-between py-3 border-b last:border-0 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{member.name}</span>
                      {member.name_kana && (
                        <span className="text-xs text-muted-foreground">{member.name_kana}</span>
                      )}
                      <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-[10px]">
                        {member.role === 'admin' ? '管理者' : 'スタッフ'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <div className="flex gap-3 flex-wrap">
                        <span>{member.employment_type ? EMPLOYMENT_LABEL[member.employment_type] : ''}</span>
                        {member.position && <span>{member.position}</span>}
                        {member.phone && <span>{member.phone}</span>}
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        <span>時給 ¥{(member.hourly_wage ?? 0).toLocaleString()}</span>
                        <span>深夜 ×{member.night_wage_rate ?? 1}</span>
                        <span>交通費 ¥{(member.transportation_fee ?? 0).toLocaleString()}/月</span>
                      </div>
                    </div>
                  </div>
                  <StaffFormDialog
                    existing={member}
                    trigger={
                      <Button variant="outline" size="sm" className="shrink-0">編集</Button>
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
