'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, ClipboardList, Trophy } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type {
  EventType,
  ExceedTask,
  ExceedTournament,
  OperationEvent,
  OperationTask,
  TaskCompletion,
  TournamentStatus,
} from '@/types/schedule'
import { EXCEED_TASK_TEMPLATES } from '@/types/schedule'

import CalendarTab from './CalendarTab'
import ExceedTab from './ExceedTab'
import OperationsTab from './OperationsTab'

type StaffProfile = {
  id: string
  name: string
}

type ScheduleTab = 'calendar' | 'operations' | 'exceed'

type AddEventPayload = {
  title: string
  description?: string
  event_date: string
  start_time?: string
  end_time?: string
  event_type: EventType
}

type AddTournamentPayload = {
  title: string
  tournament_date: string
  start_time: string | null
  max_participants: number
  venue_notes: string | null
  notes: string | null
  withTemplate: boolean
}

interface ScheduleClientProps {
  initialEvents: OperationEvent[]
  initialTasks: OperationTask[]
  initialCompletions: TaskCompletion[]
  initialTournaments: ExceedTournament[]
  staffProfiles: StaffProfile[]
  today: string
  isAdmin: boolean
}

const tabs: Array<{ value: ScheduleTab; label: string; icon: typeof CalendarDays }> = [
  { value: 'calendar', label: 'カレンダー', icon: CalendarDays },
  { value: 'operations', label: '通常営業タスク', icon: ClipboardList },
  { value: 'exceed', label: 'EXCEED大会管理', icon: Trophy },
]

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  const payload = (await response.json().catch(() => ({}))) as { error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? 'Request failed')
  }

  return payload as T
}

function sortEvents(events: OperationEvent[]) {
  return [...events].sort((a, b) => {
    const dateCompare = a.event_date.localeCompare(b.event_date)
    if (dateCompare !== 0) return dateCompare
    return (a.start_time ?? '').localeCompare(b.start_time ?? '')
  })
}

function sortTournaments(tournaments: ExceedTournament[]) {
  return [...tournaments].sort((a, b) => b.tournament_date.localeCompare(a.tournament_date))
}

function replaceTournament(
  tournaments: ExceedTournament[],
  tournament: ExceedTournament
) {
  return sortTournaments(
    tournaments.map(current => (current.id === tournament.id ? tournament : current))
  )
}

function updateTournamentTask(
  tournaments: ExceedTournament[],
  task: ExceedTask
) {
  return tournaments.map(tournament => {
    if (tournament.id !== task.tournament_id) return tournament

    const tasks = tournament.tasks ?? []
    return {
      ...tournament,
      tasks: tasks.map(current => (current.id === task.id ? task : current)),
    }
  })
}

