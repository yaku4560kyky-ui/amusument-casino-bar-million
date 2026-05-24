# Codex Task: Phase 3-4 — Kanban Board + Notifications + Voice Input

Working directory: C:\Users\yaku4\amusument-casino-bar-million
Reference codebase: C:\Users\yaku4\shift-app

All UI text must be in Japanese. Dark mode default. Framer Motion animations:
  initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.18}}
Toasts: toast.success() / toast.error() via sonner.

---

## PHASE 3: Kanban Task Board

### Step 3-1: app/(dashboard)/tasks/page.tsx
Server Component. Fetch all active tasks with assignee info:
```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TaskBoardClient from './TaskBoardClient'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: tasks }, { data: profiles }, { data: myProfile }] = await Promise.all([
    supabase.from('operation_tasks')
      .select('*, assignee:profiles(id,name)')
      .eq('is_active', true)
      .order('sort_order'),
    supabase.from('profiles').select('id, name'),
    supabase.from('profiles').select('role').eq('id', user.id).single()
  ])

  return (
    <TaskBoardClient
      initialTasks={tasks ?? []}
      profiles={profiles ?? []}
      isAdmin={myProfile?.role === 'admin'}
      userId={user.id}
    />
  )
}
```

### Step 3-2: app/(dashboard)/tasks/TaskBoardClient.tsx
'use client' Kanban board with 4 columns: todo / in_progress / done / skipped

Use @dnd-kit/core and @dnd-kit/sortable for drag-and-drop between columns.

Columns config:
```typescript
const COLUMNS = [
  { id: 'todo',        label: '未着手',    color: 'bg-slate-500/20 border-slate-500/30' },
  { id: 'in_progress', label: '進行中',    color: 'bg-blue-500/20 border-blue-500/30' },
  { id: 'done',        label: '完了',      color: 'bg-green-500/20 border-green-500/30' },
  { id: 'skipped',     label: 'スキップ',  color: 'bg-yellow-500/20 border-yellow-500/30' },
]
```

Priority colors:
```typescript
const PRIORITY_STYLES = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  high:   'bg-amber-500/20 text-amber-400 border-amber-500/30',
  normal: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  low:    'bg-muted text-muted-foreground border-border',
}
const PRIORITY_LABEL = { urgent: '緊急', high: '高', normal: '普通', low: '低' }
```

Category labels:
```typescript
const CATEGORY_LABEL = {
  opening: 'オープン', during: '営業中', closing: 'クローズ',
  weekly: '週次', monthly: '月次', custom: 'カスタム'
}
```

On drag end between columns:
- Optimistically update local state
- PATCH /api/schedule/tasks/[id] with { kanban_status: newColumn }
- On error: rollback state + toast.error('更新に失敗しました')

Add task button (admin only): opens TaskDialog
Filter bar: by priority, category, assignee (dropdowns)

### Step 3-3: components/tasks/KanbanBoard.tsx
DndContext wrapper with DragOverlay.
```typescript
'use client'
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
// Renders 4 KanbanColumn components
// Manages activeId state for DragOverlay
```

### Step 3-4: components/tasks/KanbanColumn.tsx
SortableContext column. Shows:
- Column header: label + task count badge
- Droppable zone with task cards
- Empty state: "タスクなし"

### Step 3-5: components/tasks/TaskCard.tsx
Draggable card using useSortable. Shows:
- Title (bold)
- Priority badge (colored)
- Category badge
- Assignee name (if set)
- Due date with overdue highlight (red if past today)
- Click to open edit dialog (admin only)

### Step 3-6: components/tasks/TaskDialog.tsx
'use client' Modal for create/edit operation_task.

Fields:
- タイトル (text input) — with VoiceInput button alongside
- カテゴリ (select: opening/during/closing/weekly/monthly/custom)
- 優先度 (select: low/normal/high/urgent)
- 担当者 (select from profiles list, nullable)
- 期限日 (date input, nullable)
- 繰り返し (RecurrenceSelector component if exists, else basic select: none/daily/weekly/monthly)
- メモ (textarea)

On submit:
- POST /api/schedule/tasks (create) or PATCH /api/schedule/tasks/[id] (edit)
- toast.success('タスクを保存しました') on success
- router.refresh() to reload server data

### Step 3-7: components/tasks/TaskFilters.tsx
Filter bar component:
```typescript
interface TaskFiltersProps {
  priorities: string[]
  categories: string[]
  profiles: { id: string, name: string }[]
  value: { priority: string, category: string, assigneeId: string }
  onChange: (filters: { priority: string, category: string, assigneeId: string }) => void
}
```
Three selects: 優先度フィルター / カテゴリフィルター / 担当者フィルター
"すべて" as default option for each.

---

## PHASE 4-A: Voice Input

### Step 4-1: components/voice/VoiceInput.tsx
'use client' Web Speech API component.

```typescript
interface VoiceInputProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}
```

