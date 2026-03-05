'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const supplierPaymentSchema = z.object({
  project_id: z.string().uuid(),
  supplier_id: z.string().uuid(),  // REQUIRED — not optional (see pitfall 4 in research)
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
  fecha: z.string().min(1, 'La fecha es requerida'),
  notas: z.string().optional().nullable(),
})

export async function createSupplierPaymentAction(
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = supplierPaymentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('payments_supplier').insert({
    project_id: parsed.data.project_id,
    supplier_id: parsed.data.supplier_id,
    monto: parsed.data.monto,
    fecha: parsed.data.fecha,
    notas: parsed.data.notas || null,
  })

  if (error) return { error: error.message }

  // DOUBLE revalidate — project page AND supplier detail page (pitfall 3 in research)
  revalidatePath('/proyectos/' + parsed.data.project_id)
  revalidatePath('/proveedores/' + parsed.data.supplier_id)
  return {}
}

export async function deleteSupplierPaymentAction(
  formData: FormData
): Promise<{ error?: string }> {
  const paymentId = formData.get('paymentId') as string
  const projectId = formData.get('projectId') as string
  const supplierId = formData.get('supplierId') as string

  if (!paymentId || !projectId || !supplierId) return { error: 'Datos requeridos' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('payments_supplier')
    .delete()
    .eq('id', paymentId)

  if (error) return { error: error.message }

  // DOUBLE revalidate on delete too
  revalidatePath('/proyectos/' + projectId)
  revalidatePath('/proveedores/' + supplierId)
  return {}
}
