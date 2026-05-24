'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Bell,
  Calendar,
  CheckSquare,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import NotificationBell from '@/components/notifications/NotificationBell'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

const links = [
  { href: '/', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/schedule', label: 'スケジュール', icon: Calendar },
  { href: '/tasks', label: 'タスク', icon: CheckSquare },
  { href: '/notifications', label: '通知', icon: Bell },
  { href: '/settings', label: '設定', icon: Settings },
]

const adminLinks = [
  { href: '/admin', label: '管理者ダッシュボード', icon: Shield },
  { href: '/admin/users', label: 'スタッフ管理', icon: Users },
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const navLinks = profile.role === 'admin' ? [...links, ...adminLinks] : links

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('ログアウトしました')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-full w-64 flex-col border-r border-border bg-card text-card-foreground shadow-xl max-md:static max-md:h-auto max-md:w-full">
      <div className="border-b border-border p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">運営管理</p>
            <h1 className="mt-1 text-2xl font-semibold text-amber-300">Million & EXCEED</h1>
          </div>
          <NotificationBell userId={profile.id} />
        </div>
        <p className="mt-4 text-sm font-medium">{profile.name}</p>
        <p className="text-xs text-muted-foreground">
          {profile.role === 'admin' ? '管理者' : profile.position ?? 'スタッフ'}
        </p>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'text-amber-300'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-lg bg-amber-400/10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                />
              )}
              <Icon size={18} className="relative z-10" />
              <span className="relative z-10">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3 space-y-1">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs text-muted-foreground">テーマ</span>
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut size={18} />
          ログアウト
        </button>
      </div>
    </aside>
  )
}
