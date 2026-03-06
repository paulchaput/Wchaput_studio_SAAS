import { createClient } from '@/lib/supabase/server'
import type { Supplier } from '@/lib/types'

// Keep existing getSuppliers() for backwards compat (used by LineItemForm select)
export async function getSuppliers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, nombre')
    .order('nombre')

  if (error) throw error
  return data ?? []
}

// Full supplier list for /proveedores page
export async function getSuppliersAll(): Promise<Supplier[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, nombre, contacto, email, telefono, notas, created_at')
    .order('nombre')
  if (error) throw error
  return data ?? []
}

// Supplier detail — TWO batch queries, no N+1 per project (PROV-03)
// Batch 1 joins through line_item_costs instead of proveedor_id
export async function getSupplierWithDetails(supplierId: string) {
  const supabase = await createClient()

  // Batch 1: all line_item_costs for this supplier, joined to line_items and projects
  const { data: costs, error: costsError } = await supabase
    .from('line_item_costs')
    .select(`
      line_item_id, costo,
      line_items (
        id, cantidad, project_id,
        projects ( id, nombre, cliente_nombre, status )
      )
    `)
    .eq('supplier_id', supplierId)

  if (costsError) throw costsError

  // Batch 2: all supplier payments for this supplier
  const { data: payments, error: pyError } = await supabase
    .from('payments_supplier')
    .select('id, project_id, monto, fecha, notas')
    .eq('supplier_id', supplierId)

  if (pyError) throw pyError

  // Flatten cost rows into line item shape compatible with supplier detail page
  const lineItems = (costs ?? []).map(c => {
    const li = Array.isArray(c.line_items) ? c.line_items[0] : c.line_items
    const project = li ? (Array.isArray(li.projects) ? li.projects[0] : li.projects) : null
    return {
      id: c.line_item_id,
      costo_proveedor: Number(c.costo),
      cantidad: li?.cantidad ?? 1,
      project_id: li?.project_id ?? null,
      projects: project ?? null,
    }
  })

  return {
    lineItems,
    payments: payments ?? [],
  }
}
