# Codex Task: Phase 5-7 — Image Upload + Obsidian + External Integrations

Working directory: C:\Users\yaku4\amusument-casino-bar-million
Reference codebase: C:\Users\yaku4\shift-app

All UI text in Japanese. Dark mode default.
Framer Motion: initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.18}}
Toasts: toast.success() / toast.error() via sonner.

---

## PHASE 5: Image Upload & Attachments

### Step 5-1: Create Supabase Storage bucket
Run this SQL via the Supabase JS client in a one-time migration script, OR just implement the API and bucket creation happens on first upload. The bucket name is "uploads". It should be public (for read).

Actually: use the Supabase dashboard REST — implement the upload API to create the bucket if it doesn't exist using supabase.storage.createBucket().

### Step 5-2: app/api/upload/route.ts
POST endpoint for file upload.

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  const refTable = formData.get('ref_table') as string
  const refId = formData.get('ref_id') as string

  // Validate file type (image only)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: '画像ファイルのみアップロード可能です' }, { status: 400 })
  }

  // Validate size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'ファイルサイズは5MB以下にしてください' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()
  const objectPath = `${refTable}/${refId}/${crypto.randomUUID()}.${ext}`

  // Ensure bucket exists
  await supabase.storage.createBucket('uploads', { public: true }).catch(() => {})

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(objectPath, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  // Get public URL
  const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(objectPath)

  // Insert into attachments table
  const { data: attachment, error: dbError } = await supabase.from('attachments').insert({
    bucket: 'uploads',
    object_path: objectPath,
    file_name: file.name,
    content_type: file.type,
    size_bytes: file.size,
    ref_table: refTable,
    ref_id: refId,
    uploaded_by: user.id
  }).select().single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ url: publicUrl, attachment })
}
```

### Step 5-3: app/api/upload/[attachmentId]/route.ts
DELETE endpoint to remove attachment:
```typescript
// Get attachment record, delete from storage, delete from attachments table
```

### Step 5-4: components/image/ImageUpload.tsx
'use client' drag-and-drop upload component.

```typescript
interface ImageUploadProps {
  refTable: string
  refId: string
  onUploaded: (url: string) => void
  disabled?: boolean
}
```

- Drag-and-drop zone with dashed border
- Click to open file picker (accept="image/*")
- Shows upload progress (loading spinner)
- On success: calls onUploaded(url) + toast.success('画像をアップロードしました')
- On error: toast.error(message)
- Uses native fetch + FormData to POST to /api/upload

### Step 5-5: components/image/ImageGallery.tsx
'use client' thumbnail grid.

```typescript
interface ImageGalleryProps {
  urls: string[]
  onDelete?: (url: string) => void
  readonly?: boolean
}
```

- Grid of image thumbnails (3 per row on desktop, 2 on mobile)
- Click thumbnail: opens native <dialog> lightbox with full-size image
- Delete button (×) overlay on each thumbnail (if onDelete provided)
- Smooth open/close animation

### Step 5-6: Wire ImageUpload into TaskDialog
In components/tasks/TaskDialog.tsx:
- Import ImageUpload and ImageGallery
- Add image section below the notes field
- Show ImageGallery for existing image_urls
- Show ImageUpload to add new images
- On upload success: append URL to local image_urls state
- On save: include image_urls in PATCH/POST body

### Step 5-7: Wire ImageUpload into ExceedTab tournament forms
In app/(dashboard)/schedule/ExceedTab.tsx:
- Add image section to TournamentDialog (or inline form)
- Same pattern as TaskDialog

---

## PHASE 6: Obsidian Integration

### Step 6-1: Extend lib/obsidian.ts
Current file at lib/obsidian.ts exists. Read it first, then add these functions:

```typescript
import { writeFile, readdir } from 'fs/promises'

// Add to existing file:

export async function writeVaultMarkdown(relativePath: string, content: string): Promise<void> {
  const filePath = resolveVaultPath(relativePath)  // MUST use existing resolveVaultPath for safety
  await writeFile(filePath, content, 'utf8')
}

