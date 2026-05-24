import type { DepartmentKey } from '@/lib/company'

export const departmentTables: Record<DepartmentKey, string> = {
  manager: 'manager_data',
  schedule: 'schedule_data',
  planning: 'planning_data',
  inventory: 'inventory_data',
  staff: 'staff_data',
  accounting: 'accounting_data',
  marketing: 'marketing_data',
}

export function getDepartmentTable(department: string) {
  return departmentTables[department as DepartmentKey]
}
