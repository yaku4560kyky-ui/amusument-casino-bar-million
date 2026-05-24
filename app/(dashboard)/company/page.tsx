import { Crown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { companyName, departments, ownerName } from '@/lib/company'

export const dynamic = 'force-dynamic'

export default function CompanyPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-7 p-6">
      <section className="overflow-hidden rounded-xl border border-amber-400/20 bg-[radial-gradient(circle_at_18%_0%,rgba(251,191,36,0.16),transparent_28rem),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(3,7,18,0.92))] p-6 shadow-2xl shadow-black/30 md:p-8">
        <div className="text-sm font-medium uppercase tracking-[0.3em] text-amber-200/70">
          company profile
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-amber-100 md:text-5xl">
          {companyName}
        </h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          会社概要、組織図、部門階層を確認します。
        </p>
      </section>

      <Card className="border-amber-400/15 bg-card/85">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-100">
            <Crown className="size-5 text-amber-300" />
            {ownerName}
          </CardTitle>
          <CardDescription>オーナー直下の運用体制</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {departments.map((department) => {
              const Icon = department.icon

              return (
                <div
                  key={department.key}
                  className="flex flex-col gap-3 rounded-lg border border-slate-700/70 bg-slate-950/35 p-3 transition-colors hover:border-amber-400/70 hover:bg-amber-400/5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-300/10">
                      <Icon className="size-5 text-amber-300" />
                    </div>
                    <div>
                      <div className="font-medium text-amber-50">{department.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {department.reportsTo} 配下
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-amber-300/30 text-amber-200">
                    階層 {department.level}
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
