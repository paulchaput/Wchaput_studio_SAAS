// lib/queries/dashboard.ts — Dashboard aggregation queries and pure helpers

import {
  calcSubtotal,
  calcTotal,
  calcTotalCostoProyecto,
  calcTotalPagadoCliente,
  calcTotalPagadoProveedor,
  PIPELINE_STAGES,
} from '@/lib/calculations'
import { createClient } from '@/lib/supabase/server'
import 'server-only'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItemLike {
  costo_proveedor: number | string
  margen: number | string
  cantidad: number
}

interface PaymentLike {
  monto: number | string
}

interface ProjectLike {
  id: string
  status: string
  line_items: LineItemLike[]
  payments_client: PaymentLike[]
  payments_supplier: PaymentLike[]
}

interface SupplierLineItemLike {
  costo_proveedor: number | string
  cantidad: number
  proveedor_id: string | null
  projects: { status: string } | Array<{ status: string }> | null
  suppliers: { id: string; nombre: string } | Array<{ id: string; nombre: string }> | null
}

interface SupplierPaymentLike {
  supplier_id: string | null
  monto: number | string
}

export interface DashboardKpis {
  activeProjectCount: number
  pipelineValue: number
  totalPendingCliente: number
  totalPendingProveedor: number
}

export type PipelineSummaryCounts = Record<string, number>

export interface SupplierDebtResult {
  Innovika: number
  'El Roble': number
  Otros: number
}

// ─── Pure helper: aggregateDashboardKpis ─────────────────────────────────────

/**
 * Pure aggregation of KPI data from an array of projects.
 * Exported for unit testing — no Supabase dependency.
 */
export function aggregateDashboardKpis(projects: ProjectLike[]): DashboardKpis {
  const active = projects.filter((p) => p.status !== 'Cerrado')

  let pipelineValue = 0
  let totalPendingCliente = 0
  let totalPendingProveedor = 0

  for (const p of active) {
    const normalizedLineItems = (p.line_items ?? []).map((li) => ({
      costo_proveedor: Number(li.costo_proveedor),
      margen: Number(li.margen),
      cantidad: li.cantidad,
    }))
    const normalizedClientPayments = (p.payments_client ?? []).map((pay) => ({
      monto: Number(pay.monto),
    }))
    const normalizedSupplierPayments = (p.payments_supplier ?? []).map((pay) => ({
      monto: Number(pay.monto),
    }))

    const subtotal = calcSubtotal(normalizedLineItems)
    const granTotal = calcTotal(subtotal)
    const totalCosto = calcTotalCostoProyecto(normalizedLineItems)
    const pagadoCliente = calcTotalPagadoCliente(normalizedClientPayments)
    const pagadoProveedor = calcTotalPagadoProveedor(normalizedSupplierPayments)

    pipelineValue += granTotal
    totalPendingCliente += granTotal - pagadoCliente
    totalPendingProveedor += totalCosto - pagadoProveedor
  }

  return {
    activeProjectCount: active.length,
    pipelineValue,
    totalPendingCliente,
    totalPendingProveedor,
  }
}

// ─── Pure helper: aggregatePipelineSummary ───────────────────────────────────

/**
 * Counts projects per pipeline stage. All 6 stages are always present in the result
 * (stages with zero projects show value 0). Exported for unit testing.
 */
export function aggregatePipelineSummary(
  projects: Array<{ id: string; status: string }>
): PipelineSummaryCounts {
  const counts: PipelineSummaryCounts = {}
  PIPELINE_STAGES.forEach((stage) => {
    counts[stage] = 0
  })
  for (const p of projects) {
    if (counts[p.status] !== undefined) {
      counts[p.status]++
    }
  }
  return counts
}

// ─── Pure helper: aggregateSupplierDebt ──────────────────────────────────────

/**
 * Buckets outstanding supplier debt into Innovika, El Roble, and Otros.
 * Excludes Cerrado projects. Applies Number() coercion for NUMERIC strings.
 * Exported for unit testing.
 */
