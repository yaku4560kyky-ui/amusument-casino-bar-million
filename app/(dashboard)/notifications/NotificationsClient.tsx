'use client'

import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { AtSign, Bell, Calendar, Clock, Trash2, Trophy, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type NotificationType =
  | 'task_assigned'
  | 'task_due'
  | 'event_reminder'
  | 'tournament_update'
  | 'system'
  | 'mention'

type NotificationItem = {
  id: string
  type: NotificationType
  title: string
  body: string | null
  link_url: string | null
  is_read: boolean
  created_at: string
}

interface NotificationsClientProps {
  initialNotifications: NotificationItem[]
}

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  task_assigned: UserCheck,
  task_due: Clock,
  event_reminder: Calendar,
  tournament_update: Trophy,
  system: Bell,
  mention: AtSign,
}

export default function NotificationsClient({ initialNotifications }: NotificationsClientProps) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const unreadCount = useMemo(
    () => notifications.filter(notification => !notification.is_read).length,
    [notifications]
  )

  async function markRead(id: string) {
    const current = notifications.find(notification => notification.id === id)
    if (!current || current.is_read) return

    setNotifications(items =>
      items.map(notification =>
        notification.id === id ? { ...notification, is_read: true } : notification
      )
    )

    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true }),
      })
      if (!response.ok) throw new Error('failed')
    } catch {
      setNotifications(items =>
        items.map(notification =>
          notification.id === id ? { ...notification, is_read: false } : notification
        )
      )
      toast.error('既読更新に失敗しました')
    }
  }

  async function markAllRead() {
    const before = notifications
    setNotifications(items => items.map(notification => ({ ...notification, is_read: true })))

    try {
      const response = await fetch('/api/notifications/mark-all-read', { method: 'POST' })
      if (!response.ok) throw new Error('failed')
      toast.success('すべて既読にしました')
    } catch {
      setNotifications(before)
      toast.error('既読更新に失敗しました')
    }
  }

  async function deleteNotification(id: string) {
    const before = notifications
    setNotifications(items => items.filter(notification => notification.id !== id))

    try {
      const response = await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('failed')
      toast.success('通知を削除しました')
    } catch {
      setNotifications(before)
      toast.error('通知の削除に失敗しました')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <section className="rounded-xl border border-amber-400/15 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(3,7,18,0.92))] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-amber-200/70">お知らせ</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-100">通知</h1>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-amber-400/20 bg-transparent text-amber-200 hover:bg-amber-400/10"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            すべて既読にする
          </Button>
        </div>
      </section>

      <div className="space-y-3">
        {notifications.length > 0 ? (
          notifications.map(notification => {
            const Icon = TYPE_ICONS[notification.type] ?? Bell
            const content = (
              <div
                className={cn(
                  'rounded-lg border bg-card p-4 transition hover:bg-muted/30',
                  notification.is_read
                    ? 'border-border'
                    : 'border-l-4 border-l-amber-400 border-y-border border-r-border'
                )}
                onClick={() => markRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-amber-400/10 p-2 text-amber-300">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-100">{notification.title}</h2>
                      {!notification.is_read && (
                        <Badge className="bg-amber-400 text-slate-950">未読</Badge>
                      )}
                    </div>
                    {notification.body && (
                      <p className="mt-1 text-sm leading-6 text-slate-400">{notification.body}</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ja,
                      })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    aria-label="通知を削除"
                    onClick={event => {
                      event.preventDefault()
                      event.stopPropagation()
                      deleteNotification(notification.id)
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            )

            return notification.link_url ? (
              <Link key={notification.id} href={notification.link_url}>
                {content}
              </Link>
            ) : (
              <div key={notification.id}>{content}</div>
            )
          })
        ) : (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-slate-400">
            通知はありません
          </div>
        )}
      </div>
    </div>
  )
}
