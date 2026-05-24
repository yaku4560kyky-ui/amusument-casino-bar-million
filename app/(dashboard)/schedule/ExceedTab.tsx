"use client"

import { FormEvent, useMemo, useState } from "react"
import { differenceInCalendarDays, format, parseISO } from "date-fns"
import {
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  MapPin,
  Minus,
  Plus,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type {
  ExceedPhase,
  ExceedTask,
  ExceedTournament,
  TournamentStatus,
} from "@/types/schedule"

const STATUS_CONFIG: Record<
  TournamentStatus,
  { label: string; className: string }
> = {
  planning: {
    label: "企画中",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  registration: {
    label: "受付中",
    className: "border-green-500/30 bg-green-500/10 text-green-300",
  },
  active: {
    label: "開催中",
    className: "border-green-400/40 bg-green-400/15 text-green-200",
  },
  completed: {
    label: "終了",
    className: "border-muted-foreground/20 bg-muted/30 text-muted-foreground",
  },
}

const PHASE_CONFIG: Record<ExceedPhase, { label: string }> = {
  pre: { label: "前日準備" },
  day: { label: "当日" },
  post: { label: "事後処理" },
}

const PHASES = Object.keys(PHASE_CONFIG) as ExceedPhase[]
const STATUSES = Object.keys(STATUS_CONFIG) as TournamentStatus[]

type AddTournamentPayload = {
  title: string
  tournament_date: string
  start_time: string | null
  max_participants: number
  venue_notes: string | null
  notes: string | null
  withTemplate: boolean
}

interface ExceedTabProps {
  tournaments: ExceedTournament[]
  today: string
  staffProfiles: Array<{ id: string; name: string }>
  onCompleteTask: (taskId: string) => void | Promise<void>
  onUncompleteTask: (taskId: string) => void | Promise<void>
  onAddTournament: (tournament: AddTournamentPayload) => void | Promise<void>
  onUpdateParticipants: (
    tournamentId: string,
    participants: number
  ) => void | Promise<void>
  onUpdateStatus: (
    tournamentId: string,
    status: TournamentStatus
  ) => void | Promise<void>
  onGenerateTemplateTasks: (tournamentId: string) => void | Promise<void>
  isAdmin: boolean
}

type AddFormData = {
  title: string
  tournament_date: string
  start_time: string
  max_participants: string
  venue_notes: string
  notes: string
  withTemplate: boolean
}

function getValue<T>(source: unknown, key: string, fallback: T): T {
  const value = (source as Record<string, unknown>)[key]
  return value == null ? fallback : (value as T)
}

function getString(source: unknown, key: string, fallback = "") {
  const value = (source as Record<string, unknown>)[key]
  return typeof value === "string" ? value : fallback
}

function getNumber(source: unknown, key: string, fallback = 0) {
  const value = (source as Record<string, unknown>)[key]
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function getTournamentId(tournament: ExceedTournament) {
  return getString(tournament, "id")
}

function getTournamentDate(tournament: ExceedTournament) {
  return getString(tournament, "tournament_date")
}

function getTournamentStatus(tournament: ExceedTournament) {
  return getValue<TournamentStatus>(tournament, "status", "planning")
}

function getTasks(tournament: ExceedTournament) {
  return getValue<ExceedTask[]>(tournament, "tasks", [])
}

function getTaskId(task: ExceedTask) {
  return getString(task, "id")
}

function getCountdown(tournamentDate: string, today: string) {
  const days = differenceInCalendarDays(parseISO(tournamentDate), parseISO(today))

  if (days < 0) {
    return {
      days,
      label: "終了",
      className: "border-muted-foreground/20 bg-muted/30 text-muted-foreground",
    }
  }

  if (days === 0) {
    return {
      days,
      label: "今日開催!",
      className:
        "animate-pulse border-green-400/40 bg-green-400/15 text-green-200",
    }
  }

  if (days === 1) {
    return {
      days,
      label: "明日開催!",
      className: "border-amber-400/40 bg-amber-400/15 text-amber-200",
    }
  }

  if (days <= 7) {
    return {
      days,
      label: `あと${days}day`,
      className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    }
  }

  return {
    days,
    label: `あと${days}days`,
    className: "border-muted-foreground/20 bg-muted/30 text-muted-foreground",
  }
}

function formatDate(date: string) {
  return format(parseISO(date), "yyyy/MM/dd")
}

function isTaskCompleted(task: ExceedTask) {
  return Boolean(getValue(task, "completed", false))
}

function ExceedTab({
  tournaments,
  today,
  staffProfiles,
  onCompleteTask,
  onUncompleteTask,
  onAddTournament,
  onUpdateParticipants,
  onUpdateStatus,
  onGenerateTemplateTasks,
  isAdmin,
}: ExceedTabProps) {
  const [selectedPhase, setSelectedPhase] = useState<Record<string, ExceedPhase>>(
    {}
  )
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [addFormData, setAddFormData] = useState<AddFormData>({
    title: "",
    tournament_date: today,
    start_time: "",
    max_participants: "20",
    venue_notes: "",
    notes: "",
    withTemplate: true,
  })

  const sortedTournaments = useMemo(() => {
    return [...tournaments].sort((a, b) => {
      const aDate = getTournamentDate(a)
      const bDate = getTournamentDate(b)
      const aStatus = getTournamentStatus(a)
      const bStatus = getTournamentStatus(b)
      const aUpcoming =
        differenceInCalendarDays(parseISO(aDate), parseISO(today)) >= 0 &&
        aStatus !== "completed"
      const bUpcoming =
        differenceInCalendarDays(parseISO(bDate), parseISO(today)) >= 0 &&
        bStatus !== "completed"

      if (aUpcoming !== bUpcoming) {
        return aUpcoming ? -1 : 1
      }

      if (aUpcoming && bUpcoming) {
        return parseISO(aDate).getTime() - parseISO(bDate).getTime()
      }

      return parseISO(bDate).getTime() - parseISO(aDate).getTime()
    })
  }, [today, tournaments])

  const nextTournament = useMemo(() => {
    return sortedTournaments.find((tournament) => {
      const days = differenceInCalendarDays(
        parseISO(getTournamentDate(tournament)),
        parseISO(today)
      )
      return days >= 0 && getTournamentStatus(tournament) !== "completed"
    })
  }, [sortedTournaments, today])

  const resetAddForm = () => {
    setAddFormData({
      title: "",
      tournament_date: today,
      start_time: "",
      max_participants: "20",
      venue_notes: "",
      notes: "",
      withTemplate: true,
    })
  }

  const handleSubmitAddTournament = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const title = addFormData.title.trim()
    const tournamentDate = addFormData.tournament_date
    const maxParticipants = Number(addFormData.max_participants)

    if (!title || !tournamentDate) {
      toast.error("大会名と開催日は必須です")
      return
    }

    await onAddTournament({
      title,
      tournament_date: tournamentDate,
      start_time: addFormData.start_time || null,
      max_participants:
        Number.isFinite(maxParticipants) && maxParticipants > 0
          ? maxParticipants
          : 20,
      venue_notes: addFormData.venue_notes.trim() || null,
      notes: addFormData.notes.trim() || null,
      withTemplate: addFormData.withTemplate,
    })

    toast.success("大会を追加しました")
    setIsAddDialogOpen(false)
    resetAddForm()
  }

  const toggleNotes = (tournamentId: string) => {
    setExpandedNotes((current) => {
      const next = new Set(current)
      if (next.has(tournamentId)) {
        next.delete(tournamentId)
      } else {
        next.add(tournamentId)
      }
      return next
    })
  }

  const handleTaskToggle = async (task: ExceedTask) => {
    const taskId = getTaskId(task)
    if (!taskId) return

    if (isTaskCompleted(task)) {
      await onUncompleteTask(taskId)
      return
    }

    await onCompleteTask(taskId)
  }

  return (
    <div className="space-y-5 text-slate-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-300">
            <Trophy className="size-4" />
            EXCEED
          </div>
          <h2 className="mt-1 text-xl font-semibold text-slate-50">
            ポーカートーナメント管理
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            登録スタッフ {staffProfiles.length}名
          </p>
        </div>

        {isAdmin && (
          <Button
            type="button"
            className="border-purple-400/30 bg-purple-500/15 text-purple-100 hover:bg-purple-500/25"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="size-4" />
            大会を追加
          </Button>
        )}
      </div>

      <Card className="border border-purple-500/20 bg-gradient-to-r from-purple-900/30 to-amber-900/20 shadow-lg shadow-purple-950/20">
        <CardContent className="px-5 py-5">
          {nextTournament ? (
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-purple-400/30 bg-purple-500/15 text-purple-200">
                    次回大会
                  </Badge>
                  <Badge className={STATUS_CONFIG[getTournamentStatus(nextTournament)].className}>
                    {STATUS_CONFIG[getTournamentStatus(nextTournament)].label}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-slate-50">
                    {getString(nextTournament, "title", "EXCEED Tournament")}
                  </h3>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                    <Calendar className="size-4 text-amber-300" />
                    {formatDate(getTournamentDate(nextTournament))}
                  </div>
                </div>
              </div>
              <div className="text-left md:text-right">
                <div className="text-4xl font-bold text-amber-300">
                  {getCountdown(getTournamentDate(nextTournament), today).label}
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  million EXCEED 進行管理
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-slate-300">
              <Calendar className="size-5 text-purple-300" />
              <span className="text-lg font-medium">大会予定なし</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {sortedTournaments.map((tournament) => {
          const tournamentId = getTournamentId(tournament)
          const tournamentDate = getTournamentDate(tournament)
          const status = getTournamentStatus(tournament)
          const countdown = getCountdown(tournamentDate, today)
          const phase = selectedPhase[tournamentId] ?? "pre"
          const allTasks = getTasks(tournament)
          const phaseTasks = allTasks.filter(
            (task) => getValue<ExceedPhase>(task, "phase", "pre") === phase
          )
          const completedTasks = phaseTasks.filter(isTaskCompleted).length
          const totalTasks = phaseTasks.length
          const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
          const currentParticipants =
            getNumber(tournament, "current_participants") ||
            getNumber(tournament, "participant_count") ||
            getNumber(tournament, "participants_count")
          const maxParticipants = getNumber(tournament, "max_participants", 20)
          const startTime = getString(tournament, "start_time")
          const venueNotes = getString(tournament, "venue_notes")
          const notes = getString(tournament, "notes")
          const isCompleted = status === "completed" || countdown.days < 0
          const notesOpen = expandedNotes.has(tournamentId)

          return (
            <Card
              key={tournamentId}
              className={cn(
                "border border-slate-800 bg-slate-950/80 shadow-lg shadow-black/20",
                isCompleted && "opacity-60"
              )}
            >
              <CardHeader className="gap-3 border-b border-slate-800/80 pb-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-300">
                      <Trophy className="size-4" />
                      EXCEED
                    </div>
                    <CardTitle className="truncate text-lg text-slate-50">
                      {getString(tournament, "title", "EXCEED Tournament")}
                    </CardTitle>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                      <Calendar className="size-4 text-amber-300" />
                      {formatDate(tournamentDate)}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isAdmin ? (
                      <Select
                        value={status}
                        onValueChange={(value) =>
                          onUpdateStatus(tournamentId, value as TournamentStatus)
                        }
                      >
                        <SelectTrigger className="border-slate-700 bg-slate-900 text-slate-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
                          {STATUSES.map((statusKey) => (
                            <SelectItem key={statusKey} value={statusKey}>
                              {STATUS_CONFIG[statusKey].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={STATUS_CONFIG[status].className}>
                        {STATUS_CONFIG[status].label}
                      </Badge>
                    )}
                    <Badge className={countdown.className}>
                      {countdown.label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 px-5 py-5">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                    <Users className="size-4 text-amber-300" />
                    <span className="text-sm text-slate-300">
                      参加者 {currentParticipants}/{maxParticipants}
                    </span>
                    {isAdmin && (
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          className="text-slate-300 hover:bg-slate-800"
                          onClick={() =>
                            onUpdateParticipants(
                              tournamentId,
                              Math.max(0, currentParticipants - 1)
                            )
                          }
                        >
                          <Minus className="size-3" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          className="text-slate-300 hover:bg-slate-800"
                          onClick={() =>
                            onUpdateParticipants(
                              tournamentId,
                              Math.min(maxParticipants, currentParticipants + 1)
                            )
                          }
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {startTime && (
                    <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                      <Clock className="size-4 text-amber-300" />
                      <span className="text-sm text-slate-300">
                        開始 {startTime}
                      </span>
                    </div>
                  )}

                  {venueNotes && (
                    <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                      <MapPin className="size-4 text-amber-300" />
                      <span className="truncate text-sm text-slate-300">
                        {venueNotes}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex rounded-lg border border-slate-800 bg-slate-900/60 p-1">
                  {PHASES.map((phaseKey) => (
                    <Button
                      key={phaseKey}
                      type="button"
                      variant="ghost"
                      className={cn(
                        "flex-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                        phase === phaseKey &&
                          "bg-purple-500/20 text-purple-100 hover:bg-purple-500/20"
                      )}
                      onClick={() =>
                        setSelectedPhase((current) => ({
                          ...current,
                          [tournamentId]: phaseKey,
                        }))
                      }
                    >
                      {PHASE_CONFIG[phaseKey].label}
                    </Button>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <CheckSquare className="size-4 text-purple-300" />
                      {PHASE_CONFIG[phase].label}タスク
                    </div>
                    <span className="text-sm text-slate-400">
                      {completedTasks}/{totalTasks} 完了
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-amber-400 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {totalTasks === 0 && isAdmin ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-full border-dashed border-purple-500/40 bg-purple-500/5 text-purple-200 hover:bg-purple-500/15"
                      onClick={() => onGenerateTemplateTasks(tournamentId)}
                    >
                      <ClipboardList className="size-4" />
                      テンプレートでタスクを生成
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      {phaseTasks.map((task) => {
                        const done = isTaskCompleted(task)
                        const taskTitle = getString(task, "title", "タスク")
                        const taskDescription = getString(task, "description")

                        return (
                          <div
                            key={getTaskId(task)}
                            className="flex gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3"
                          >
                            <Button
                              type="button"
                              size="icon-lg"
                              variant="ghost"
                              className={cn(
                                "size-11 border border-slate-700 text-slate-500 hover:bg-slate-800",
                                done &&
                                  "border-purple-400/40 bg-purple-500/20 text-purple-100 hover:bg-purple-500/25"
                              )}
                              onClick={() => handleTaskToggle(task)}
                            >
                              {done && <Check className="size-5" />}
                            </Button>
                            <div className="min-w-0 flex-1">
                              <div
                                className={cn(
                                  "font-medium text-slate-100",
                                  done && "text-slate-500 line-through"
                                )}
                              >
                                {taskTitle}
                              </div>
                              {taskDescription && (
                                <p className="mt-1 text-sm text-slate-400">
                                  {taskDescription}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {notes && (
                  <div className="rounded-lg border border-slate-800 bg-slate-900/50">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-slate-200"
                      onClick={() => toggleNotes(tournamentId)}
                    >
                      <span>メモ</span>
                      {notesOpen ? (
                        <ChevronUp className="size-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="size-4 text-slate-400" />
                      )}
                    </button>
                    {notesOpen && (
                      <div className="border-t border-slate-800 px-4 py-3 text-sm leading-6 whitespace-pre-wrap text-slate-400">
                        {notes}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {isAdmin && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-lg border border-slate-800 bg-slate-950 text-slate-100">
            <form onSubmit={handleSubmitAddTournament} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-50">
                  <Sparkles className="size-4 text-purple-300" />
                  EXCEED大会を追加
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  新しいポーカートーナメントの基本情報を入力してください。
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exceed-title">大会名</Label>
                  <Input
                    id="exceed-title"
                    required
                    value={addFormData.title}
                    className="border-slate-700 bg-slate-900 text-slate-100"
                    onChange={(event) =>
                      setAddFormData((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="exceed-date">開催日</Label>
                    <Input
                      id="exceed-date"
                      type="date"
                      required
                      value={addFormData.tournament_date}
                      className="border-slate-700 bg-slate-900 text-slate-100"
                      onChange={(event) =>
                        setAddFormData((current) => ({
                          ...current,
                          tournament_date: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exceed-time">開始時間</Label>
                    <Input
                      id="exceed-time"
                      type="time"
                      value={addFormData.start_time}
                      className="border-slate-700 bg-slate-900 text-slate-100"
                      onChange={(event) =>
                        setAddFormData((current) => ({
                          ...current,
                          start_time: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exceed-max">定員</Label>
                  <Input
                    id="exceed-max"
                    type="number"
                    min={1}
                    value={addFormData.max_participants}
                    className="border-slate-700 bg-slate-900 text-slate-100"
                    onChange={(event) =>
                      setAddFormData((current) => ({
                        ...current,
                        max_participants: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exceed-venue">会場メモ</Label>
                  <Input
                    id="exceed-venue"
                    value={addFormData.venue_notes}
                    className="border-slate-700 bg-slate-900 text-slate-100"
                    onChange={(event) =>
                      setAddFormData((current) => ({
                        ...current,
                        venue_notes: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exceed-notes">メモ</Label>
                  <Textarea
                    id="exceed-notes"
                    value={addFormData.notes}
                    className="min-h-24 border-slate-700 bg-slate-900 text-slate-100"
                    onChange={(event) =>
                      setAddFormData((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                  />
                </div>

                <Label className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={addFormData.withTemplate}
                    className="size-4 rounded border-slate-600 bg-slate-950 accent-purple-500"
                    onChange={(event) =>
                      setAddFormData((current) => ({
                        ...current,
                        withTemplate: event.target.checked,
                      }))
                    }
                  />
                  テンプレートタスクを自動生成
                </Label>
              </div>

              <DialogFooter className="border-slate-800 bg-slate-900/80">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  className="bg-purple-500 text-white hover:bg-purple-400"
                >
                  <Plus className="size-4" />
                  追加
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default ExceedTab
