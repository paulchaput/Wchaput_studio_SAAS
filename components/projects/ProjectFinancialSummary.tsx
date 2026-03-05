'use client'

import { calcSubtotal, calcIVA, calcTotal, calcTotalCostoProyecto, calcUtilidad } from '@/lib/calculations'
import { formatMXN } from '@/lib/formatters'
import { Separator } from '@/components/ui/separator'

interface ProjectFinancialSummaryProps {
  lineItems: Array<{
    costo_proveedor: number
    margen: number
    cantidad: number
  }>
}

export function ProjectFinancialSummary({ lineItems }: ProjectFinancialSummaryProps) {
  const subtotal = calcSubtotal(lineItems)
  const iva = calcIVA(subtotal)
  const total = calcTotal(subtotal)
  const totalCosto = calcTotalCostoProyecto(lineItems)
  // Gross profit excludes IVA — subtotal - totalCosto (PART-07)
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
