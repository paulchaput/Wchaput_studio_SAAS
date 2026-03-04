'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { PIPELINE_STAGES } from '@/lib/calculations'

const projectSchema = z.object({
  nombre: z.string().min(1, 'El nombre del proyecto es requerido'),
  cliente_nombre: z.string().min(1, 'El cliente es requerido'),
  numero_cotizacion: z.string().optional().nullable(),
  fecha_cotizacion: z.string().optional().nullable(),
  salesperson: z.string().optional().nullable(),
  fecha_entrega_estimada: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
})

export async function createProjectAction(
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
  }

  const parsed = projectSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('projects').insert(parsed.data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/proyectos')
  redirect('/proyectos')
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
  }

  const parsed = projectSchema.safeParse(raw)
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
