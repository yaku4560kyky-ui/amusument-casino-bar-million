import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StaffFormDialog from '@/components/admin/StaffFormDialog'
import InviteDialog from '@/components/admin/InviteDialog'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
import type { Profile } from '@/types'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const [{ data: profiles }, { data: { users: authUsers } }] = await Promise.all([
    supabase.from('profiles').select('*').order('name'),
    adminClient.auth.admin.listUsers(),
  ])

  const emailMap = new Map<string, string>(
    authUsers.map(u => [u.id, u.email ?? ''])
  )

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <section className="rounded-xl border border-amber-400/15 bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(3,7,18,0.88))] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-amber-200/70">管理者専用</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-100">スタッフ管理</h1>
          </div>
          <InviteDialog
            trigger={
              <Button className="bg-amber-400 text-slate-950 hover:bg-amber-300">
                <UserPlus className="size-4" />
                新規スタッフ招待
              </Button>
            }
          />
        </div>
      </section>

      <Card className="border-amber-400/10 bg-card/95">
        <CardHeader>
          <CardTitle className="text-amber-100">スタッフ一覧 ({profiles?.length ?? 0}名)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 text-left font-medium">氏名 / かな</th>
                  <th className="pb-3 text-left font-medium">メール</th>
                  <th className="pb-3 text-left font-medium">役職</th>
                  <th className="pb-3 text-left font-medium">権限</th>
                  <th className="pb-3 text-right font-medium">アクション</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(profiles ?? []).map(profile => (
                  <tr key={profile.id} className="text-slate-200">
                    <td className="py-3">
                      <div className="font-medium">{profile.name}</div>
                      {profile.name_kana && (
                        <div className="text-xs text-muted-foreground">{profile.name_kana}</div>
                      )}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {emailMap.get(profile.id) ?? '—'}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {profile.position ?? '—'}
                    </td>
                    <td className="py-3">
                      <Badge
                        className={
                          profile.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                        }
                      >
                        {profile.role === 'admin' ? '管理者' : 'スタッフ'}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <StaffFormDialog
                        existing={profile as Profile}
                        trigger={
                          <Button variant="outline" size="sm" className="border-amber-400/20 text-amber-200 hover:bg-amber-400/10">
                            編集
                          </Button>
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
