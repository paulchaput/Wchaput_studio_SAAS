'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { calcSubtotalFromPrecioWithDiscount, calcDescuentoGeneral, calcTotal } from '@/lib/calculations'

const lineItemSchema = z.object({
  project_id: z.string().uuid(),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  referencia: z.string().optional(),
  dimensiones: z.string().optional(),
  cantidad: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
  precio_venta: z.coerce.number().nonnegative('El precio de venta no puede ser negativo'),
  descuento: z.coerce.number().min(0).max(100).default(0),
})

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function syncGranTotal(supabase: SupabaseClient, projectId: string): Promise<void> {
  const { data: items } = await supabase
    .from('line_items')
    .select('precio_venta, cantidad, descuento')
    .eq('project_id', projectId)
  const { data: project } = await supabase
    .from('projects')
    .select('descuento_general')
    .eq('id', projectId)
    .single()
  const subtotal = calcSubtotalFromPrecioWithDiscount(
    (items ?? []).map(li => ({
      precio_venta: Number(li.precio_venta),
      cantidad: li.cantidad,
      descuento: Number(li.descuento ?? 0),
    }))
  )
  const descuentoGeneralPct = Number(project?.descuento_general ?? 0)
  const descuentoGeneralMonto = calcDescuentoGeneral(subtotal, descuentoGeneralPct)
  const subtotalConDescuento = subtotal - descuentoGeneralMonto
  const granTotal = calcTotal(subtotalConDescuento)
  await supabase.from('projects').update({ gran_total: granTotal }).eq('id', projectId)
}

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
  }

  const supabase = await createClient()
  const { error } = await supabase.from('line_items').insert(payload)

  if (error) return { error: error.message }

  await syncGranTotal(supabase, parsed.data.project_id)
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
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('line_items')
    .update(payload)
    .eq('id', lineItemId)

  if (error) return { error: error.message }

  await syncGranTotal(supabase, parsed.data.project_id)
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

  await syncGranTotal(supabase, projectId)
  revalidatePath('/proyectos/' + projectId)
  return {}
}

const lineItemCostSchema = z.object({
  line_item_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  costo: z.coerce.number().nonnegative('El costo no puede ser negativo'),
})

export async function createLineItemCostAction(
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = lineItemCostSchema.safeParse(Object.fromEntries(formData))

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('line_item_costs').insert({
    line_item_id: parsed.data.line_item_id,
    supplier_id: parsed.data.supplier_id,
    costo: parsed.data.costo,
  })

  if (error) return { error: error.message }

  // Fetch project_id via line_items
  const { data: lineItem } = await supabase
    .from('line_items')
    .select('project_id')
    .eq('id', parsed.data.line_item_id)
    .single()

  if (lineItem?.project_id) {
    await syncGranTotal(supabase, lineItem.project_id)
    revalidatePath('/proyectos/' + lineItem.project_id)
  }

  return {}
}

export async function deleteLineItemCostAction(
  formData: FormData
): Promise<{ error?: string }> {
  const costRowId = formData.get('costRowId') as string
  const lineItemId = formData.get('lineItemId') as string

  if (!costRowId || !lineItemId) {
    return { error: 'Datos requeridos para eliminar el costo' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('line_item_costs')
    .delete()
    .eq('id', costRowId)

  if (error) return { error: error.message }

  // Fetch project_id via line_items
  const { data: lineItem } = await supabase
    .from('line_items')
    .select('project_id')
    .eq('id', lineItemId)
    .single()

  if (lineItem?.project_id) {
    await syncGranTotal(supabase, lineItem.project_id)
    revalidatePath('/proyectos/' + lineItem.project_id)
  }

  return {}
}
