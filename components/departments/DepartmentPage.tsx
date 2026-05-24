import DepartmentImport from '@/components/departments/DepartmentImport'
import KpiCard from '@/components/departments/KpiCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DepartmentDefinition } from '@/lib/company'

export default function DepartmentPage({ department }: { department: DepartmentDefinition }) {
  return (
    <div className="mx-auto max-w-6xl space-y-7 p-6">
      <section className="rounded-xl border border-amber-400/15 bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,0.13),transparent_24rem),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(3,7,18,0.88))] p-6">
        <div className="text-sm font-medium text-amber-200/70">{department.reportsTo} 配下</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-100">
          {department.title}
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">{department.description}</p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {department.kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {department.sections.map((section) => (
          <div
            key={section.title}
            className="rounded-xl bg-gradient-to-br from-amber-300/25 via-slate-700/40 to-transparent p-px"
          >
            <Card className="h-full border-0 bg-card/95">
              <CardHeader>
                <CardTitle className="text-amber-100">{section.title}</CardTitle>
                <CardDescription>現在の確認項目</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {section.items.map((item) => (
                    <li
                      key={item}
                      className="rounded-lg border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-slate-200"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <DepartmentImport department={department.key} />
    </div>
  )
}
