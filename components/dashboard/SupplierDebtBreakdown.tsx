import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMXN } from '@/lib/formatters'

interface SupplierDebtBreakdownProps {
  deuda: {
    Innovika: number
    'El Roble': number
    Otros: number
  }
}

const SUPPLIER_ROWS: Array<{ key: 'Innovika' | 'El Roble' | 'Otros'; label: string }> = [
  { key: 'Innovika', label: 'Innovika' },
  { key: 'El Roble', label: 'El Roble' },
  { key: 'Otros', label: 'Otros' },
]

export function SupplierDebtBreakdown({ deuda }: SupplierDebtBreakdownProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Deuda por Proveedor</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Proveedor</TableHead>
            <TableHead className="text-right">Saldo Pendiente</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {SUPPLIER_ROWS.map(({ key, label }) => (
            <TableRow key={key}>
              <TableCell>{label}</TableCell>
              <TableCell className="text-right font-medium">
                {formatMXN(deuda[key])}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
