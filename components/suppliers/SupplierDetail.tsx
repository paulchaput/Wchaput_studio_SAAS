'use client'

import { calcTotalCostoProyecto, calcTotalPagadoProveedor, calcSaldoProveedor } from '@/lib/calculations'
import { formatMXN } from '@/lib/formatters'

interface ProjectInfo {
  id: string
  nombre: string
  cliente_nombre: string
  status: string
}

// Supabase returns the joined relation as object | null for many-to-one joins
interface LineItemWithProject {
  id: string
  costo_proveedor: unknown  // NUMERIC(12,2) returned as string — coerce with Number()
  cantidad: unknown          // coerce with Number()
  project_id: string
  projects: ProjectInfo | ProjectInfo[] | null
}

interface SupplierPayment {
  id: string
  project_id: string
  monto: number
  fecha: string
  notas: string | null
}

interface SupplierDetailProps {
  lineItems: LineItemWithProject[]
  payments: SupplierPayment[]
}

interface ProjectBalance {
  projectId: string
  projectName: string
  clientName: string
  status: string
  totalOwed: number
  totalPaid: number
  outstanding: number
}

export function SupplierDetail({ lineItems, payments }: SupplierDetailProps) {
  // Group line items by project_id
  const lineItemsByProject = lineItems.reduce<Record<string, LineItemWithProject[]>>(
    (acc, item) => {
      if (!acc[item.project_id]) acc[item.project_id] = []
      acc[item.project_id].push(item)
      return acc
    },
    {}
  )

  // Group payments by project_id
  const paymentsByProject = payments.reduce<Record<string, SupplierPayment[]>>(
    (acc, p) => {
      if (!acc[p.project_id]) acc[p.project_id] = []
      acc[p.project_id].push(p)
      return acc
    },
    {}
  )

  // Collect all unique project IDs
  const allProjectIds = new Set([
    ...Object.keys(lineItemsByProject),
    ...Object.keys(paymentsByProject),
  ])

  // Build per-project balance rows
  const projectBalances: ProjectBalance[] = Array.from(allProjectIds).map((projectId) => {
    const items = lineItemsByProject[projectId] ?? []
    const projectPayments = paymentsByProject[projectId] ?? []

    // Coerce NUMERIC(12,2) strings to numbers
    const normalizedItems = items.map((item) => ({
      costo_proveedor: Number(item.costo_proveedor),
      cantidad: Number(item.cantidad),
    }))
    const normalizedPayments = projectPayments.map((p) => ({
      monto: Number(p.monto),
    }))

    const totalOwed = calcTotalCostoProyecto(normalizedItems)
    const totalPaid = calcTotalPagadoProveedor(normalizedPayments)
    const outstanding = calcSaldoProveedor(totalOwed, totalPaid)

    // Get project info from first line item (or use placeholder)
    // Handle Supabase returning either an object or array for the join
    const rawProjectInfo = items[0]?.projects
    const projectInfo = Array.isArray(rawProjectInfo) ? rawProjectInfo[0] : rawProjectInfo

    return {
      projectId,
      projectName: projectInfo?.nombre ?? 'Proyecto sin nombre',
      clientName: projectInfo?.cliente_nombre ?? '—',
      status: projectInfo?.status ?? '—',
      totalOwed,
      totalPaid,
      outstanding,
    }
  })

  // Grand totals
  const grandTotalOwed = projectBalances.reduce((sum, p) => sum + p.totalOwed, 0)
  const grandTotalPaid = projectBalances.reduce((sum, p) => sum + p.totalPaid, 0)
  const grandOutstanding = calcSaldoProveedor(grandTotalOwed, grandTotalPaid)

  if (projectBalances.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-center text-muted-foreground">
        No hay partidas registradas para este proveedor.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Proyecto</th>
              <th className="px-4 py-3 text-left font-medium">Cliente</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Total Adeudado</th>
              <th className="px-4 py-3 text-right font-medium">Total Pagado</th>
              <th className="px-4 py-3 text-right font-medium">Saldo Pendiente</th>
            </tr>
          </thead>
          <tbody>
            {projectBalances.map((row) => (
              <tr key={row.projectId} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{row.projectName}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.clientName}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMXN(row.totalOwed)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMXN(row.totalPaid)}</td>
                <td className={`px-4 py-3 text-right tabular-nums font-medium ${row.outstanding > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {formatMXN(row.outstanding)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/50 font-semibold">
              <td className="px-4 py-3" colSpan={3}>Total General</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatMXN(grandTotalOwed)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatMXN(grandTotalPaid)}</td>
              <td className={`px-4 py-3 text-right tabular-nums ${grandOutstanding > 0 ? 'text-destructive' : 'text-green-600'}`}>
                {formatMXN(grandOutstanding)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
