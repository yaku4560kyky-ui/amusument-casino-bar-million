'use client'

import { ChevronRight, ListChecks } from 'lucide-react'
import { useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { DepartmentKpi } from '@/lib/company'

export default function KpiCard({ kpi }: { kpi: DepartmentKpi }) {
  const [open, setOpen] = useState(false)
  const hasPendingDetails = Boolean(kpi.pendingDetails?.length)

  const card = (
    <Card
      className={cn(
        'border-amber-400/10 bg-card/85',
        hasPendingDetails &&
          'cursor-pointer border-amber-300/35 transition-colors hover:border-amber-300/70 hover:bg-card'
      )}
      onClick={hasPendingDetails ? () => setOpen(true) : undefined}
      onKeyDown={
        hasPendingDetails
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setOpen(true)
              }
            }
          : undefined
      }
      role={hasPendingDetails ? 'button' : undefined}
      tabIndex={hasPendingDetails ? 0 : undefined}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardDescription>{kpi.label}</CardDescription>
          {hasPendingDetails && <ChevronRight className="size-4 text-amber-300/80" />}
        </div>
        <CardTitle className="text-4xl font-semibold text-amber-300">{kpi.value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{kpi.note}</p>
      </CardContent>
    </Card>
  )

  if (!hasPendingDetails) {
    return card
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {card}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-100">
            <ListChecks className="size-5 text-amber-300" />
            {kpi.label}
          </DialogTitle>
          <DialogDescription>{kpi.note}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {kpi.pendingDetails?.map((detail) => (
            <li
              key={detail}
              className="rounded-lg border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-sm text-slate-200"
            >
              {detail}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
