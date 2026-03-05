'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const VALID_STATUSES = ['Pendiente', 'En Proceso', 'Completado', 'Bloqueado', 'N/A'] as const

const patchSchema = z.object({
  taskId: z.string().uuid(),
  projectId: z.string().uuid(),
  status: z.enum(VALID_STATUSES).optional(),
  assignee: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
})

export async function updateChecklistTaskAction(
  formData: FormData
): Promise<{ error?: string }> {
  const raw = Object.fromEntries(formData)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { taskId, projectId, ...patch } = parsed.data

  // Only include fields that were actually provided (not undefined)
  const update: Record<string, unknown> = {}
  if (patch.status !== undefined) update.status = patch.status
  if (patch.assignee !== undefined) update.assignee = patch.assignee
  if (patch.due_date !== undefined) update.due_date = patch.due_date

  if (Object.keys(update).length === 0) return {}

  const supabase = await createClient()
  const { error } = await supabase
    .from('checklist_tasks')
    .update(update)
    .eq('id', taskId)

  if (error) return { error: error.message }

  revalidatePath('/proyectos/' + projectId)
  return {}
}