export default function ScheduleClient({
  initialEvents,
  initialTasks,
  initialCompletions,
  initialTournaments,
  staffProfiles,
  today,
  isAdmin,
}: ScheduleClientProps) {
  const [activeTab, setActiveTab] = useState<ScheduleTab>('calendar')
  const [events, setEvents] = useState(() => sortEvents(initialEvents))
  const [tasks, setTasks] = useState(initialTasks)
  const [completions, setCompletions] = useState(initialCompletions)
  const [tournaments, setTournaments] = useState(() => sortTournaments(initialTournaments))

  const completedTodayCount = useMemo(
    () =>
      completions.filter(
        completion => completion.completion_date === today && completion.status === 'done'
      ).length,
    [completions, today]
  )

  async function handleAddEvent(data: AddEventPayload) {
    const { event } = await requestJson<{ event: OperationEvent }>('/api/schedule/events', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    setEvents(current => sortEvents([...current, event]))
  }

  async function handleDeleteEvent(id: string) {
    await requestJson<{ ok: true }>(`/api/schedule/events/${id}`, {
      method: 'DELETE',
    })

    setEvents(current => current.filter(event => event.id !== id))
  }

  async function handleCompleteTask(taskId: string) {
    const { completion } = await requestJson<{ completion: TaskCompletion }>(
      `/api/schedule/tasks/${taskId}/complete`,
      {
        method: 'POST',
        body: JSON.stringify({ date: today }),
      }
    )

    setCompletions(current => [
      ...current.filter(
        item => !(item.task_id === taskId && item.completion_date === today)
      ),
      completion,
    ])
  }

  async function handleUncompleteTask(taskId: string) {
    await requestJson<{ ok: true }>(
      `/api/schedule/tasks/${taskId}/complete?date=${encodeURIComponent(today)}`,
      {
        method: 'DELETE',
      }
    )

    setCompletions(current =>
      current.filter(item => !(item.task_id === taskId && item.completion_date === today))
    )
  }

  async function handleAddTask(data: Partial<OperationTask>) {
    const { task } = await requestJson<{ task: OperationTask }>('/api/schedule/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    setTasks(current => [...current, task].sort((a, b) => a.sort_order - b.sort_order))
  }

  async function handleDeleteTask(id: string) {
    await requestJson<{ ok: true }>(`/api/schedule/tasks/${id}`, {
      method: 'DELETE',
    })

    setTasks(current => current.filter(task => task.id !== id))
    setCompletions(current => current.filter(completion => completion.task_id !== id))
  }

  async function handleAddTournament(data: AddTournamentPayload) {
    const { tournament } = await requestJson<{ tournament: ExceedTournament }>(
      '/api/schedule/tournaments',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )

    setTournaments(current => sortTournaments([tournament, ...current]))
  }

  async function handleUpdateParticipants(tournamentId: string, participants: number) {
    const { tournament } = await requestJson<{ tournament: ExceedTournament }>(
      `/api/schedule/tournaments/${tournamentId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ current_participants: Math.max(0, participants) }),
      }
    )

    setTournaments(current => replaceTournament(current, tournament))
  }

  async function handleUpdateStatus(tournamentId: string, status: TournamentStatus) {
    const { tournament } = await requestJson<{ tournament: ExceedTournament }>(
      `/api/schedule/tournaments/${tournamentId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    )

    setTournaments(current => replaceTournament(current, tournament))
  }

  async function handleCompleteExceedTask(taskId: string) {
    const task = tournaments
      .flatMap(tournament => tournament.tasks ?? [])
      .find(candidate => candidate.id === taskId)

    if (!task) return

    const { task: updatedTask } = await requestJson<{ task: ExceedTask }>(
      `/api/schedule/tournaments/${task.tournament_id}/tasks/${taskId}/complete`,
      {
        method: 'POST',
      }
    )

    setTournaments(current => updateTournamentTask(current, updatedTask))
  }

  async function handleUncompleteExceedTask(taskId: string) {
    const task = tournaments
      .flatMap(tournament => tournament.tasks ?? [])
      .find(candidate => candidate.id === taskId)

    if (!task) return

    const { task: updatedTask } = await requestJson<{ task: ExceedTask }>(
      `/api/schedule/tournaments/${task.tournament_id}/tasks/${taskId}/complete`,
      {
        method: 'DELETE',
      }
    )

    setTournaments(current => updateTournamentTask(current, updatedTask))
  }

  async function handleGenerateTemplateTasks(tournamentId: string) {
    const createdTasks = await Promise.all(
      Object.entries(EXCEED_TASK_TEMPLATES).flatMap(([phase, titles]) =>
        titles.map((title, index) =>
          requestJson<{ task: ExceedTask }>(`/api/schedule/tournaments/${tournamentId}/tasks`, {
            method: 'POST',
            body: JSON.stringify({
              phase,
              title,
              assignee_id: null,
              sort_order: index * 10,
              notes: null,
            }),
          })
        )
      )
    )

    setTournaments(current =>
      current.map(tournament => {
        if (tournament.id !== tournamentId) return tournament

        return {
          ...tournament,
          tasks: [...(tournament.tasks ?? []), ...createdTasks.map(({ task }) => task)],
        }
      })
    )
    toast.success('テンプレートタスクを追加しました')
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <section className="rounded-xl border border-amber-400/15 bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,0.13),transparent_24rem),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(3,7,18,0.88))] p-6">
        <div className="text-sm font-medium text-amber-200/70">秘書・スケジュール管理部門</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-100">
          スケジュール管理
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          通常営業タスク・EXCEED大会スケジュールの統合管理
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-amber-400/10 bg-card/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">今月のイベント数</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-amber-100">
            {events.length}
          </CardContent>
        </Card>
        <Card className="border-amber-400/10 bg-card/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">今日の完了タスク</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-amber-100">
            {completedTodayCount}
          </CardContent>
        </Card>
        <Card className="border-amber-400/10 bg-card/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">大会登録数</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-amber-100">
            {tournaments.length}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-amber-400/10 bg-slate-950/45 p-2">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.value

          return (
            <Button
              key={tab.value}
              type="button"
              variant="ghost"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'gap-2 text-slate-300 hover:bg-amber-500/10 hover:text-amber-100',
                isActive && 'bg-amber-500/15 text-amber-100'
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </Button>
          )
        })}
      </div>

      {activeTab === 'calendar' && (
        <CalendarTab
          events={events}
          onAddEvent={handleAddEvent}
          onDeleteEvent={handleDeleteEvent}
          isAdmin={isAdmin}
        />
      )}

      {activeTab === 'operations' && (
        <OperationsTab
          tasks={tasks as never}
          completions={completions as never}
          today={today}
          staffProfiles={staffProfiles}
          onCompleteTask={handleCompleteTask}
          onUncompleteTask={handleUncompleteTask}
          onAddTask={handleAddTask as never}
          onDeleteTask={handleDeleteTask}
          isAdmin={isAdmin}
        />
      )}

      {activeTab === 'exceed' && (
        <ExceedTab
          tournaments={tournaments}
          today={today}
          staffProfiles={staffProfiles}
          onCompleteTask={handleCompleteExceedTask}
          onUncompleteTask={handleUncompleteExceedTask}
          onAddTournament={handleAddTournament}
          onUpdateParticipants={handleUpdateParticipants}
          onUpdateStatus={handleUpdateStatus}
          onGenerateTemplateTasks={handleGenerateTemplateTasks}
          isAdmin={isAdmin}
        />
      )}
    </div>
  )
}
