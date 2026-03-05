// Server Component — no 'use client'
import { getAccountantCashFlow } from '@/lib/queries/accountant'
import { formatMXN, formatFecha } from '@/lib/formatters'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
// No Server Actions imported — CONT-04

export default async function FlujoEfectivoPage() {
  const entries = await getAccountantCashFlow()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Flujo de Efectivo</h1>
        <p className="text-muted-foreground text-sm">Todos los movimientos — solo lectura</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Concepto</TableHead>
            <TableHead className="text-right">Monto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry, i) => (
            <TableRow key={i}>
              <TableCell>{formatFecha(entry.fecha)}</TableCell>
              <TableCell>{entry.tipo === 'cliente' ? 'Cobro cliente' : 'Pago proveedor'}</TableCell>
              <TableCell className="text-muted-foreground">{entry.label}</TableCell>
              <TableCell className="text-right">{formatMXN(entry.monto)}</TableCell>
            </TableRow>
          ))}
          {entries.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Sin movimientos registrados
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