export function aggregateSupplierDebt(
  lineItems: SupplierLineItemLike[],
  supplierPayments: SupplierPaymentLike[]
): SupplierDebtResult {
  // Build owed map keyed by supplier_id
  const owedBySupplier: Record<string, { nombre: string; owed: number; paid: number }> = {}

  for (const li of lineItems) {
    // Normalize projects relation (may be array or object from Supabase)
    const proj = Array.isArray(li.projects) ? li.projects[0] : li.projects
    if (!proj || proj.status === 'Cerrado') continue

    const supplierId = li.proveedor_id ?? 'unknown'

    // Normalize suppliers relation (may be array or object from Supabase)
    const supplierRaw = Array.isArray(li.suppliers) ? li.suppliers[0] : li.suppliers
    const nombre = supplierRaw?.nombre ?? 'Sin proveedor'

    if (!owedBySupplier[supplierId]) {
      owedBySupplier[supplierId] = { nombre, owed: 0, paid: 0 }
    }
    owedBySupplier[supplierId].owed += Number(li.costo_proveedor) * li.cantidad
  }

  // Accumulate payments by supplier
  for (const pay of supplierPayments) {
    const id = pay.supplier_id ?? 'unknown'
    if (owedBySupplier[id]) {
      owedBySupplier[id].paid += Number(pay.monto)
    }
  }

  // Bucket into named groups
  const result: SupplierDebtResult = { Innovika: 0, 'El Roble': 0, Otros: 0 }
  for (const v of Object.values(owedBySupplier)) {
    const outstanding = v.owed - v.paid
    if (v.nombre === 'Innovika') {
      result.Innovika += outstanding
    } else if (v.nombre === 'El Roble') {
      result['El Roble'] += outstanding
    } else {
      result.Otros += outstanding
    }
  }

  return result
}

// ─── Types for monthly financials and cash flow ───────────────────────────────

export interface MonthlyDataPoint {
  mes: string        // e.g. "mar. 26" (es-MX short month + 2-digit year)
  ingresos: number   // subtotal (pre-IVA sale revenue) for that month
  costos: number     // total supplier cost for that month
  utilidad: number   // ingresos - costos
}

export interface CashFlowEntry {
  fecha: string      // ISO date string e.g. "2026-03-15"
  tipo: 'entrada' | 'salida'
  monto: number
  label: string      // e.g. "anticipo", "Pago proveedor"
}

interface MonthlyProjectLike {
  fecha_cotizacion: string
  line_items: Array<{ costo_proveedor: number | string; margen: number | string; cantidad: number }>
}

interface ClientPaymentLike {
  fecha_pago: string | null
  monto: number | string
  tipo: string
}

interface SupplierPaymentCashFlowLike {
  fecha_pago: string | null
  monto: number | string
}

// ─── Pure helper: aggregateMonthlyFinancials ──────────────────────────────────

/**
 * Builds a 6-month window of monthly revenue/cost/profit data.
 * Months with no projects always appear with 0 values.
 * Exported for unit testing — no Supabase dependency.
 */
export function aggregateMonthlyFinancials(
  projects: MonthlyProjectLike[],
  today: Date = new Date()
): MonthlyDataPoint[] {
  // Build the 6-month window keys: from 5 months ago to current month
  const months: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getFullYear(), today.getMonth() - i, 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    months.push(key)
  }

  // Initialize buckets for each month
  const buckets: Record<string, { ingresos: number; costos: number }> = {}
  for (const m of months) {
    buckets[m] = { ingresos: 0, costos: 0 }
  }

  // Aggregate project data into monthly buckets
  for (const project of projects) {
    if (!project.fecha_cotizacion) continue
    const monthKey = project.fecha_cotizacion.substring(0, 7) // "2026-03"
    if (!buckets[monthKey]) continue // outside 6-month window

    for (const li of project.line_items) {
      const costo = Number(li.costo_proveedor)
      const margen = Number(li.margen)
      const cantidad = Number(li.cantidad)
      // precio unitario = costo / (1 - margen) [gross margin formula]
      const precio = margen < 1 ? costo / (1 - margen) : 0
      buckets[monthKey].ingresos += precio * cantidad
      buckets[monthKey].costos += costo * cantidad
    }
  }

  // Format month labels as "mar. 26" (es-MX short month + 2-digit year)
  return months.map((key) => {
    const [yearStr, monthStr] = key.split('-')
    const d = new Date(Date.UTC(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1))
    const mes = d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    const ingresos = buckets[key].ingresos
    const costos = buckets[key].costos
    return {
      mes,
      ingresos,
      costos,
      utilidad: ingresos - costos,
    }
  })
}

// ─── Pure helper: aggregateCashFlow ──────────────────────────────────────────

/**
 * Merges client (entrada) and supplier (salida) payments into a 30-day window.
 * Filters by today (inclusive) to today+30 (inclusive). Sorts ascending by fecha.
 * Exported for unit testing — no Supabase dependency.
 */
