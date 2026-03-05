'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const clientPaymentSchema = z.object({
  project_id: z.string().uuid(),
  tipo: z.enum(['anticipo', 'finiquito', 'otro']),
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
  fecha: z.string().min(1, 'La fecha es requerida'),
  notas: z.string().optional().nullable(),
})

export async function createClientPaymentAction(
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = clientPaymentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('payments_client').insert({
    project_id: parsed.data.project_id,
    tipo: parsed.data.tipo,
    monto: parsed.data.monto,
    fecha: parsed.data.fecha,
    notas: parsed.data.notas || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/proyectos/' + parsed.data.project_id)
  return {}
}

export async function deleteClientPaymentAction(
  formData: FormData
): Promise<{ error?: string }> {
  const paymentId = formData.get('paymentId') as string
  const projectId = formData.get('projectId') as string

  if (!paymentId || !projectId) return { error: 'Datos requeridos' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('payments_client')
    .delete()
    .eq('id', paymentId)

  if (error) return { error: error.message }
  revalidatePath('/proyectos/' + projectId)
  return {}
}