Implementation:
- Button with Mic icon (lucide-react)
- While recording: animated red dot + MicOff icon
- Uses window.SpeechRecognition || window.webkitSpeechRecognition
- lang = 'ja-JP', continuous = false, interimResults = false
- On result: call onTranscript(event.results[0][0].transcript)
- On error: toast.error('音声認識に失敗しました')
- If SpeechRecognition not supported: button shows tooltip "このブラウザは音声入力非対応です" and is disabled

Usage: placed next to title input in TaskDialog and EventDialog (in schedule/).

### Step 4-2: Wire VoiceInput into app/(dashboard)/schedule/CalendarTab.tsx
Find where EventDialog is rendered (or the add event form).
Import VoiceInput and add it next to the title field in the event creation form.
When transcript arrives, append to the title field value.

### Step 4-3: Wire VoiceInput into TaskDialog
Already included in Step 3-6 above.

---

## PHASE 4-B: Notification System

### Step 4-4: app/api/notifications/route.ts
```typescript
// GET: list notifications for current user (paginated, ?page=1&limit=20)
// POST: create notification (internal use, requires service role or auth)
export async function GET(req: Request) {
  // get user, query notifications WHERE user_id = user.id ORDER BY created_at DESC LIMIT 20
  // return { notifications, unreadCount }
}
export async function POST(req: Request) {
  // create notification row
}
```

### Step 4-5: app/api/notifications/[id]/route.ts
```typescript
// PATCH: mark as read { is_read: true }
// DELETE: delete notification
```

### Step 4-6: app/api/notifications/mark-all-read/route.ts
```typescript
// POST: UPDATE notifications SET is_read=true WHERE user_id=user.id AND is_read=false
```

### Step 4-7: app/(dashboard)/notifications/page.tsx
Server Component fetching notifications for current user.
```typescript
import { createClient } from '@/lib/supabase/server'
import NotificationsClient from './NotificationsClient'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)
  return <NotificationsClient initialNotifications={notifications ?? []} />
}
```

### Step 4-8: app/(dashboard)/notifications/NotificationsClient.tsx
'use client' notification list with:
- "すべて既読にする" button → POST /api/notifications/mark-all-read
- Notification items: icon by type, title, body, relative time (date-fns formatDistanceToNow ja locale)
- Unread items highlighted with left border accent
- Click to mark read → PATCH /api/notifications/[id]
- Delete button per notification

Notification type icons (lucide-react):
- task_assigned: UserCheck
- task_due: Clock
- event_reminder: Calendar
- tournament_update: Trophy
- system: Bell
- mention: AtSign

### Step 4-9: components/notifications/NotificationBell.tsx
'use client' bell icon for the Sidebar header.

Uses Supabase Realtime to subscribe to new notifications:
```typescript
const supabase = createBrowserClient(...)
useEffect(() => {
  const channel = supabase
    .channel('notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      setUnreadCount(c => c + 1)
      toast(payload.new.title, { description: payload.new.body })
    })
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}, [userId])
```

Shows Bell icon with red badge showing unread count (if > 0).
Links to /notifications on click.

### Step 4-10: Wire NotificationBell into Sidebar
In components/layout/Sidebar.tsx:
- Import NotificationBell
- Add it to the sidebar header area next to the app title
- Pass userId as prop

### Step 4-11: Trigger notifications from API routes

In app/api/schedule/tasks/route.ts (POST — task creation):
After inserting the task, if assignee_id is set:
```typescript
// Insert notification for the assignee
await supabase.from('notifications').insert({
  user_id: assigneeId,
  type: 'task_assigned',
  title: 'タスクが割り当てられました',
  body: `「${title}」が担当に設定されました`,
  link_url: '/tasks',
  ref_table: 'operation_tasks',
  ref_id: task.id
})
```

In app/api/schedule/tournaments/[id]/route.ts (PATCH — status change):
If status changes, notify all profiles with role='staff':
```typescript
if (body.status && body.status !== existing.status) {
  const { data: staffProfiles } = await supabase.from('profiles').select('id')
  const statusLabel = { planning: '企画中', registration: '参加受付中', active: '開催中', completed: '終了' }
  await supabase.from('notifications').insert(
    staffProfiles.map(p => ({
      user_id: p.id,
      type: 'tournament_update',
      title: `大会ステータス更新: ${tournament.title}`,
      body: `ステータスが「${statusLabel[body.status]}」に変わりました`,
      link_url: '/schedule',
      ref_table: 'exceed_tournaments',
      ref_id: id
    }))
  )
}
```

---

## Step 5: Update Sidebar to show notifications link with unread count

In components/layout/Sidebar.tsx:
- Add NotificationBell component in the header
- Ensure /notifications link is present

---

## Step 6: Final - build check and commit

Run: npm run build
Fix any TypeScript errors.

Then:
git add .
git commit -m "feat: Phase 3-4 - Kanban board, voice input, notifications"
git push origin main
