import { notFound } from 'next/navigation'
import Link from 'next/link'

import { getProjectWithLineItems } from '@/lib/queries/projects'
import { getSuppliers } from '@/lib/queries/suppliers'
import { getClientPayments, getSupplierPayments } from '@/lib/queries/payments'
import { getChecklistTasks } from '@/lib/queries/checklist'
import { calcSubtotalFromPrecio, calcTotal } from '@/lib/calculations'
import { formatFecha } from '@/lib/formatters'
import { createClient } from '@/lib/supabase/server'
import type { LineItem } from '@/lib/types'

import { ProjectStatusPipeline } from '@/components/projects/ProjectStatusPipeline'
import { LineItemTable } from '@/components/projects/LineItemTable'
import { LineItemForm } from '@/components/projects/LineItemForm'
import { ProjectFinancialSummary } from '@/components/projects/ProjectFinancialSummary'
import { ClientPaymentPanel } from '@/components/projects/ClientPaymentPanel'
import { SupplierPaymentPanel } from '@/components/projects/SupplierPaymentPanel'
import { ChecklistPanel } from '@/components/projects/ChecklistPanel'
import { PdfPreviewModal } from '@/components/projects/PdfPreviewModal'
import { DeleteProjectButton } from '@/components/projects/DeleteProjectButton'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProyectoDetailPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const [project, suppliers, clientPayments, supplierPayments, checklistTasks] = await Promise.all([
    getProjectWithLineItems(id).catch(() => null),
    getSuppliers(),
    getClientPayments(id),
    getSupplierPayments(id),
    isAdmin ? getChecklistTasks(id) : Promise.resolve([]),
  ])

  if (!project) notFound()

  const lineItems = (project.line_items ?? []) as LineItem[]
  const includeIva = project.include_iva ?? true
  const subtotal = calcSubtotalFromPrecio(
    lineItems.map((li: LineItem) => ({ precio_venta: Number(li.precio_venta), cantidad: li.cantidad }))
  )
  const granTotal = includeIva ? calcTotal(subtotal) : subtotal

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{project.nombre}</h1>
          <p className="text-muted-foreground">{project.cliente_nombre}</p>
          {project.numero_cotizacion && (
            <p className="text-sm text-muted-foreground">
              Cotización: {project.numero_cotizacion}
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {project.fecha_cotizacion && (
              <span>Fecha cotización: {formatFecha(project.fecha_cotizacion)}</span>
            )}
            {project.fecha_entrega_estimada && (
              <span>Entrega estimada: {formatFecha(project.fecha_entrega_estimada)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button asChild variant="outline" size="sm">
            <Link href={`/proyectos/${id}/editar`}>Editar</Link>
          </Button>
          <DeleteProjectButton projectId={id} projectName={project.nombre} />
        </div>
      </div>

      <Separator />

      {/* Pipeline Status */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Estado del Proyecto</h2>
        <ProjectStatusPipeline projectId={id} currentStatus={project.status} />
      </div>

      <Separator />

      {/* Line Items Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Partidas</h2>
          {lineItems.length > 0 && (
            <LineItemForm projectId={id} suppliers={suppliers} />
          )}
        </div>

        <LineItemTable
          lineItems={lineItems}
          suppliers={suppliers}
          projectId={id}
        />
      </div>

      {/* Financial Summary */}
      <ProjectFinancialSummary lineItems={lineItems} includeIva={includeIva} />

      <Separator />

      {/* Pagos del Cliente */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Pagos del Cliente</h2>
        <ClientPaymentPanel
          projectId={id}
          granTotal={granTotal}
          payments={clientPayments}
        />
      </div>

      <Separator />

      {/* Pagos a Proveedores */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Pagos a Proveedores</h2>
        <SupplierPaymentPanel
          projectId={id}
          lineItems={lineItems}
          payments={supplierPayments}
          suppliers={suppliers}
        />
      </div>

      {/* Notas Internas */}
      {project.notas && (
        <>
          <Separator />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Notas Internas</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {project.notas}
            </p>
          </div>
        </>
      )}

      {/* Checklist — Phase 4 */}
      {isAdmin && (
        <>
          <Separator />
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Checklist de Producción</h2>
            <ChecklistPanel tasks={checklistTasks} projectId={id} />
          </div>
        </>
      )}

      {/* Documentos / PDF */}
      <Separator />
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Documentos</h2>
        <div className="flex flex-wrap gap-3">
          <PdfPreviewModal
            label="Cotización PDF"
            previewUrl={`/proyectos/${id}/cotizacion?preview=1`}
            downloadUrl={`/proyectos/${id}/cotizacion`}
          />
          {isAdmin && (() => {
            // Derive unique suppliers from line_item_costs (multi-supplier model)
            const uniqueSuppliers = lineItems
              .flatMap((li: LineItem) => (li.line_item_costs ?? []))
              .reduce((acc: Array<{ id: string; nombre: string }>, cost) => {
                const s = cost.suppliers
                if (s && !acc.find((x: { id: string }) => x.id === s.id)) acc.push({ id: s.id, nombre: s.nombre })
                return acc
              }, [] as Array<{ id: string; nombre: string }>)

            if (uniqueSuppliers.length === 0) return null
            return (
              <>
                {uniqueSuppliers.map((s) => (
                  <PdfPreviewModal
                    key={s.id}
                    label={`OC — ${s.nombre}`}
                    previewUrl={`/proyectos/${id}/orden-compra?supplier_id=${s.id}&preview=1`}
                    downloadUrl={`/proyectos/${id}/orden-compra?supplier_id=${s.id}`}
                  />
                ))}
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
