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
export async function getSupplierWithDetails(supplierId: string) {
  const supabase = await createClient()

  // Batch 1: all line items for this supplier across all projects
  const { data: lineItems, error: liError } = await supabase
    .from('line_items')
    .select(`
      id, costo_proveedor, cantidad, project_id,
      projects ( id, nombre, cliente_nombre, status )
    `)
    .eq('proveedor_id', supplierId)

  if (liError) throw liError

  // Batch 2: all supplier payments for this supplier
  const { data: payments, error: pyError } = await supabase
    .from('payments_supplier')
    .select('id, project_id, monto, fecha, notas')
    .eq('supplier_id', supplierId)

  if (pyError) throw pyError

  return {
    lineItems: lineItems ?? [],
    payments: payments ?? [],
  }
}
