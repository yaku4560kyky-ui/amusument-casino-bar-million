import DepartmentPage from '@/components/departments/DepartmentPage'
import { getDepartment } from '@/lib/company'

export const dynamic = 'force-dynamic'

export default function ManagerPage() {
  const department = getDepartment('manager')

  if (!department) {
    return null
  }

  return <DepartmentPage department={department} />
}
