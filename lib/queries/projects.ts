import { createClient } from '@/lib/supabase/server'
import { calcSubtotal, calcTotal, calcPrecioVenta, calcTotalVenta, calcIVA, calcAnticipo, calcSaldo } from '@/lib/calculations'
import type { QuoteProjectData, QuoteLineItem } from '@/lib/pdf/CotizacionTemplate'

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
