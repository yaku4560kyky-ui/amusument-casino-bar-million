'use client'

import { useState } from 'react'
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Profile, ShiftPeriod, ShiftRequest } from '@/types'

interface Props {
  period: ShiftPeriod
  staff: Profile[]
  requests: (ShiftRequest & { profile?: Pick<Profile, 'name'> })[]
}

const AVAIL_STYLE: Record<string, string> = {
  preferred:   'bg-blue-100 text-blue-700 font-bold',
  available:   'bg-green-100 text-green-700',
  unavailable: 'bg-red-50 text-red-400',
}
const AVAIL_LABEL: Record<string, string> = {
  preferred: '◎', available: '○', unavailable: '×',
}

function getPeriodDays(period: ShiftPeriod) {
  if (period.period_start && period.period_end) {
    return eachDayOfInterval({
      start: parseISO(period.period_start),
      end: parseISO(period.period_end),
    })
  }
  const monthStart = startOfMonth(new Date(period.target_year, period.target_month - 1, 1))
  return eachDayOfInterval({ start: monthStart, end: endOfMonth(monthStart) })
}

export default function ShiftRequestsGrid({ period, staff, requests }: Props) {
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)

  const days = getPeriodDays(period)

  const requestMap = new Map<string, ShiftRequest>()
  for (const r of requests) {
    requestMap.set(`${r.user_id}:${r.date}`, r)
  }

  const filteredStaff = selectedStaff ? staff.filter(s => s.id === selectedStaff) : staff

  return (
    <div className="space-y-4">
      {/* スタッフフィルター */}
      <div className="flex gap-2 flex-wrap">
        <Badge
          variant={selectedStaff === null ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setSelectedStaff(null)}
        >
          全員
        </Badge>
        {staff.map(s => (
          <Badge
            key={s.id}
            variant={selectedStaff === s.id ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedStaff(s.id)}
          >
            {s.name}
          </Badge>
        ))}
      </div>

      {/* グリッド */}
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse min-w-full">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white border px-2 py-1 text-left min-w-[80px]">スタッフ</th>
              {days.map(day => {
                const dow = getDay(day)
                return (
                  <th
                    key={day.toISOString()}
                    className={cn(
                      'border px-1 py-1 text-center min-w-[32px]',
                      dow === 0 && 'text-red-500 bg-red-50',
                      dow === 6 && 'text-blue-500 bg-blue-50',
                    )}
                  >
                    <div>{format(day, 'd')}</div>
                    <div className="text-[9px] text-muted-foreground">{format(day, 'E', { locale: ja })}</div>
                  </th>
                )
              })}
              <th className="border px-2 py-1 text-center">提出数</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map(member => {
              const memberRequests = days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                return requestMap.get(`${member.id}:${dateStr}`) ?? null
              })
              const submittedCount = memberRequests.filter(r => r !== null).length

              return (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white border px-2 py-1 font-medium whitespace-nowrap">{member.name}</td>
                  {memberRequests.map((req, i) => {
                    const dateStr = format(days[i], 'yyyy-MM-dd')
                    return (
                      <td
                        key={dateStr}
                        className={cn(
                          'border text-center py-1',
                          req ? AVAIL_STYLE[req.availability] : 'text-gray-200',
                        )}
                        title={req?.note ?? undefined}
                      >
                        {req ? AVAIL_LABEL[req.availability] : ''}
                      </td>
                    )
                  })}
                  <td className="border px-2 py-1 text-center text-muted-foreground">
                    {submittedCount > 0 ? submittedCount : <span className="text-red-400">未提出</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 凡例 */}
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span><span className="font-bold text-blue-700">◎</span> 希望</span>
        <span><span className="text-green-700">○</span> 出勤可</span>
        <span><span className="text-red-400">×</span> 不可</span>
        <span className="text-gray-300">（空白）未回答</span>
      </div>
    </div>
  )
}
