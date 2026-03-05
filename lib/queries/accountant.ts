// lib/queries/accountant.ts — Accountant read-only financial queries and pure helpers
// IMPORTANT: These functions NEVER query line_items (RLS blocks accountant access).
// gran_total is read from projects.gran_total column, updated by admin Server Actions.

import { calcTotalPagadoCliente } from '@/lib/calculations'
import { createClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectLike {
  id: string
  nombre: string
  cliente_nombre: string
  gran_total: number | string
  payments_client: Array<{ monto: number | string }>
}

interface SupplierPaymentLike {
  supplier_id: string
  monto: number | string
  fecha: string
  tipo?: string
}

interface SupplierLike {
  id: string
  nombre: string
}

interface ClientPaymentLike {
  monto: number | string
  fecha: string
  tipo: string
}

interface SupplierCashPaymentLike {
  monto: number | string
  fecha: string
}

export interface AccountantProjectSummary {
  id: string
  nombre: string
  clienteNombre: string
  granTotal: number    // from projects.gran_total column — NOT computed from line_items
  collected: number    // sum of payments_client.monto
  outstanding: number  // granTotal - collected
}

export interface AccountantSupplierTotal {
  supplierId: string
  supplierNombre: string
  totalPagado: number  // sum of payments_supplier.monto for this supplier
}

export interface AccountantCashFlowEntry {
  fecha: string
  tipo: 'cliente' | 'proveedor'
  monto: number
  label: string        // payment tipo for client (anticipo/finiquito/otro), 'Pago proveedor' for supplier
}

// ─── Pure helper: aggregateAccountantProjects ─────────────────────────────────

/**
 * Maps raw Supabase project rows to AccountantProjectSummary objects.
 * Reads gran_total directly from the project column — never computed from line_items.
 * Exported for unit testing.
 */
export function aggregateAccountantProjects(projects: ProjectLike[]): AccountantProjectSummary[] {
  return projects.map((p) => {
    const granTotal = Number(p.gran_total)
    const normalizedPayments = (p.payments_client ?? []).map((pay) => ({
      monto: Number(pay.monto),
    }))
    const collected = calcTotalPagadoCliente(normalizedPayments)
    const outstanding = granTotal - collected

    return {
      id: p.id,
      nombre: p.nombre,
      clienteNombre: p.cliente_nombre,
      granTotal,
      collected,
      outstanding,
    }
  })
}

// ─── Pure helper: aggregateSupplierTotals ────────────────────────────────────

/**
 * Groups payments_supplier by supplier_id, sums monto per supplier, joins supplier nombre.
 * Only includes suppliers that have received at least one payment.
 * Exported for unit testing.
 */
export function aggregateSupplierTotals(
  payments: SupplierPaymentLike[],
  suppliers: SupplierLike[]
): AccountantSupplierTotal[] {
  // Build lookup map for supplier names
  const supplierMap = new Map<string, string>()
  for (const s of suppliers) {
    supplierMap.set(s.id, s.nombre)
  }

  // Group and sum payments by supplier_id
  const totalsMap = new Map<string, number>()
  for (const pay of payments) {
    const current = totalsMap.get(pay.supplier_id) ?? 0
    totalsMap.set(pay.supplier_id, current + Number(pay.monto))
  }

  // Map to result array (only suppliers with payments)
  const result: AccountantSupplierTotal[] = []
  for (const [supplierId, totalPagado] of totalsMap.entries()) {
    const supplierNombre = supplierMap.get(supplierId) ?? 'Proveedor desconocido'
    result.push({ supplierId, supplierNombre, totalPagado })
  }

  return result
}

// ─── Pure helper: aggregateCashFlow ──────────────────────────────────────────

/**
 * Merges client and supplier payments into a single list sorted by fecha ascending.
 * Client entries have tipo='cliente', supplier entries have tipo='proveedor'.
 * Exported for unit testing.
 */
export function aggregateCashFlow(
  clientPayments: ClientPaymentLike[],
  supplierPayments: SupplierCashPaymentLike[]
): AccountantCashFlowEntry[] {
  const clientEntries: AccountantCashFlowEntry[] = clientPayments.map((p) => ({
    fecha: p.fecha,
    tipo: 'cliente',
    monto: Number(p.monto),
    label: p.tipo,
  }))

  const supplierEntries: AccountantCashFlowEntry[] = supplierPayments.map((p) => ({
    fecha: p.fecha,
    tipo: 'proveedor',
    monto: Number(p.monto),
    label: 'Pago proveedor',
  }))

  const merged = [...clientEntries, ...supplierEntries]
  merged.sort((a, b) => a.fecha.localeCompare(b.fecha))

  return merged
}

// ─── Server query: getAccountantProjectSummaries ─────────────────────────────

/**
 * Returns all non-Cerrado projects with their payment summaries.
 * NEVER queries line_items — reads gran_total from projects column.
 * Accountant RLS enforces this at DB level as well.
 */
export async function getAccountantProjectSummaries(): Promise<AccountantProjectSummary[]> {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('id, nombre, cliente_nombre, gran_total, payments_client ( monto )')
    .neq('status', 'Cerrado')
    .order('created_at', { ascending: false })

  return aggregateAccountantProjects((projects ?? []) as ProjectLike[])
}

// ─── Server query: getAccountantSupplierTotals ───────────────────────────────

/**
 * Returns total paid to each supplier (cash-basis — sum of payments_supplier.monto).
 * Only includes suppliers that have received at least one payment.
 * NEVER queries line_items.
 */
export async function getAccountantSupplierTotals(): Promise<AccountantSupplierTotal[]> {
  const supabase = await createClient()

  const [paymentsRes, suppliersRes] = await Promise.all([
    supabase.from('payments_supplier').select('supplier_id, monto, fecha'),
    supabase.from('suppliers').select('id, nombre'),
  ])

  return aggregateSupplierTotals(
    (paymentsRes.data ?? []) as SupplierPaymentLike[],
    (suppliersRes.data ?? []) as SupplierLike[]
  )
}

// ─── Server query: getAccountantCashFlow ─────────────────────────────────────

/**
 * Returns all client and supplier payments merged and sorted by fecha ascending.
 * NEVER queries line_items.
 */
export async function getAccountantCashFlow(): Promise<AccountantCashFlowEntry[]> {
  const supabase = await createClient()

  const [clientRes, supplierRes] = await Promise.all([
    supabase.from('payments_client').select('monto, fecha, tipo'),
    supabase.from('payments_supplier').select('monto, fecha'),
  ])

  return aggregateCashFlow(
    (clientRes.data ?? []) as ClientPaymentLike[],
    (supplierRes.data ?? []) as SupplierCashPaymentLike[]
  )
}
