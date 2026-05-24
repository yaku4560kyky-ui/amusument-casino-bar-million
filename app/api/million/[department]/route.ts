import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDepartmentTable } from '@/lib/department-data'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: Promise<{ department: string }> }
) {
  const { department } = await context.params
  const tableName = getDepartmentTable(department)

  if (!tableName) {
    return NextResponse.json({ error: 'Unknown department' }, { status: 404 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from(tableName)
    .select('id, created_at, data')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ department, table: tableName, records: data ?? [] })
}
