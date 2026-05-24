import { differenceInMinutes, addDays, startOfDay, addHours } from 'date-fns'
import type { Break, WageCalculation } from '@/types'

// 深夜時間帯: 22:00 〜 翌 05:00
const NIGHT_START_HOUR = 22
const NIGHT_END_HOUR = 5

function getNightMinutesInSegment(start: Date, end: Date): number {
  if (start >= end) return 0

  let nightMinutes = 0
  let currentDay = startOfDay(start)
  const limit = addDays(startOfDay(end), 1)

  while (currentDay < limit) {
    const nightStart = addHours(currentDay, NIGHT_START_HOUR)
    const nightEnd = addHours(addDays(currentDay, 1), NIGHT_END_HOUR)

    const overlapStart = start > nightStart ? start : nightStart
    const overlapEnd = end < nightEnd ? end : nightEnd

    if (overlapStart < overlapEnd) {
      nightMinutes += differenceInMinutes(overlapEnd, overlapStart)
    }

    currentDay = addDays(currentDay, 1)
  }

  return nightMinutes
}

export function calculateWage(
  clockIn: Date,
  clockOut: Date,
  breaks: Pick<Break, 'break_start' | 'break_end'>[],
  hourlyWage: number,
  nightWageRate: number = 1.25
): WageCalculation {
  const totalMinutes = differenceInMinutes(clockOut, clockIn)

  let breakMinutes = 0
  const completedBreaks = breaks.filter((b) => b.break_end)
  for (const b of completedBreaks) {
    breakMinutes += differenceInMinutes(new Date(b.break_end!), new Date(b.break_start))
  }

  const workedMinutes = Math.max(0, totalMinutes - breakMinutes)

  // 実働時間の深夜分を計算（休憩を除いたセグメントごとに計算）
  let nightMinutes = 0
  let segStart = clockIn

  for (const b of completedBreaks) {
    const segEnd = new Date(b.break_start)
    nightMinutes += getNightMinutesInSegment(segStart, segEnd)
    segStart = new Date(b.break_end!)
  }
  nightMinutes += getNightMinutesInSegment(segStart, clockOut)
  nightMinutes = Math.min(nightMinutes, workedMinutes)

  const regularMinutes = workedMinutes - nightMinutes
  const regularWage = (regularMinutes / 60) * hourlyWage
  const nightPremium = (nightMinutes / 60) * hourlyWage * (nightWageRate - 1)
  const totalWage = regularWage + (nightMinutes / 60) * hourlyWage * nightWageRate

  return {
    totalMinutes,
    breakMinutes,
    workedMinutes,
    nightMinutes,
    regularMinutes,
    regularWage,
    nightPremium,
    totalWage,
  }
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}時間${m.toString().padStart(2, '0')}分`
}

export function formatWage(amount: number): string {
  return `¥${Math.floor(amount).toLocaleString('ja-JP')}`
}
