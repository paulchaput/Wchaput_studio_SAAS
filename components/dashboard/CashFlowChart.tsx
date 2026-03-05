'use client'
import type { CashFlowEntry } from '@/lib/queries/dashboard'
import { formatMXN } from '@/lib/formatters'
import { formatFecha } from '@/lib/formatters'

export default function CashFlowChart({ data }: { data: CashFlowEntry[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay movimientos en los próximos 30 días.</p>
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="text-left py-2">Fecha</th>
          <th className="text-left py-2">Tipo</th>
          <th className="text-left py-2">Concepto</th>
          <th className="text-right py-2">Monto</th>
        </tr>
      </thead>
      <tbody>
        {data.map((entry, i) => (
          <tr key={i} className="border-b last:border-0">
            <td className="py-2">{formatFecha(entry.fecha)}</td>
            <td className={`py-2 font-medium ${entry.tipo === 'entrada' ? 'text-green-700' : 'text-red-700'}`}>
              {entry.tipo === 'entrada' ? 'Entrada' : 'Salida'}
            </td>
            <td className="py-2 text-muted-foreground">{entry.label}</td>
            <td className="py-2 text-right">{formatMXN(entry.monto)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
