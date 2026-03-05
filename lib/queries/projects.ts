import { createClient } from '@/lib/supabase/server'
import { calcSubtotal, calcTotal, calcPrecioVenta, calcTotalVenta, calcIVA, calcAnticipo, calcSaldo, calcTotalCosto } from '@/lib/calculations'
import type { QuoteProjectData, QuoteLineItem } from '@/lib/pdf/CotizacionTemplate'
import type { OcLineItem, OcProjectData } from '@/lib/pdf/OrdenCompraTemplate'

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

export async function getProjectForQuote(id: string): Promise<QuoteProjectData | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id, nombre, cliente_nombre, numero_cotizacion,
      fecha_cotizacion, salesperson,
      line_items (
        id, descripcion, referencia, cantidad,
        costo_proveedor, margen
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) return null

  // Map to safe QuoteLineItem — costo_proveedor and margen are used only for calculation, NOT passed forward
  const lineItems: QuoteLineItem[] = (data.line_items ?? []).map(li => {
    const costo = Number(li.costo_proveedor)
    const margen = Number(li.margen)
    const precioVenta = calcPrecioVenta(costo, margen)
    const totalVenta = calcTotalVenta(precioVenta, li.cantidad)
    return {
      descripcion: li.descripcion,
      referencia: li.referencia,
      cantidad: li.cantidad,
      precioVenta,
      totalVenta,
    }
  })

  const subtotal = calcSubtotal(data.line_items ?? [])
  const iva = calcIVA(subtotal)
  const granTotal = calcTotal(subtotal)

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

  // Fetch supplier-filtered line items with supplier contact info
  const { data: items, error: itemsError } = await supabase
    .from('line_items')
    .select(`
      id, descripcion, referencia, dimensiones,
      cantidad, costo_proveedor,
      suppliers ( id, nombre, contacto, email, telefono )
    `)
    .eq('project_id', projectId)
    .eq('proveedor_id', supplierId)

  if (itemsError) return null

  const lineItems: OcLineItem[] = (items ?? []).map(li => {
    const costo = Number(li.costo_proveedor)
    return {
      descripcion: li.descripcion,
      referencia: li.referencia,
      dimensiones: li.dimensiones,
      cantidad: li.cantidad,
      costoProveedor: costo,
      totalCosto: calcTotalCosto(costo, li.cantidad),
    }
  })

  const rawSupplier = items?.[0]?.suppliers
  // Supabase types joined relations as arrays; normalize to single object
  const supplierRow = Array.isArray(rawSupplier) ? rawSupplier[0] : rawSupplier
  if (!supplierRow) return null

  const granTotalCosto = lineItems.reduce((sum, li) => sum + li.totalCosto, 0)

  return {
    projectId,
    projectNombre: project.nombre,
    supplier: {
      nombre: supplierRow.nombre,
      contacto: supplierRow.contacto,
      email: supplierRow.email,
      telefono: supplierRow.telefono,
    },
    fecha: new Date().toISOString().split('T')[0],
    lineItems,
    granTotalCosto,
  }
}
