import dynamic from 'next/dynamic'
import {
  getDashboardKpis,
  getPipelineSummary,
  getSupplierDebtBreakdown,
  getMonthlyFinancials,
  getCashFlowProjection,
} from '@/lib/queries/dashboard'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { PipelineSummary } from '@/components/dashboard/PipelineSummary'
import { SupplierDebtBreakdown } from '@/components/dashboard/SupplierDebtBreakdown'
import { formatMXN } from '@/lib/formatters'

const RevenueChart = dynamic(() => import('@/components/dashboard/RevenueChart'), { ssr: false })
const CashFlowChart = dynamic(() => import('@/components/dashboard/CashFlowChart'), { ssr: false })

export default async function DashboardPage() {
  const [kpis, pipelineCounts, supplierDebt, monthlyData, cashFlow] = await Promise.all([
    getDashboardKpis(),
    getPipelineSummary(),
    getSupplierDebtBreakdown(),
    getMonthlyFinancials(),
    getCashFlowProjection(),
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

      {/* Monthly revenue/cost/profit bar chart */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Ingresos vs. Costos (últimos 6 meses)</h2>
        <RevenueChart data={monthlyData} />
      </div>

      {/* 30-day cash flow projection */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Flujo de Efectivo — Próximos 30 días</h2>
        <CashFlowChart data={cashFlow} />
      </div>
    </div>
  )
}
