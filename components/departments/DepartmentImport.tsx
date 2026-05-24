'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DepartmentImportProps {
  department: string
}

export default function DepartmentImport({ department }: DepartmentImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  async function handleImport() {
    if (!file) {
      toast.error('インポートするファイルを選択してください')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    setIsImporting(true)

    try {
      const response = await fetch(`/api/import/${department}`, {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error ?? 'インポートに失敗しました')
      }

      toast.success(`${result.count}件のデータをインポートしました`)
      setFile(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'インポートに失敗しました')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>DBインポート</CardTitle>
        <CardDescription>
          CSVまたはJSONファイルをアップロードして、この部門のSupabaseテーブルへ取り込みます。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-2">
            <Label htmlFor={`${department}-import-file`}>インポートファイル</Label>
            <Input
              id={`${department}-import-file`}
              type="file"
              accept=".csv,.json,text/csv,application/json"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <Button onClick={handleImport} disabled={isImporting} className="sm:w-auto">
            <Upload className="mr-2 size-4" />
            {isImporting ? 'インポート中' : 'インポート'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
