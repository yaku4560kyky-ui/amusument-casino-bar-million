import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { BookOpen, BrainCircuit, FileText, Settings } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { departments } from '@/lib/company'
import { readVaultMarkdown } from '@/lib/obsidian'

export const dynamic = 'force-dynamic'

const claudeMemoryDirectory = 'C:\\Users\\yaku4\\.claude\\projects\\C--Users-yaku4-shift-app\\memory'

type NoteEntry = {
  filename: string
  path: string
  content: string | null
  error?: string
}

type LoadResult<T> = {
  items: T[]
  error?: string
}

async function getObsidianProcedureNotes(): Promise<LoadResult<NoteEntry>> {
  const notes = await Promise.all(
    departments.map(async (department) => {
      try {
        const content = await readVaultMarkdown(department.procedurePath)

        return {
          filename: department.title,
          path: department.procedurePath,
          content,
        }
      } catch (error) {
        return {
          filename: department.title,
          path: department.procedurePath,
          content: null,
          error: error instanceof Error ? error.message : 'Obsidian Vault の読み込みに失敗しました。',
        }
      }
    })
  )

  return {
    items: notes.filter((note) => note.content?.trim() || note.error),
  }
}

async function getClaudeMemoryEntries(): Promise<LoadResult<NoteEntry>> {
  let files: string[]

  try {
    const entries = await readdir(claudeMemoryDirectory, { withFileTypes: true })
    files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, 'ja'))
  } catch (error) {
    return {
      items: [],
      error:
        (error as NodeJS.ErrnoException).code === 'ENOENT'
          ? 'Claude Code Memory ディレクトリが見つかりません。'
          : error instanceof Error
            ? error.message
            : 'Claude Code Memory の読み込みに失敗しました。',
    }
  }

  const memories = await Promise.all(
    files.map(async (filename) => {
      const filePath = path.join(claudeMemoryDirectory, filename)

      try {
        return {
          filename,
          path: filePath,
          content: await readFile(filePath, 'utf8'),
        }
      } catch (error) {
        return {
          filename,
          path: filePath,
          content: null,
          error: error instanceof Error ? error.message : 'Memory ファイルの読み込みに失敗しました。',
        }
      }
    })
  )

  return { items: memories }
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-amber-400/20 bg-slate-950/40 p-4 text-sm text-muted-foreground">
      {message}
    </div>
  )
}

function MarkdownList({ entries, emptyMessage }: { entries: NoteEntry[]; emptyMessage: string }) {
  if (entries.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const content = entry.content?.trim()

        return (
          <details
            key={entry.path}
            className="group rounded-lg border border-slate-700/70 bg-slate-950/35"
          >
            <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 text-sm font-medium text-amber-50 transition-colors hover:bg-amber-400/5">
              <FileText className="mt-0.5 size-4 shrink-0 text-amber-300" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{entry.filename}</span>
                <span className="mt-1 block break-all text-xs font-normal text-muted-foreground">
                  {entry.path}
                </span>
              </span>
              <span className="text-xs text-muted-foreground group-open:hidden">表示</span>
              <span className="hidden text-xs text-muted-foreground group-open:inline">閉じる</span>
            </summary>
            <div className="border-t border-slate-700/70 p-4">
              {entry.error ? (
                <EmptyState message={entry.error} />
              ) : content ? (
                <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-lg border border-amber-400/15 bg-slate-950/70 p-4 font-mono text-sm leading-6 text-slate-200 shadow-inner shadow-black/30">
                  {content}
                </pre>
              ) : (
                <EmptyState message="この Markdown ファイルは空です。" />
              )}
            </div>
          </details>
        )
      })}
    </div>
  )
}

export default async function SettingsPage() {
  const [obsidianNotes, claudeMemories] = await Promise.all([
    getObsidianProcedureNotes(),
    getClaudeMemoryEntries(),
  ])

  return (
    <div className="mx-auto max-w-6xl space-y-7 p-6">
      <section className="overflow-hidden rounded-xl border border-amber-400/20 bg-[radial-gradient(circle_at_18%_0%,rgba(251,191,36,0.16),transparent_28rem),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(3,7,18,0.92))] p-6 shadow-2xl shadow-black/30 md:p-8">
        <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.3em] text-amber-200/70">
          <Settings className="size-4" />
          settings
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-amber-100 md:text-5xl">
          設定
        </h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          会社運用に使う Obsidian の業務手順と Claude Code Memory を確認します。
        </p>
      </section>

      <Tabs defaultValue="obsidian" className="space-y-4">
        <TabsList className="bg-slate-950/60">
          <TabsTrigger value="obsidian">
            <BookOpen className="size-4" />
            Obsidian Notes
          </TabsTrigger>
          <TabsTrigger value="claude-memory">
            <BrainCircuit className="size-4" />
            Claude Code Memory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="obsidian">
          <Card className="border-amber-400/15 bg-gradient-to-br from-card to-slate-950/80">
            <CardHeader>
              <CardTitle className="text-amber-100">Obsidian 業務手順ノート</CardTitle>
              <CardDescription>
                lib/obsidian.ts の readVaultMarkdown で読み込める部門別手順書です。
              </CardDescription>
            </CardHeader>
            <CardContent>
              {obsidianNotes.error ? (
                <EmptyState message={obsidianNotes.error} />
              ) : (
                <MarkdownList
                  entries={obsidianNotes.items}
                  emptyMessage="Obsidian Vault から表示できる業務手順ノートが見つかりません。Vault パスを確認してください。"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claude-memory">
          <Card className="border-amber-400/15 bg-gradient-to-br from-card to-slate-950/80">
            <CardHeader>
              <CardTitle className="text-amber-100">Claude Code Memory</CardTitle>
              <CardDescription className="break-all">
                {claudeMemoryDirectory}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {claudeMemories.error ? (
                <EmptyState message={claudeMemories.error} />
              ) : (
                <MarkdownList
                  entries={claudeMemories.items}
                  emptyMessage="Claude Code Memory の Markdown ファイルが見つかりません。"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
