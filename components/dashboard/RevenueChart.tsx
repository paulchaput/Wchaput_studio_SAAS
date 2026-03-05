'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { MonthlyDataPoint } from '@/lib/queries/dashboard'
import { formatMXN } from '@/lib/formatters'

export default function RevenueChart({ data }: { data: MonthlyDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number | undefined) => (v != null ? formatMXN(v) : '')} />
        <Legend />
        <Bar dataKey="ingresos" name="Ingresos" fill="#111" />
        <Bar dataKey="costos" name="Costos" fill="#666" />
        <Bar dataKey="utilidad" name="Utilidad" fill="#999" />
      </BarChart>
    </ResponsiveContainer>
  )
}
