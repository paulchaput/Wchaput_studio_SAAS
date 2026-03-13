'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { PIPELINE_STAGES } from '@/lib/calculations'
import { CHECKLIST_SEED } from '@/lib/checklist-tasks'

const createProjectSchema = z.object({
  nombre: z.string().min(1, 'El nombre del proyecto es requerido'),
  cliente_nombre: z.string().min(1, 'El cliente es requerido'),
  fecha_cotizacion: z.string().optional().nullable(),
  salesperson: z.string().optional().nullable(),
  fecha_entrega_estimada: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  include_iva: z.boolean().default(true),
})

const updateProjectSchema = z.object({
  nombre: z.string().min(1, 'El nombre del proyecto es requerido'),
  cliente_nombre: z.string().min(1, 'El cliente es requerido'),
  numero_cotizacion: z.string().optional().nullable(),
  fecha_cotizacion: z.string().optional().nullable(),
  salesperson: z.string().optional().nullable(),
  fecha_entrega_estimada: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  include_iva: z.boolean().default(true),
  descuento_general: z.coerce.number().min(0).max(100).default(0),
})

async function generateNumeroCotizacion(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>
): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `COT-${year}-`
  const { data } = await supabase
    .from('projects')
    .select('numero_cotizacion')
    .like('numero_cotizacion', `${prefix}%`)
    .order('numero_cotizacion', { ascending: false })
    .limit(1)
  let nextNum = 1
  if (data && data.length > 0 && data[0].numero_cotizacion) {
    const last = parseInt(data[0].numero_cotizacion.replace(prefix, ''), 10)
    if (!isNaN(last)) nextNum = last + 1
  }
  return `${prefix}${String(nextNum).padStart(3, '0')}`
}

export async function createProjectAction(
  formData: FormData
): Promise<{ error?: string }> {
  const raw = {
    nombre: formData.get('nombre') as string,
    cliente_nombre: formData.get('cliente_nombre') as string,
    fecha_cotizacion: formData.get('fecha_cotizacion') as string || null,
    salesperson: formData.get('salesperson') as string || null,
    fecha_entrega_estimada: formData.get('fecha_entrega_estimada') as string || null,
    notas: formData.get('notas') as string || null,
    include_iva: formData.get('include_iva') === 'true',
  }

  const parsed = createProjectSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const supabase = await createClient()
  const numero_cotizacion = await generateNumeroCotizacion(supabase)

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({ ...parsed.data, numero_cotizacion })
    .select('id')
    .single()

  if (projectError || !project) {
    return { error: projectError?.message ?? 'Error al crear el proyecto' }
  }

  // Seed checklist milestones
  const tasks = CHECKLIST_SEED.map((task, index) => ({
    project_id: project.id,
    fase: task.fase,
    nombre: task.nombre,
    sort_order: index + 1,
    status: 'Pendiente' as const,
  }))

  const { error: checklistError } = await supabase
    .from('checklist_tasks')
    .insert(tasks)

  if (checklistError) {
    // Non-fatal: project created; log but do not block redirect
    console.error('Checklist seed failed:', checklistError.message)
  }

  revalidatePath('/proyectos')
  redirect('/proyectos/' + project.id)
}

export async function updateProjectAction(
  projectId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const raw = {
    nombre: formData.get('nombre') as string,
    cliente_nombre: formData.get('cliente_nombre') as string,
    numero_cotizacion: formData.get('numero_cotizacion') as string || null,
    fecha_cotizacion: formData.get('fecha_cotizacion') as string || null,
    salesperson: formData.get('salesperson') as string || null,
    fecha_entrega_estimada: formData.get('fecha_entrega_estimada') as string || null,
    notas: formData.get('notas') as string || null,
    include_iva: formData.get('include_iva') === 'true',
    descuento_general: formData.get('descuento_general') as string || '0',
  }

  const parsed = updateProjectSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update(parsed.data)
    .eq('id', projectId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/proyectos')
  revalidatePath('/proyectos/' + projectId)
  redirect('/proyectos/' + projectId)
}

export async function updateProjectStatusAction(
  projectId: string,
  newStatus: string
): Promise<{ error?: string }> {
  if (!(PIPELINE_STAGES as readonly string[]).includes(newStatus)) {
    return { error: `Estado inválido: ${newStatus}` }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({ status: newStatus })
    .eq('id', projectId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/proyectos/' + projectId)
  return {}
}

export async function deleteProjectAction(
  projectId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Delete related records first (cascade may not be set up)
  await supabase.from('checklist_tasks').delete().eq('project_id', projectId)
  await supabase.from('payments_client').delete().eq('project_id', projectId)
  await supabase.from('payments_supplier').delete().eq('project_id', projectId)

  // Delete line_item_costs via line_items
  const { data: lineItems } = await supabase
    .from('line_items')
    .select('id')
    .eq('project_id', projectId)

  if (lineItems && lineItems.length > 0) {
    const ids = lineItems.map(li => li.id)
    await supabase.from('line_item_costs').delete().in('line_item_id', ids)
  }

  await supabase.from('line_items').delete().eq('project_id', projectId)

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/proyectos')
  return {}
}
