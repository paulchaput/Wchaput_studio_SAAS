'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const toggleSchema = z.object({
  taskId: z.string().uuid(),
  projectId: z.string().uuid(),
  completed: z.enum(['true', 'false']),
})

export async function toggleChecklistTaskAction(
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = toggleSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { taskId, projectId, completed } = parsed.data
  const isCompleted = completed === 'true'

  const supabase = await createClient()
  const { error } = await supabase
    .from('checklist_tasks')
    .update({
      status: isCompleted ? 'Completado' : 'Pendiente',
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq('id', taskId)

  if (error) return { error: error.message }

  revalidatePath('/proyectos/' + projectId)
  return {}
}
