import { createClient } from '@/lib/supabase/server'
import { calcSubtotal, calcTotal } from '@/lib/calculations'

export async function getProjects() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(`id, nombre, cliente_nombre, numero_cotizacion, fecha_cotizacion, status, created_at,
             line_items(costo_proveedor, margen, cantidad)`)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(p => ({
    ...p,
    subtotal: calcSubtotal(p.line_items ?? []),
    gran_total: calcTotal(calcSubtotal(p.line_items ?? [])),
  }))
}

export async function getProjectById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getProjectWithLineItems(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      line_items (
        id, descripcion, referencia, dimensiones,
        cantidad, costo_proveedor, margen, proveedor_id, created_at,
        suppliers ( id, nombre )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}