export async function listVaultDirectory(relativeDir: string): Promise<string[]> {
  const dirPath = resolveVaultPath(relativeDir)
  const entries = await readdir(dirPath, { withFileTypes: true })
  return entries
    .filter(e => e.isFile() && e.name.endsWith('.md'))
    .map(e => e.name)
}
```

### Step 6-2: app/api/integrations/obsidian/read/route.ts
```typescript
import { createClient } from '@/lib/supabase/server'
import { readVaultMarkdown, listVaultDirectory } from '@/lib/obsidian'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  // Check admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: '管理者のみ利用可能です' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path')
  const dir = searchParams.get('dir')

  try {
    if (dir) {
      const files = await listVaultDirectory(dir)
      return NextResponse.json({ files })
    }
    if (path) {
      const content = await readVaultMarkdown(path)
      return NextResponse.json({ content })
    }
    return NextResponse.json({ error: 'path または dir パラメータが必要です' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ファイル読み込みエラー'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

### Step 6-3: app/api/integrations/obsidian/write/route.ts
```typescript
import { createClient } from '@/lib/supabase/server'
import { writeVaultMarkdown } from '@/lib/obsidian'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: '管理者のみ利用可能です' }, { status: 403 })

  const { path, content } = await req.json()
  if (!path || content === undefined) {
    return NextResponse.json({ error: 'path と content が必要です' }, { status: 400 })
  }

  try {
    await writeVaultMarkdown(path, content)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ファイル書き込みエラー'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

### Step 6-4: components/integrations/ObsidianPanel.tsx
'use client' panel for Settings page.

UI:
- Section header: "Obsidian連携"
- "ファイル一覧を取得" button → GET /api/integrations/obsidian/read?dir=.
- File list (click to load content)
- Markdown textarea editor (show loaded content)
- "保存" button → POST /api/integrations/obsidian/write
- "新規ファイル名" input + "作成" button

### Step 6-5: Wire ObsidianPanel into Settings page
In app/(dashboard)/settings/page.tsx:
- Import ObsidianPanel
- Add it as a card section in the settings page
- Only show if user is admin

---

## PHASE 7: External Integrations (Notion + Google Calendar + Google Drive)

### Step 7-1: Install packages
Run: npm install @notionhq/client googleapis
(These may already be in package.json — check first, skip if already installed)

### Step 7-2: lib/notion.ts
```typescript
import { Client } from '@notionhq/client'

function getNotionClient() {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) throw new Error('NOTION_API_KEY が設定されていません')
  return new Client({ auth: apiKey })
}

export async function createNotionPage(params: {
  databaseId: string
  title: string
  properties?: Record<string, unknown>
}) {
  const notion = getNotionClient()
  return notion.pages.create({
    parent: { database_id: params.databaseId },
    properties: {
      Name: { title: [{ text: { content: params.title } }] },
      ...params.properties,
    },
  })
}

export async function updateNotionPage(pageId: string, properties: Record<string, unknown>) {
  const notion = getNotionClient()
  return notion.pages.update({ page_id: pageId, properties })
}
```

### Step 7-3: app/api/integrations/notion/sync/route.ts
```typescript
import { createClient } from '@/lib/supabase/server'
import { createNotionPage, updateNotionPage } from '@/lib/notion'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { type, id } = await req.json()
  // type: 'task' | 'event' | 'tournament'

  const tableMap = { task: 'operation_tasks', event: 'operation_events', tournament: 'exceed_tournaments' }
  const dbIdMap = {
    task: process.env.NOTION_DATABASE_ID_TASKS,
    event: process.env.NOTION_DATABASE_ID_EVENTS,
    tournament: process.env.NOTION_DATABASE_ID_TOURNAMENTS
  }

  const table = tableMap[type as keyof typeof tableMap]
  const dbId = dbIdMap[type as keyof typeof dbIdMap]
  if (!table || !dbId) return NextResponse.json({ error: '無効なタイプです' }, { status: 400 })

  const { data: record, error } = await supabase.from(table).select('*').eq('id', id).single()
  if (error || !record) return NextResponse.json({ error: 'レコードが見つかりません' }, { status: 404 })

  try {
    let notionPageId = record.notion_page_id
    if (notionPageId) {
      await updateNotionPage(notionPageId, {
        Name: { title: [{ text: { content: record.title } }] }
      })
    } else {
      const page = await createNotionPage({ databaseId: dbId, title: record.title })
      notionPageId = page.id
      await supabase.from(table).update({ notion_page_id: notionPageId }).eq('id', id)
    }
    return NextResponse.json({ success: true, notion_page_id: notionPageId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Notion同期エラー'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

### Step 7-4: lib/google-calendar.ts
```typescript
import { google } from 'googleapis'

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

export function getAuthUrl() {
  const oauth2Client = getOAuthClient()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/drive.readonly'
    ],
    prompt: 'consent'
  })
}

export async function getCalendarWithTokens(tokens: { access_token: string; refresh_token?: string }) {
  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials(tokens)
  return google.calendar({ version: 'v3', auth: oauth2Client })
}

export async function createCalendarEvent(tokens: { access_token: string; refresh_token?: string }, event: {
  summary: string
  description?: string
  start: string  // ISO date string
  end?: string
}) {
  const calendar = await getCalendarWithTokens(tokens)
  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: { date: event.start },
      end: { date: event.end ?? event.start }
    }
  })
  return res.data
}
```

### Step 7-5: app/api/integrations/google-calendar/auth/route.ts
```typescript
import { getAuthUrl } from '@/lib/google-calendar'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const url = getAuthUrl()
    return NextResponse.json({ url })
  } catch {
    return NextResponse.json({ error: 'Google認証URLの生成に失敗しました' }, { status: 500 })
  }
}
```

### Step 7-6: app/api/integrations/google-calendar/callback/route.ts
```typescript
import { createClient } from '@/lib/supabase/server'
import { getOAuthClient } from '@/lib/google-calendar'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/settings?error=no_code', req.url))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  try {
    const oauth2Client = getOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)

    await supabase.from('integration_configs').upsert({
      user_id: user.id,
      provider: 'google_calendar',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      config_json: {}
    }, { onConflict: 'user_id,provider' })

    return NextResponse.redirect(new URL('/settings?connected=google', req.url))
  } catch {
    return NextResponse.redirect(new URL('/settings?error=oauth_failed', req.url))
  }
}
```

### Step 7-7: app/api/integrations/google-calendar/sync/route.ts
```typescript
import { createClient } from '@/lib/supabase/server'
import { createCalendarEvent } from '@/lib/google-calendar'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { type, id } = await req.json()
  // type: 'event' | 'tournament'

  // Get user's Google Calendar tokens
  const { data: config } = await supabase
    .from('integration_configs')
    .select('access_token, refresh_token')
    .eq('user_id', user.id)
    .eq('provider', 'google_calendar')
    .single()

  if (!config?.access_token) {
    return NextResponse.json({ error: 'Google Calendarが連携されていません' }, { status: 400 })
  }

  const table = type === 'tournament' ? 'exceed_tournaments' : 'operation_events'
  const { data: record } = await supabase.from(table).select('*').eq('id', id).single()
  if (!record) return NextResponse.json({ error: 'レコードが見つかりません' }, { status: 404 })

  try {
    const gcalEvent = await createCalendarEvent(
      { access_token: config.access_token, refresh_token: config.refresh_token ?? undefined },
      {
        summary: record.title,
        description: record.description ?? record.notes ?? '',
        start: record.event_date ?? record.tournament_date,
        end: record.event_date ?? record.tournament_date
      }
    )

    await supabase.from(table).update({ gcal_event_id: gcalEvent.id }).eq('id', id)
    return NextResponse.json({ success: true, gcal_event_id: gcalEvent.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Google Calendar同期エラー'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

### Step 7-8: lib/google-drive.ts
```typescript
import { google } from 'googleapis'
import { getOAuthClient } from './google-calendar'

export async function getDriveFiles(tokens: { access_token: string; refresh_token?: string }, query?: string) {
  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials(tokens)
  const drive = google.drive({ version: 'v3', auth: oauth2Client })
  const res = await drive.files.list({
    q: query ?? "mimeType contains 'image/' and trashed=false",
    fields: 'files(id,name,mimeType,thumbnailLink,webViewLink)',
    pageSize: 20
  })
  return res.data.files ?? []
}
```

### Step 7-9: app/api/integrations/google-drive/route.ts
```typescript
import { createClient } from '@/lib/supabase/server'
import { getDriveFiles } from '@/lib/google-drive'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: config } = await supabase
    .from('integration_configs')
    .select('access_token, refresh_token')
    .eq('user_id', user.id)
    .eq('provider', 'google_calendar')  // reuse same Google OAuth token
    .single()

  if (!config?.access_token) {
    return NextResponse.json({ error: 'Google連携が必要です' }, { status: 400 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') ?? undefined
    const files = await getDriveFiles(
      { access_token: config.access_token, refresh_token: config.refresh_token ?? undefined },
      query
    )
    return NextResponse.json({ files })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Drive取得エラー'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

### Step 7-10: components/integrations/NotionSyncButton.tsx
```typescript
'use client'
// Small button: "Notionに同期"
// Props: type ('task'|'event'|'tournament'), id string, notionPageId?: string
// On click: POST /api/integrations/notion/sync { type, id }
// Shows: loading spinner while syncing
// After sync: shows Notion page link (notion.so/[page_id]) if success
// toast.success('Notionに同期しました') / toast.error(message)
```

### Step 7-11: components/integrations/GoogleCalendarSync.tsx
```typescript
'use client'
// Button: "Google Calendarに追加"
// Props: type ('event'|'tournament'), id string, gcalEventId?: string
// If gcalEventId exists: shows "同期済み" badge
// On click: POST /api/integrations/google-calendar/sync { type, id }
// toast.success('Google Calendarに追加しました') / toast.error(message)
```

### Step 7-12: app/(dashboard)/settings/page.tsx — full settings page
Rebuild this page as a proper settings dashboard with sections:

```typescript
// Server component — get user profile, check integrations
// Pass to SettingsClient
```

Sections to show:
1. **通知設定** — toggles for in_app/push/email notifications
   - Save to profiles.notification_prefs via PATCH /api/profile/notification-prefs
2. **Obsidian連携** (admin only) — ObsidianPanel component
3. **Google連携** — button to connect Google (GET /api/integrations/google-calendar/auth → redirect)
   - Show "連携済み" if integration_configs row exists for google_calendar
4. **Notion連携** — input for NOTION_API_KEY (store in integration_configs.config_json)
   - Show connection status

### Step 7-13: app/api/profile/notification-prefs/route.ts
```typescript
// PATCH: update profiles.notification_prefs for current user
// Body: { in_app: boolean, push: boolean, email: boolean, ... }
```

---

## Final Steps

### Step F-1: npm run build
Fix any TypeScript errors.

### Step F-2: git commit and push
```
git add .
git commit -m "feat: Phase 5-7 - image upload, Obsidian, Notion, Google integrations"
git push origin main
```
