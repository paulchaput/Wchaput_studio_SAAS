'use client'

import { calcSubtotalFromPrecioWithDiscount, calcIVA, calcTotal, calcUtilidad } from '@/lib/calculations'
import { formatMXN } from '@/lib/formatters'
import { Separator } from '@/components/ui/separator'

interface LineItemCostLike {
  costo: number
}

interface LineItemLike {
  precio_venta: number
  cantidad: number
  descuento?: number
  line_item_costs?: LineItemCostLike[]
}

interface ProjectFinancialSummaryProps {
  lineItems: LineItemLike[]
  includeIva: boolean
  descuentoGeneral?: number
  descuentoGeneralMonto?: number
}

export function ProjectFinancialSummary({ lineItems, includeIva, descuentoGeneral = 0, descuentoGeneralMonto = 0 }: ProjectFinancialSummaryProps) {
  const subtotal = calcSubtotalFromPrecioWithDiscount(
    lineItems.map(li => ({ precio_venta: Number(li.precio_venta), cantidad: li.cantidad, descuento: Number(li.descuento ?? 0) }))
  )
  const subtotalConDescuento = subtotal - descuentoGeneralMonto
  const iva = includeIva ? calcIVA(subtotalConDescuento) : 0
  const total = includeIva ? calcTotal(subtotalConDescuento) : subtotalConDescuento

  const totalCosto = lineItems.reduce(
    (sum, li) =>
      sum + (li.line_item_costs ?? []).reduce((s, c) => s + Number(c.costo), 0) * li.cantidad,
    0
  )

  const utilidad = calcUtilidad(subtotal, totalCosto)

  return (
    <div className="rounded-md border p-4 space-y-2 w-full sm:max-w-sm sm:ml-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Resumen Financiero
        </h3>
        {!includeIva && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            Sin IVA
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatMXN(subtotal)}</span>
        </div>
        {descuentoGeneral > 0 && (
          <div className="flex justify-between text-amber-600">
            <span>Descuento general ({descuentoGeneral}%)</span>
            <span>-{formatMXN(descuentoGeneralMonto)}</span>
          </div>
        )}
        {includeIva && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">IVA (16%)</span>
            <span>{formatMXN(iva)}</span>
          </div>
        )}
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
