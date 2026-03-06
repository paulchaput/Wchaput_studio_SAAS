// lib/calculations.ts — Pure financial formula functions
// All formulas operate on gross margin (not markup).

export const IVA_RATE = 0.16
export const DEFAULT_MARGEN = 0.50

export const PIPELINE_STAGES = [
  'Prospecto',
  'Cotizado',
  'Anticipo Recibido',
  'En Producción',
  'Entregado',
  'Cerrado',
] as const

export type PipelineStage = typeof PIPELINE_STAGES[number]

/**
 * Calculates sale price using gross margin formula.
 * precioVenta = costo / (1 - margen)
 *
 * Example: calcPrecioVenta(100, 0.50) === 200
 * A 50% gross margin means cost is 50% of the sale price, so sale price = cost / 0.5 = 200.
 *
 * @throws Error if margen >= 1 (would result in division by zero or negative price)
 */
export function calcPrecioVenta(costo: number, margen: number): number {
  if (margen >= 1) {
    throw new Error(`margen must be less than 1, received ${margen}`)
  }
  return costo / (1 - margen)
}

/**
 * Total sale revenue for a single line item.
 */
export function calcTotalVenta(precioVenta: number, cantidad: number): number {
  return precioVenta * cantidad
}

/**
 * Total cost for a single line item.
 */
export function calcTotalCosto(costo: number, cantidad: number): number {
  return costo * cantidad
}

/**
 * Subtotal (sum of all line item sale prices × quantities).
 * This is the pre-IVA total revenue.
 */
export function calcSubtotal(
  items: Array<{ costo_proveedor: number; margen: number; cantidad: number }>
): number {
  return items.reduce((sum, item) => {
    const precio = calcPrecioVenta(item.costo_proveedor, item.margen)
    return sum + calcTotalVenta(precio, item.cantidad)
  }, 0)
}

/**
 * IVA amount from subtotal.
 */
export function calcIVA(subtotal: number): number {
  return subtotal * IVA_RATE
}

/**
 * Grand total including IVA.
 */
export function calcTotal(subtotal: number): number {
  return subtotal + calcIVA(subtotal)
}

/**
 * Total cost across all line items in a project.
 */
export function calcTotalCostoProyecto(
  items: Array<{ costo_proveedor: number; cantidad: number }>
): number {
  return items.reduce((sum, item) => sum + calcTotalCosto(item.costo_proveedor, item.cantidad), 0)
}

/**
 * Gross profit (excludes IVA).
 * utilidad = subtotal - totalCosto
 */
export function calcUtilidad(subtotal: number, totalCosto: number): number {
  return subtotal - totalCosto
}

// Payment rate constants (PAY-02 — never inline these literals)
export const ANTICIPO_RATE = 0.70
export const SALDO_RATE = 0.30

/** Expected anticipo = 70% of grand total */
export function calcAnticipo(granTotal: number): number {
  return granTotal * ANTICIPO_RATE
}

/** Expected saldo (finiquito) = 30% of grand total */
export function calcSaldo(granTotal: number): number {
  return granTotal * SALDO_RATE
}

/** Total collected from client payments */
export function calcTotalPagadoCliente(
  payments: Array<{ monto: number }>
): number {
  return payments.reduce((sum, p) => sum + Number(p.monto), 0)
}

/** Outstanding client balance = granTotal - totalPagado */
export function calcSaldoPendienteCliente(
  granTotal: number,
  totalPagado: number
): number {
  return granTotal - totalPagado
}

/** Total paid to a supplier (across payments) */
export function calcTotalPagadoProveedor(
  payments: Array<{ monto: number }>
): number {
  return payments.reduce((sum, p) => sum + Number(p.monto), 0)
}

/** Outstanding supplier balance = totalOwed - totalPagado */
export function calcSaldoProveedor(
  totalOwed: number,
  totalPagado: number
): number {
  return totalOwed - totalPagado
}

// ============================================================
// Phase 7 — Multi-supplier cost model
// ============================================================

/**
 * Total cost from all line_item_costs rows for a line item.
 * Replaces the old single costo_proveedor column.
 * COST-02: sum of all supplier costs
 */
export function calcTotalCostoFromCosts(costs: Array<{ costo: number }>): number {
  return costs.reduce((sum, c) => sum + Number(c.costo), 0)
}

/**
 * Gross margin derived from price and total cost.
 * Returns 0 when precioVenta <= 0 (division-by-zero guard).
 * COST-04: margin = (precioVenta - totalCosto) / precioVenta
 */
export function calcMargenFromPrecio(precioVenta: number, totalCosto: number): number {
  if (precioVenta <= 0) return 0
  return (precioVenta - totalCosto) / precioVenta
}

/**
 * Subtotal (pre-IVA revenue) computed from precio_venta × cantidad per line item.
 * Replaces calcSubtotal once all callers are migrated (Plan 02).
 * COST-05: sum of (precio_venta × cantidad) per line item
 */
export function calcSubtotalFromPrecio(items: Array<{ precio_venta: number; cantidad: number }>): number {
  return items.reduce((sum, item) => sum + item.precio_venta * item.cantidad, 0)
}