export function aggregateCashFlow(
  clientPayments: ClientPaymentLike[],
  supplierPayments: SupplierPaymentCashFlowLike[],
  today: Date = new Date()
): CashFlowEntry[] {
  // Calculate window bounds as ISO date strings for string comparison
  // Use UTC methods to avoid timezone off-by-one issues
  const todayYear = today.getUTCFullYear()
  const todayMonth = today.getUTCMonth()
  const todayDay = today.getUTCDate()
  const todayUTC = new Date(Date.UTC(todayYear, todayMonth, todayDay))
  const todayISO = todayUTC.toISOString().substring(0, 10)
  const futureDate = new Date(Date.UTC(todayYear, todayMonth, todayDay + 30))
  const futureISO = futureDate.toISOString().substring(0, 10)

  const entries: CashFlowEntry[] = []

  for (const p of clientPayments) {
    if (!p.fecha_pago) continue
    if (p.fecha_pago < todayISO || p.fecha_pago > futureISO) continue
    entries.push({
      fecha: p.fecha_pago,
      tipo: 'entrada',
      monto: Number(p.monto),
      label: p.tipo ?? 'Pago cliente',
    })
  }

  for (const p of supplierPayments) {
    if (!p.fecha_pago) continue
    if (p.fecha_pago < todayISO || p.fecha_pago > futureISO) continue
    entries.push({
      fecha: p.fecha_pago,
      tipo: 'salida',
      monto: Number(p.monto),
      label: 'Pago proveedor',
    })
  }

  // Sort ascending by fecha
  entries.sort((a, b) => a.fecha.localeCompare(b.fecha))

  return entries
}

// ─── Server query: getDashboardKpis ──────────────────────────────────────────

/**
 * Fetches all projects with line_items and payments, then delegates aggregation
 * to the pure aggregateDashboardKpis helper.
 */
export async function getDashboardKpis(): Promise<DashboardKpis> {
  const supabase = await createClient()

  const { data: projects } = await supabase.from('projects').select(`
    id, status,
    line_items ( costo_proveedor, margen, cantidad ),
    payments_client ( monto ),
    payments_supplier ( monto )
  `)

  return aggregateDashboardKpis((projects ?? []) as ProjectLike[])
}

// ─── Server query: getPipelineSummary ────────────────────────────────────────

/**
 * Fetches project statuses and returns count per pipeline stage.
 */
export async function getPipelineSummary(): Promise<PipelineSummaryCounts> {
  const supabase = await createClient()

  const { data: projects } = await supabase.from('projects').select('id, status')

  return aggregatePipelineSummary((projects ?? []) as Array<{ id: string; status: string }>)
}

// ─── Server query: getSupplierDebtBreakdown ───────────────────────────────────

/**
 * Fetches line_items (with supplier and project status) plus all supplier payments,
 * then delegates to aggregateSupplierDebt for bucketing.
 */
export async function getSupplierDebtBreakdown(): Promise<SupplierDebtResult> {
  const supabase = await createClient()

  const [lineItemsRes, paymentsRes] = await Promise.all([
    supabase.from('line_items').select(`
      costo_proveedor, cantidad, proveedor_id,
      projects ( status ),
      suppliers ( id, nombre )
    `),
    supabase.from('payments_supplier').select('supplier_id, monto'),
  ])

  return aggregateSupplierDebt(
    (lineItemsRes.data ?? []) as SupplierLineItemLike[],
    (paymentsRes.data ?? []) as SupplierPaymentLike[]
  )
}

// ─── Server query: getMonthlyFinancials ──────────────────────────────────────

/**
 * Fetches all projects with their line_items and delegates to
 * aggregateMonthlyFinancials to produce a 6-month revenue/cost/profit breakdown.
 */
export async function getMonthlyFinancials(): Promise<MonthlyDataPoint[]> {
  const supabase = await createClient()

  const { data: projects } = await supabase.from('projects').select(`
    fecha_cotizacion,
    line_items ( costo_proveedor, margen, cantidad )
  `)

  return aggregateMonthlyFinancials((projects ?? []) as MonthlyProjectLike[])
}

// ─── Server query: getCashFlowProjection ─────────────────────────────────────

/**
 * Fetches client and supplier payments within the 30-day window and delegates
 * to aggregateCashFlow to produce a dated cash flow projection.
 */
export async function getCashFlowProjection(): Promise<CashFlowEntry[]> {
  const supabase = await createClient()
  const today = new Date()
  const todayISO = today.toISOString().substring(0, 10)
  const futureDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + 30))
  const futureISO = futureDate.toISOString().substring(0, 10)

  const [clientRes, supplierRes] = await Promise.all([
    supabase
      .from('payments_client')
      .select('fecha_pago, monto, tipo')
      .gte('fecha_pago', todayISO)
      .lte('fecha_pago', futureISO),
    supabase
      .from('payments_supplier')
      .select('fecha_pago, monto')
      .gte('fecha_pago', todayISO)
      .lte('fecha_pago', futureISO),
  ])

  return aggregateCashFlow(
    (clientRes.data ?? []) as ClientPaymentLike[],
    (supplierRes.data ?? []) as SupplierPaymentCashFlowLike[],
    today
  )
}
