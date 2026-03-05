import {
  getDashboardKpis,
  getPipelineSummary,
  getSupplierDebtBreakdown,
} from '@/lib/queries/dashboard'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { PipelineSummary } from '@/components/dashboard/PipelineSummary'
import { SupplierDebtBreakdown } from '@/components/dashboard/SupplierDebtBreakdown'
import { formatMXN } from '@/lib/formatters'

export default async function DashboardPage() {
  const [kpis, pipelineCounts, supplierDebt] = await Promise.all([
    getDashboardKpis(),
    getPipelineSummary(),
    getSupplierDebtBreakdown(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Vista general de salud financiera</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Proyectos Activos"
          value={String(kpis.activeProjectCount)}
          sublabel="excluyendo Cerrado"
        />
        <KpiCard
          label="Valor Pipeline"
          value={formatMXN(kpis.pipelineValue)}
          sublabel="proyectos no cerrados"
        />
        <KpiCard
          label="Cobros Pendientes"
          value={formatMXN(kpis.totalPendingCliente)}
          sublabel="saldo clientes activos"
        />
        <KpiCard
          label="Pagos a Proveedores"
          value={formatMXN(kpis.totalPendingProveedor)}
          sublabel="saldo proveedores activos"
        />
      </div>

      {/* Pipeline summary + supplier debt */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PipelineSummary pipelineCounts={pipelineCounts} />
        <SupplierDebtBreakdown deuda={supplierDebt} />
      </div>
    </div>
  )
}
