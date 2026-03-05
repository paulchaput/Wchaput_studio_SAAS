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
