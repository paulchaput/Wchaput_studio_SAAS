'use client'

import dynamic from 'next/dynamic'
import type { MonthlyDataPoint, CashFlowEntry } from '@/lib/queries/dashboard'

const RevenueChart = dynamic(() => import('@/components/dashboard/RevenueChart'), { ssr: false })
const CashFlowChart = dynamic(() => import('@/components/dashboard/CashFlowChart'), { ssr: false })

interface DashboardChartsProps {
  monthlyData: MonthlyDataPoint[]
  cashFlow: CashFlowEntry[]
}

export function DashboardCharts({ monthlyData, cashFlow }: DashboardChartsProps) {
  return (
    <>
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Ingresos vs. Costos (últimos 6 meses)</h2>
        <RevenueChart data={monthlyData} />
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Flujo de Efectivo — Próximos 30 días</h2>
        <CashFlowChart data={cashFlow} />
      </div>
    </>
  )
}
