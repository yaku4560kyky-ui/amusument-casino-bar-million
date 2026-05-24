'use client'

import { useState } from 'react'
import { Bell, CheckCircle2, Cloud, KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import ObsidianPanel from '@/components/integrations/ObsidianPanel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { NotificationPrefs } from '@/types'

type SettingsClientProps = {
  isAdmin: boolean
  initialNotificationPrefs: NotificationPrefs
  googleConnected: boolean
  notionConnected: boolean
}

export default function SettingsClient({
  isAdmin,
  initialNotificationPrefs,
  googleConnected,
  notionConnected,
}: SettingsClientProps) {
  const [prefs, setPrefs] = useState(initialNotificationPrefs)
  const [isSavingPrefs, setIsSavingPrefs] = useState(false)
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false)
  const [notionApiKey, setNotionApiKey] = useState('')
  const [isSavingNotion, setIsSavingNotion] = useState(false)
  const [isNotionConnected, setIsNotionConnected] = useState(notionConnected)

  async function saveNotificationPrefs() {
    setIsSavingPrefs(true)

    try {
      const response = await fetch('/api/profile/notification-prefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) throw new Error(payload.error ?? '通知設定の保存に失敗しました')
      toast.success('通知設定を保存しました')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '通知設定の保存に失敗しました')
    } finally {
      setIsSavingPrefs(false)
    }
  }

  async function connectGoogle() {
    setIsConnectingGoogle(true)

    try {
      const response = await fetch('/api/integrations/google-calendar/auth')
      const payload = (await response.json().catch(() => ({}))) as {
        url?: string
        error?: string
      }

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? 'Google連携の開始に失敗しました')
      }

      window.location.href = payload.url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Google連携の開始に失敗しました')
      setIsConnectingGoogle(false)
    }
  }

  async function saveNotionConfig() {
    setIsSavingNotion(true)

    try {
      const response = await fetch('/api/integrations/notion/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: notionApiKey }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) throw new Error(payload.error ?? 'Notion設定の保存に失敗しました')
      setIsNotionConnected(true)
      setNotionApiKey('')
      toast.success('Notion設定を保存しました')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Notion設定の保存に失敗しました')
    } finally {
      setIsSavingNotion(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <section className="rounded-xl border border-amber-400/15 bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,0.13),transparent_24rem),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(3,7,18,0.88))] p-6">
        <div className="text-sm font-medium text-amber-200/70">settings</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-100">
          設定
        </h1>
      </section>

      <Card className="border-amber-400/15 bg-gradient-to-br from-card to-slate-950/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-100">
            <Bell className="size-4" />
            通知設定
          </CardTitle>
          <CardDescription>アプリ内、プッシュ、メール通知を切り替えます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            ['in_app', 'アプリ内通知'],
            ['push', 'プッシュ通知'],
            ['email', 'メール通知'],
          ].map(([key, label]) => (
            <Label
              key={key}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/45 px-4 py-3"
            >
              <span>{label}</span>
              <input
                type="checkbox"
                checked={Boolean(prefs[key as keyof NotificationPrefs])}
                className="size-4 rounded border-slate-600 bg-slate-950 accent-amber-400"
                onChange={event =>
                  setPrefs(current => ({
                    ...current,
                    [key]: event.target.checked,
                  }))
                }
              />
            </Label>
          ))}
          <Button
            type="button"
            disabled={isSavingPrefs}
            className="bg-amber-400 text-slate-950 hover:bg-amber-300"
            onClick={() => void saveNotificationPrefs()}
          >
            {isSavingPrefs && <Loader2 className="size-4 animate-spin" />}
            保存
          </Button>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="border-amber-400/15 bg-gradient-to-br from-card to-slate-950/80">
          <CardContent className="pt-4">
            <ObsidianPanel />
          </CardContent>
        </Card>
      )}

      <Card className="border-amber-400/15 bg-gradient-to-br from-card to-slate-950/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-100">
            <Cloud className="size-4" />
            Google連携
          </CardTitle>
          <CardDescription>CalendarとDriveのOAuth連携を管理します。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {googleConnected ? (
            <Badge className="border-green-500/30 bg-green-500/10 text-green-300">
              <CheckCircle2 className="size-3" />
              連携済み
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">未連携</span>
          )}
          <Button
            type="button"
            disabled={isConnectingGoogle}
            className="bg-amber-400 text-slate-950 hover:bg-amber-300"
            onClick={() => void connectGoogle()}
          >
            {isConnectingGoogle && <Loader2 className="size-4 animate-spin" />}
            Googleを連携
          </Button>
        </CardContent>
      </Card>

      <Card className="border-amber-400/15 bg-gradient-to-br from-card to-slate-950/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-100">
            <KeyRound className="size-4" />
            Notion連携
          </CardTitle>
          <CardDescription>Notion APIキーの登録状態を管理します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isNotionConnected ? (
            <Badge className="border-green-500/30 bg-green-500/10 text-green-300">
              <CheckCircle2 className="size-3" />
              連携済み
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">未連携</span>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="password"
              value={notionApiKey}
              placeholder="NOTION_API_KEY"
              className="border-slate-700 bg-slate-950 text-slate-100"
              onChange={event => setNotionApiKey(event.target.value)}
            />
            <Button
              type="button"
              disabled={isSavingNotion}
              className="bg-amber-400 text-slate-950 hover:bg-amber-300"
              onClick={() => void saveNotionConfig()}
            >
              {isSavingNotion && <Loader2 className="size-4 animate-spin" />}
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
