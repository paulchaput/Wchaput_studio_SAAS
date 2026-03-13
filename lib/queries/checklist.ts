import { createClient } from '@/lib/supabase/server'
import type { ChecklistTask } from '@/lib/types'

export async function getChecklistTasks(projectId: string): Promise<ChecklistTask[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('checklist_tasks')
    .select('id, fase, nombre, status, completed_at, sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}
