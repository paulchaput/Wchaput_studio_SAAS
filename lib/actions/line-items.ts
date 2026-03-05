'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Zod schema — margen entered as integer percent (e.g. 50) and transformed to decimal (0.50) for DB storage.
// DEFAULT_MARGEN = 0.50, so default percent = 50. Coercion: 50 → 0.50
const lineItemSchema = z.object({
  project_id: z.string().uuid(),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  referencia: z.string().optional(),
  dimensiones: z.string().optional(),
  cantidad: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
  proveedor_id: z.string().uuid().optional().nullable(),
  costo_proveedor: z.coerce.number().nonnegative('El costo no puede ser negativo'),
  // CRITICAL: User enters "50" for 50% — transform to 0.50 for DB storage.
  // This is the ONLY place where percent→decimal conversion happens.
  margen: z.coerce.number().min(0).max(99).transform(v => v / 100),
})

export async function createLineItemAction(
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = lineItemSchema.safeParse(Object.fromEntries(formData))

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  // Normalize empty optional fields to null
  const payload = {
    ...parsed.data,
    referencia: parsed.data.referencia || null,
    dimensiones: parsed.data.dimensiones || null,
    proveedor_id: parsed.data.proveedor_id || null,
  }

  const supabase = await createClient()
  const { error } = await supabase.from('line_items').insert(payload)

  if (error) return { error: error.message }

  revalidatePath('/proyectos/' + parsed.data.project_id)
  return {}
}

export async function updateLineItemAction(
  lineItemId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = lineItemSchema.safeParse(Object.fromEntries(formData))

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  // Normalize empty optional fields to null
  const payload = {
    ...parsed.data,
    referencia: parsed.data.referencia || null,
    dimensiones: parsed.data.dimensiones || null,
    proveedor_id: parsed.data.proveedor_id || null,
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('line_items')
    .update(payload)
    .eq('id', lineItemId)

  if (error) return { error: error.message }

  revalidatePath('/proyectos/' + parsed.data.project_id)
  return {}
}

export async function deleteLineItemAction(
  formData: FormData
): Promise<{ error?: string }> {
  const lineItemId = formData.get('lineItemId') as string
  const projectId = formData.get('projectId') as string

  if (!lineItemId || !projectId) {
    return { error: 'Datos inválidos para eliminar la partida' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('line_items')
    .delete()
    .eq('id', lineItemId)

  if (error) return { error: error.message }

  revalidatePath('/proyectos/' + projectId)
  return {}
}
