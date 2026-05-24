import AccountingSalesCharts, {
  type DailySalesPoint,
  type MonthlySalesPoint,
  type SalesChartData,
} from '@/components/departments/AccountingSalesCharts'
import DepartmentImport from '@/components/departments/DepartmentImport'
import KpiCard from '@/components/departments/KpiCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDepartment } from '@/lib/company'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type AccountingRow = {
  created_at: string
  data: Record<string, unknown> | null
}

type SalesRecord = {
  date: Date
  amount: number
}

const dateKeys = [
  'date',
  'sales_date',
  'sale_date',
  'sold_at',
  'created_at',
  'day',
  'month',
  '売上日',
  '日付',
  '営業日',
  '月',
]

const amountKeys = [
  'sales',
  'sale',
  'revenue',
  'amount',
  'total',
  'total_sales',
  'gross_sales',
  '売上',
  '売上高',
  '金額',
  '合計',
  '総売上',
]

function parseAmount(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.replace(/[￥¥,\s]/g, '')
  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : null
}

function parseDate(value: unknown, fallback: string) {
  const source = typeof value === 'string' || typeof value === 'number' ? value : fallback
  const text = String(source).trim()
  const normalized = /^\d{4}[-/]\d{1,2}$/.test(text) ? `${text.replace('/', '-')}-01` : text
  const date = new Date(normalized)

  return Number.isNaN(date.getTime()) ? new Date(fallback) : date
}

function findFirstValue(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      return data[key]
    }
  }

  return null
}

function toSalesRecords(rows: AccountingRow[]) {
  return rows.flatMap((row) => {
    const data = row.data ?? {}
    const amountValue = findFirstValue(data, amountKeys)
    const amount = parseAmount(amountValue)

    if (amount === null || amount <= 0) {
      return []
    }

    return [
      {
        amount,
        date: parseDate(findFirstValue(data, dateKeys), row.created_at),
      },
    ]
  })
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('ja-JP', { month: 'short' }).format(date)
}

function buildSalesChartData(records: SalesRecord[], options?: { error?: string }): SalesChartData {
  const isSampleData = records.length === 0
  const source = isSampleData ? buildSampleSalesRecords() : records
  const now = new Date()
  const currentMonth = startOfMonth(now)
  const nextMonth = addMonths(currentMonth, 1)
  const monthFormatter = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long' })
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dailyMap = new Map<string, number>()
  const monthlyMap = new Map<string, number>()
  const firstHistoryMonth = addMonths(currentMonth, -11)

  source.forEach((record) => {
    if (record.date >= currentMonth && record.date < nextMonth) {
      const key = dateKey(record.date)
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + record.amount)
    }

    if (record.date >= firstHistoryMonth && record.date < nextMonth) {
      const key = monthKey(record.date)
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + record.amount)
    }
  })

  const dailySales: DailySalesPoint[] = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), index + 1)
    return {
      date: dateKey(date),
      label: String(index + 1),
      sales: dailyMap.get(dateKey(date)) ?? 0,
    }
  })

  const monthlySales: MonthlySalesPoint[] = Array.from({ length: 12 }, (_, index) => {
    const date = addMonths(firstHistoryMonth, index)
    return {
      month: monthKey(date),
      label: formatMonthLabel(date),
      sales: monthlyMap.get(monthKey(date)) ?? 0,
    }
  })

  return {
    currentMonthLabel: monthFormatter.format(currentMonth),
    currentMonthSales: dailySales.reduce((sum, item) => sum + item.sales, 0),
    dailySales,
    monthlySales,
    isSampleData,
    error: options?.error,
  }
}

function buildSampleSalesRecords(): SalesRecord[] {
  const now = new Date()
  const records: SalesRecord[] = []

  for (let monthOffset = -11; monthOffset <= 0; monthOffset += 1) {
    const month = addMonths(startOfMonth(now), monthOffset)
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const activeDays = monthOffset === 0 ? Math.min(now.getDate(), daysInMonth) : daysInMonth

    for (let day = 1; day <= activeDays; day += 1) {
      const weekendBoost = [0, 5, 6].includes(new Date(month.getFullYear(), month.getMonth(), day).getDay()) ? 38000 : 0
      const seasonalBase = 78000 + (monthOffset + 11) * 1800
      const variation = ((day * 7919 + month.getMonth() * 1543) % 26000) - 8000
      records.push({
        date: new Date(month.getFullYear(), month.getMonth(), day),
        amount: Math.max(24000, seasonalBase + weekendBoost + variation),
      })
    }
  }

  return records
}

async function getSalesChartData() {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('accounting_data')
      .select('created_at,data')
      .order('created_at', { ascending: true })

    if (error) {
      return buildSalesChartData([], { error: error.message })
    }

    return buildSalesChartData(toSalesRecords((data ?? []) as AccountingRow[]))
  } catch (error) {
    return buildSalesChartData([], {
      error: error instanceof Error ? error.message : '売上データの取得に失敗しました',
    })
  }
}

export default async function AccountingPage() {
  const department = getDepartment('accounting')

  if (!department) {
    return null
  }

  const salesData = await getSalesChartData()

  return (
    <div className="mx-auto max-w-6xl space-y-7 p-6">
      <section className="rounded-xl border border-amber-400/15 bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,0.13),transparent_24rem),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(3,7,18,0.88))] p-6">
        <div className="text-sm font-medium text-amber-200/70">{department.reportsTo} 配下</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-100">
          {department.title}
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">{department.description}</p>
      </section>

      <AccountingSalesCharts shortTitle={department.shortTitle} salesData={salesData} />

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
