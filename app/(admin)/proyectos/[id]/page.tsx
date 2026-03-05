import { notFound } from 'next/navigation'
import Link from 'next/link'

import { getProjectWithLineItems } from '@/lib/queries/projects'
import { getSuppliers } from '@/lib/queries/suppliers'
import { formatFecha } from '@/lib/formatters'

import { ProjectStatusPipeline } from '@/components/projects/ProjectStatusPipeline'
import { LineItemTable } from '@/components/projects/LineItemTable'
import { LineItemForm } from '@/components/projects/LineItemForm'
import { ProjectFinancialSummary } from '@/components/projects/ProjectFinancialSummary'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProyectoDetailPage({ params }: PageProps) {
  const { id } = await params

  const [project, suppliers] = await Promise.all([
    getProjectWithLineItems(id).catch(() => null),
    getSuppliers(),
  ])

  if (!project) notFound()

  const lineItems = project.line_items ?? []

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
        <div className="flex-shrink-0">
          <Button asChild variant="outline" size="sm">
            <Link href={`/proyectos/${id}/editar`}>Editar</Link>
          </Button>
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
      <ProjectFinancialSummary lineItems={lineItems} />

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

      {/* Pagos — Phase 3 */}
      {/* Checklist — Phase 4 */}
      {/* Documentos / PDF — Phase 5 */}
    </div>
  )
}
