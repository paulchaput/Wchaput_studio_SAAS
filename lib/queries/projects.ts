import { createClient } from '@/lib/supabase/server'
import { calcSubtotalFromPrecio, calcTotal, calcTotalCosto, calcIVA, calcAnticipo, calcSaldo } from '@/lib/calculations'
import type { QuoteProjectData, QuoteLineItem } from '@/lib/pdf/CotizacionTemplate'
import type { OcLineItem, OcProjectData } from '@/lib/pdf/OrdenCompraTemplate'

export async function getProjects() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(`id, nombre, cliente_nombre, numero_cotizacion, fecha_cotizacion, status, created_at,
             line_items(precio_venta, cantidad)`)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(p => ({
    ...p,
    subtotal: calcSubtotalFromPrecio(p.line_items ?? []),
    gran_total: calcTotal(calcSubtotalFromPrecio(p.line_items ?? [])),
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
        cantidad, precio_venta, created_at,
        line_item_costs (
          id, costo, supplier_id,
          suppliers ( id, nombre )
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getProjectForQuote(id: string): Promise<QuoteProjectData | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id, nombre, cliente_nombre, numero_cotizacion,
      fecha_cotizacion, salesperson, include_iva,
      line_items (
        id, descripcion, referencia, cantidad,
        precio_venta
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) return null

  // Map to QuoteLineItem using precio_venta directly (no formula calculation)
  const lineItems: QuoteLineItem[] = (data.line_items ?? []).map(li => ({
    descripcion: li.descripcion,
    referencia: li.referencia,
    cantidad: li.cantidad,
    precioVenta: Number(li.precio_venta),
    totalVenta: Number(li.precio_venta) * li.cantidad,
  }))

  const subtotal = calcSubtotalFromPrecio(
    (data.line_items ?? []).map(li => ({ precio_venta: Number(li.precio_venta), cantidad: li.cantidad }))
  )
  const includeIva = data.include_iva ?? true
  const iva = includeIva ? calcIVA(subtotal) : 0
  const granTotal = includeIva ? calcTotal(subtotal) : subtotal

  return {
    id: data.id,
    nombre: data.nombre,
    cliente_nombre: data.cliente_nombre,
    numero_cotizacion: data.numero_cotizacion,
    fecha_cotizacion: data.fecha_cotizacion,
    salesperson: data.salesperson,
    subtotal,
    iva,
    granTotal,
    includeIva,
    anticipo: calcAnticipo(granTotal),
    saldo: calcSaldo(granTotal),
    lineItems,
  }
}

export async function getProjectLineItemsBySupplier(
  projectId: string,
  supplierId: string
): Promise<OcProjectData | null> {
  const supabase = await createClient()

  // Fetch project name
  const { data: project, error: projError } = await supabase
    .from('projects')
    .select('id, nombre')
    .eq('id', projectId)
    .single()

  if (projError || !project) return null

  // Step 1: Fetch all line_items for the project
  const { data: allItems, error: allItemsError } = await supabase
    .from('line_items')
    .select('id, descripcion, referencia, dimensiones, cantidad, precio_venta')
    .eq('project_id', projectId)

  if (allItemsError) return null

  // Step 2: Fetch line_item_costs filtered by supplierId for those line item IDs
  const lineItemIds = (allItems ?? []).map(li => li.id)
  const { data: costs, error: costsError } = lineItemIds.length > 0
    ? await supabase
        .from('line_item_costs')
        .select('line_item_id, costo')
        .eq('supplier_id', supplierId)
        .in('line_item_id', lineItemIds)
    : { data: [], error: null }

  if (costsError) return null

  // Build cost lookup map
  const costByLineItem: Record<string, number> = {}
  for (const c of (costs ?? [])) {
    costByLineItem[c.line_item_id] = Number(c.costo)
  }

  // Step 3: Filter to only line items with a matching cost row
  const filteredItems = (allItems ?? []).filter(li => costByLineItem[li.id] !== undefined)

  if (filteredItems.length === 0) return null

  // Step 4: Fetch supplier info
  const { data: supplierData, error: supplierError } = await supabase
    .from('suppliers')
    .select('id, nombre, contacto, email, telefono')
    .eq('id', supplierId)
    .single()

  if (supplierError || !supplierData) return null

  const lineItems: OcLineItem[] = filteredItems.map(li => {
    const costo = costByLineItem[li.id]
    return {
      descripcion: li.descripcion,
      referencia: li.referencia,
      dimensiones: li.dimensiones,
      cantidad: li.cantidad,
      costoProveedor: costo,
      totalCosto: calcTotalCosto(costo, li.cantidad),
    }
  })

  const granTotalCosto = lineItems.reduce((sum, li) => sum + li.totalCosto, 0)

  return {
    projectId,
    projectNombre: project.nombre,
    supplier: {
      nombre: supplierData.nombre,
      contacto: supplierData.contacto,
      email: supplierData.email,
      telefono: supplierData.telefono,
    },
    fecha: new Date().toISOString().split('T')[0],
    lineItems,
    granTotalCosto,
  }
}
