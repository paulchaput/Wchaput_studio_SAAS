'use client'

import { calcSubtotalFromPrecio, calcIVA, calcTotal, calcUtilidad } from '@/lib/calculations'
import { formatMXN } from '@/lib/formatters'
import { Separator } from '@/components/ui/separator'

interface LineItemCostLike {
  costo: number
}

interface LineItemLike {
  precio_venta: number
  cantidad: number
  line_item_costs?: LineItemCostLike[]
}

interface ProjectFinancialSummaryProps {
  lineItems: LineItemLike[]
}

export function ProjectFinancialSummary({ lineItems }: ProjectFinancialSummaryProps) {
  const subtotal = calcSubtotalFromPrecio(
    lineItems.map(li => ({ precio_venta: Number(li.precio_venta), cantidad: li.cantidad }))
  )
  const iva = calcIVA(subtotal)
  const total = calcTotal(subtotal)

  // Total cost = sum of all cost rows × cantidad per line item
  const totalCosto = lineItems.reduce(
    (sum, li) =>
      sum + (li.line_item_costs ?? []).reduce((s, c) => s + Number(c.costo), 0) * li.cantidad,
    0
  )

  // Gross profit excludes IVA — subtotal - totalCosto
  const utilidad = calcUtilidad(subtotal, totalCosto)

  return (
    <div className="rounded-md border p-4 space-y-2 w-full sm:max-w-sm sm:ml-auto">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
        Resumen Financiero
      </h3>

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatMXN(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">IVA (16%)</span>
          <span>{formatMXN(iva)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>{formatMXN(total)}</span>
        </div>
      </div>

      <Separator />

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Costo Total</span>
          <span>{formatMXN(totalCosto)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Utilidad Bruta</span>
          <span className={utilidad >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
            {formatMXN(utilidad)}
          </span>
        </div>
      </div>
    </div>
  )
}
