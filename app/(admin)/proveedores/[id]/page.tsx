import { notFound } from 'next/navigation'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { getSupplierWithDetails } from '@/lib/queries/suppliers'
import { calcTotalCostoProyecto, calcTotalPagadoProveedor, calcSaldoProveedor } from '@/lib/calculations'
import { formatMXN } from '@/lib/formatters'

import { SupplierDetail } from '@/components/suppliers/SupplierDetail'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SupplierDetailPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()

  // Fetch the supplier record
  const { data: supplier, error } = await supabase
    .from('suppliers')
    .select('id, nombre, contacto, email, telefono, notas, created_at')
    .eq('id', id)
    .single()

  if (error || !supplier) notFound()

  // Fetch line items and payments (two batch queries, no N+1)
  const { lineItems, payments } = await getSupplierWithDetails(id)

  // Compute grand totals server-side
  const normalizedItems = lineItems.map((item) => ({
    costo_proveedor: Number(item.costo_proveedor),
    cantidad: Number(item.cantidad),
  }))
  const normalizedPayments = payments.map((p) => ({
    monto: Number(p.monto),
  }))

  const totalOwed = calcTotalCostoProyecto(normalizedItems)
  const totalPagado = calcTotalPagadoProveedor(normalizedPayments)
  const saldo = calcSaldoProveedor(totalOwed, totalPagado)

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/proveedores" className="hover:underline">Proveedores</Link>
            <span>/</span>
            <span>{supplier.nombre}</span>
          </div>
          <h1 className="text-2xl font-bold">{supplier.nombre}</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/proveedores">Volver</Link>
        </Button>
      </div>

      <Separator />

      {/* Supplier Contact Info */}
      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="text-lg font-semibold">Información de Contacto</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Contacto: </span>
            <span>{supplier.contacto ?? '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Email: </span>
            {supplier.email ? (
              <a href={`mailto:${supplier.email}`} className="text-primary hover:underline">
                {supplier.email}
              </a>
            ) : <span>—</span>}
          </div>
          <div>
            <span className="text-muted-foreground">Teléfono: </span>
            <span>{supplier.telefono ?? '—'}</span>
          </div>
          {supplier.notas && (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Notas: </span>
              <span className="whitespace-pre-wrap">{supplier.notas}</span>
            </div>
          )}
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Total Adeudado</p>
          <p className="text-2xl font-bold tabular-nums">{formatMXN(totalOwed)}</p>
        </div>
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Total Pagado</p>
          <p className="text-2xl font-bold tabular-nums">{formatMXN(totalPagado)}</p>
        </div>
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Saldo Pendiente</p>
          <p className={`text-2xl font-bold tabular-nums ${saldo > 0 ? 'text-destructive' : 'text-green-600'}`}>
            {formatMXN(saldo)}
          </p>
        </div>
      </div>

      <Separator />

      {/* Cross-project balance breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Desglose por Proyecto</h2>
        <SupplierDetail
          lineItems={lineItems as unknown as Parameters<typeof SupplierDetail>[0]['lineItems']}
          payments={payments as unknown as Parameters<typeof SupplierDetail>[0]['payments']}
        />
      </div>
    </div>
  )
}
