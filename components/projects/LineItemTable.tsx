'use client'

import { LineItem } from '@/lib/types'
import { calcPrecioVenta, calcTotalVenta } from '@/lib/calculations'
import { formatMXN, margenToPercent } from '@/lib/formatters'
import { deleteLineItemAction } from '@/lib/actions/line-items'
import { LineItemForm } from '@/components/projects/LineItemForm'

interface LineItemTableProps {
  lineItems: LineItem[]
  suppliers: Array<{ id: string; nombre: string }>
  projectId: string
}

export function LineItemTable({ lineItems, suppliers, projectId }: LineItemTableProps) {
  if (lineItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-4">
          No hay partidas. Agrega la primera.
        </p>
        <LineItemForm projectId={projectId} suppliers={suppliers} />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Descripción</th>
            <th className="hidden sm:table-cell px-3 py-2 text-left font-medium">Referencia</th>
            <th className="px-3 py-2 text-right font-medium">Qty</th>
            <th className="px-3 py-2 text-right font-medium">Costo Unit.</th>
            <th className="px-3 py-2 text-right font-medium">Margen</th>
            <th className="px-3 py-2 text-right font-medium">Precio Venta</th>
            <th className="px-3 py-2 text-right font-medium">Total Venta</th>
            <th className="px-3 py-2 text-center font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item) => {
            const precioVenta = calcPrecioVenta(item.costo_proveedor, item.margen)
            const totalVenta = calcTotalVenta(precioVenta, item.cantidad)


            return (
              <tr key={item.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2">{item.descripcion}</td>
                <td className="hidden sm:table-cell px-3 py-2 text-muted-foreground">
                  {item.referencia ?? '—'}
                </td>
                <td className="px-3 py-2 text-right">{item.cantidad}</td>
                <td className="px-3 py-2 text-right">{formatMXN(item.costo_proveedor)}</td>
                <td className="px-3 py-2 text-right">{margenToPercent(item.margen)}%</td>
                <td className="px-3 py-2 text-right">{formatMXN(precioVenta)}</td>
                <td className="px-3 py-2 text-right font-medium">{formatMXN(totalVenta)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center gap-2">
                    <LineItemForm
                      projectId={projectId}
                      suppliers={suppliers}
                      lineItem={item}
                    />
                    <form action={async (fd) => { await deleteLineItemAction(fd) }}>
                      <input type="hidden" name="lineItemId" value={item.id} />
                      <input type="hidden" name="projectId" value={projectId} />
                      <button
                        type="submit"
                        className="text-destructive text-xs hover:underline"
                        onClick={(e) => {
                          if (!confirm('¿Eliminar esta partida?')) e.preventDefault()
                        }}
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
