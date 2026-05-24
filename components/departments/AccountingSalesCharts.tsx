'use client'

import { AlertCircle, BarChart3, TrendingUp } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface DailySalesPoint {
  date: string
  label: string
  sales: number
}

export interface MonthlySalesPoint {
  month: string
  label: string
  sales: number
}

export interface SalesChartData {
  currentMonthLabel: string
  currentMonthSales: number
  dailySales: DailySalesPoint[]
  monthlySales: MonthlySalesPoint[]
  isSampleData: boolean
  error?: string
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value)
}

function maxSales<T extends { sales: number }>(data: T[]) {
  return Math.max(1, ...data.map((item) => item.sales))
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-slate-700/80 bg-slate-950/25 text-sm text-muted-foreground">
      {message}
    </div>
  )
}

function DailySalesChart({ data }: { data: DailySalesPoint[] }) {
  if (data.length === 0) {
    return <EmptyChart message="表示できる日次売上データがありません" />
  }

  const width = 720
  const height = 260
  const padding = { top: 20, right: 18, bottom: 34, left: 58 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const max = maxSales(data)
  const step = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth
  const points = data.map((item, index) => {
    const x = padding.left + step * index
    const y = padding.top + chartHeight - (item.sales / max) * chartHeight
    return { ...item, x, y }
  })
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const areaPath = `${path} L ${points.at(-1)?.x ?? padding.left} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`
  const gridLines = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="h-72 w-full">
      <svg className="h-full w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="日次売上推移">
        <defs>
          <linearGradient id="dailySalesArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {gridLines.map((line) => {
          const y = padding.top + chartHeight * line
          const value = max - max * line
          return (
            <g key={line}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeOpacity="0.65"
              />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">
                {Math.round(value / 1000)}k
              </text>
            </g>
          )
        })}
        <path d={areaPath} fill="url(#dailySalesArea)" />
        <path d={path} fill="none" stroke="var(--chart-1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        {points.map((point, index) => (
          <g key={point.date}>
            <circle cx={point.x} cy={point.y} r="4" fill="var(--chart-1)" stroke="var(--card)" strokeWidth="2" />
            {(index === 0 || index === points.length - 1 || point.label.endsWith('5') || point.label.endsWith('0')) && (
              <text x={point.x} y={height - 10} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                {point.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

function MonthlySalesChart({ data }: { data: MonthlySalesPoint[] }) {
  if (data.length === 0) {
    return <EmptyChart message="表示できる月次売上データがありません" />
  }

  const max = maxSales(data)

  return (
    <div className="flex h-72 items-end gap-2 overflow-hidden rounded-lg border border-slate-700/70 bg-slate-950/25 px-3 pb-4 pt-6 sm:gap-3 sm:px-5">
      {data.map((item) => {
        const height = Math.max(8, (item.sales / max) * 100)

        return (
          <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-52 w-full items-end">
              <div
                className="w-full rounded-t-md bg-[linear-gradient(180deg,var(--chart-2),var(--chart-1))] shadow-lg shadow-amber-950/30"
                style={{ height: `${height}%` }}
                title={`${item.label}: ${formatCurrency(item.sales)}`}
              />
            </div>
            <div className="w-full truncate text-center text-[11px] text-muted-foreground">{item.label}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function AccountingSalesCharts({
  shortTitle,
  salesData,
}: {
  shortTitle: string
  salesData: SalesChartData
}) {
  return (
    <div className="space-y-7">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-amber-400/20 bg-card/90 md:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardDescription>{salesData.currentMonthLabel} 売上</CardDescription>
                <CardTitle className="mt-2 text-4xl font-semibold text-amber-300 sm:text-5xl">
                  {formatCurrency(salesData.currentMonthSales)}
                </CardTitle>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-300/10">
                <TrendingUp className="size-5 text-amber-300" />
              </div>
            </div>
            <CardDescription>
              日別の売上推移。CSV/JSONインポート済みの会計データから集計します。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DailySalesChart data={salesData.dailySales} />
          </CardContent>
        </Card>

        <Card className="border-amber-400/10 bg-card/85">
          <CardHeader>
            <CardDescription>データ状態</CardDescription>
            <CardTitle className="text-2xl font-semibold text-amber-100">
              {salesData.isSampleData ? 'サンプル表示' : 'Supabase集計'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {salesData.error ? (
              <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{salesData.error}</span>
              </div>
            ) : null}
            <p>
              {salesData.isSampleData
                ? 'accounting_dataに売上として判定できる行がないため、表示確認用のサンプルを描画しています。'
                : 'accounting_dataのdate/sales/amount等の項目を売上行として読み取りました。'}
            </p>
            <p>部門: {shortTitle}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-400/15 bg-card/85">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-amber-300" />
            <CardTitle className="text-amber-100">月次売上推移</CardTitle>
          </div>
          <CardDescription>直近12か月の月別比較</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlySalesChart data={salesData.monthlySales} />
        </CardContent>
      </Card>
    </div>
  )
}
