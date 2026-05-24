'use client'

import { useState } from 'react'
import { FileText, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? 'リクエストに失敗しました')
  }

  return payload
}

export default function ObsidianPanel() {
  const [files, setFiles] = useState<string[]>([])
  const [selectedPath, setSelectedPath] = useState('')
  const [newFileName, setNewFileName] = useState('')
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  async function loadFiles() {
    setIsLoading(true)
    try {
      const payload = await requestJson<{ files: string[] }>(
        '/api/integrations/obsidian/read?dir=.'
      )
      setFiles(payload.files)
      toast.success('ファイル一覧を取得しました')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ファイル一覧の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadFile(path: string) {
    setIsLoading(true)
    try {
      const payload = await requestJson<{ content: string | null }>(
        `/api/integrations/obsidian/read?path=${encodeURIComponent(path)}`
      )
      setSelectedPath(path)
      setContent(payload.content ?? '')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ファイルの読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  async function saveFile(path = selectedPath) {
    if (!path) {
      toast.error('ファイル名を指定してください')
      return
    }

    setIsSaving(true)
    try {
      await requestJson<{ success: true }>('/api/integrations/obsidian/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
      })
      setSelectedPath(path)
      setFiles(current => [...new Set([...current, path])].sort((a, b) => a.localeCompare(b, 'ja')))
      toast.success('保存しました')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  function createFile() {
    const fileName = newFileName.trim()
    if (!fileName) {
      toast.error('新規ファイル名を入力してください')
      return
    }
    const path = fileName.endsWith('.md') ? fileName : `${fileName}.md`
    setSelectedPath(path)
    setContent('')
    void saveFile(path)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-amber-100">Obsidian連携</h3>
          <p className="text-sm text-muted-foreground">VaultのMarkdownを編集します。</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-amber-400/20 bg-transparent text-slate-200 hover:bg-amber-400/10"
          disabled={isLoading}
          onClick={() => void loadFiles()}
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
          ファイル一覧を取得
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/45 p-3">
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">ファイル一覧は未取得です。</p>
          ) : (
            files.map(file => (
              <button
                key={file}
                type="button"
                className="block w-full truncate rounded-md px-2 py-1.5 text-left text-sm text-slate-300 hover:bg-amber-400/10 hover:text-amber-100"
                onClick={() => void loadFile(file)}
              >
                {file}
              </button>
            ))
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="obsidian-path">ファイル</Label>
            <Input
              id="obsidian-path"
              value={selectedPath}
              onChange={event => setSelectedPath(event.target.value)}
              className="border-slate-700 bg-slate-950 text-slate-100"
            />
          </div>
          <Textarea
            value={content}
            onChange={event => setContent(event.target.value)}
            className="min-h-72 border-slate-700 bg-slate-950 font-mono text-sm text-slate-100"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Input
                value={newFileName}
                placeholder="新規ファイル名"
                onChange={event => setNewFileName(event.target.value)}
                className="border-slate-700 bg-slate-950 text-slate-100"
              />
              <Button type="button" variant="secondary" onClick={createFile}>
                作成
              </Button>
            </div>
            <Button
              type="button"
              disabled={isSaving}
              className="bg-amber-400 text-slate-950 hover:bg-amber-300"
              onClick={() => void saveFile()}
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              保存
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
