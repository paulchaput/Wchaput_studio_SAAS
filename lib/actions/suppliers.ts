'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const supplierSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100),
  contacto: z.string().optional().nullable(),
  email: z.string().email('Email inválido').optional().or(z.literal('')).nullable(),
  telefono: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
})

export async function createSupplierAction(
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = supplierSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('suppliers').insert({
    nombre: parsed.data.nombre,
    contacto: parsed.data.contacto || null,
    email: parsed.data.email || null,
    telefono: parsed.data.telefono || null,
    notas: parsed.data.notas || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/proveedores')
  return {}
}

export async function updateSupplierAction(
  formData: FormData
): Promise<{ error?: string }> {
  const supplierId = formData.get('supplierId') as string
  if (!supplierId) return { error: 'ID de proveedor requerido' }

  const parsed = supplierSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('suppliers').update({
    nombre: parsed.data.nombre,
    contacto: parsed.data.contacto || null,
    email: parsed.data.email || null,
    telefono: parsed.data.telefono || null,
    notas: parsed.data.notas || null,
  }).eq('id', supplierId)

  if (error) return { error: error.message }
  revalidatePath('/proveedores')
  revalidatePath('/proveedores/' + supplierId)
  return {}
}

export async function deleteSupplierAction(
  formData: FormData
): Promise<{ error?: string }> {
  const supplierId = formData.get('supplierId') as string
  if (!supplierId) return { error: 'ID de proveedor requerido' }

  const supabase = await createClient()
  const { error } = await supabase.from('suppliers').delete().eq('id', supplierId)

  if (error) return { error: error.message }
  revalidatePath('/proveedores')
  return {}
}
