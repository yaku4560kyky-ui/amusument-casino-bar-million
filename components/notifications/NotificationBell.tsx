'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface NotificationBellProps {
  userId: string
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let isMounted = true

    async function loadUnreadCount() {
      const response = await fetch('/api/notifications?limit=1')
      if (!response.ok) return
      const payload = (await response.json()) as { unreadCount?: number }
      if (isMounted) setUnreadCount(payload.unreadCount ?? 0)
    }

    loadUnreadCount()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          const notification = payload.new as { title?: string; body?: string | null }
          setUnreadCount(count => count + 1)
          toast(notification.title ?? '通知', { description: notification.body ?? undefined })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return (
    <Button
      render={<Link href="/notifications" />}
      variant="ghost"
      size="icon-sm"
      className="relative text-amber-200 hover:bg-amber-400/10 hover:text-amber-100"
      aria-label="通知"
    >
      <Bell className="size-4" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-[10px] leading-4 text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Button>
  )
}
