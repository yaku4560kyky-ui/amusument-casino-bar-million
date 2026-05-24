import Papa from 'papaparse'
import { createServerClient } from '@/lib/supabase/server'
import { getDepartmentTable } from '@/lib/department-data'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeJson(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return item as Record<string, unknown>
      }
      return { value: item }
    })
  }

  if (value && typeof value === 'object') {
    return [value as Record<string, unknown>]
  }

  return [{ value }]
}

function parseCsv(text: string): Record<string, unknown>[] {
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? 'CSVの解析に失敗しました')
  }

  return parsed.data
}

async function parseImportFile(file: File) {
  const text = await file.text()
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith('.json') || file.type === 'application/json') {
    return normalizeJson(JSON.parse(text))
  }

  if (fileName.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel') {
    return parseCsv(text)
  }

  throw new Error('CSVまたはJSONファイルをアップロードしてください')
}

export async function POST(
  request: Request,
  context: { params: Promise<{ department: string }> }
) {
  const { department } = await context.params
  const tableName = getDepartmentTable(department)

  if (!tableName) {
    return Response.json({ error: '指定された部門はインポート対象外です' }, { status: 404 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return Response.json({ error: 'ファイルが選択されていません' }, { status: 400 })
    }

    const records = await parseImportFile(file)

    if (records.length === 0) {
      return Response.json({ error: 'インポートできるデータがありません' }, { status: 400 })
    }

    const rows = records.map((record) => ({
      ...(typeof record.id === 'string' && uuidPattern.test(record.id) ? { id: record.id } : {}),
      data: record,
    }))

    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return Response.json({ error: 'Admin permission required' }, { status: 403 })
    }

    const { error } = await supabase.from(tableName).upsert(rows)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ count: rows.length, table: tableName })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'インポート処理に失敗しました' },
      { status: 400 }
    )
  }
}
