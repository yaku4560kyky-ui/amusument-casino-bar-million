'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  Calendar,
  CheckSquare,
  LayoutDashboard,
  Menu,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react'

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

export default function MobileNav({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const navLinks = profile.role === 'admin' ? [...links, ...adminLinks] : links

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-lg hover:bg-amber-300 transition-colors"
          aria-label="メニューを開く"
        >
          <Menu className="size-5" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0.1, duration: 0.35 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border shadow-2xl md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-border p-5">
                <div>
                  <p className="text-xs text-muted-foreground">運営管理</p>
                  <h1 className="mt-1 text-xl font-semibold text-amber-300">Million & EXCEED</h1>
                  <p className="mt-2 text-sm font-medium">{profile.name}</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="メニューを閉じる"
                >
                  <X className="size-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                {navLinks.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-amber-400/10 text-amber-300'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon size={18} />
                      {label}
                    </Link>
                  )
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
