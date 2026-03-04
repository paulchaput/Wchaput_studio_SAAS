import Link from 'next/link'
import { getProjects } from '@/lib/queries/projects'
import { formatMXN, formatFecha } from '@/lib/formatters'
import { PIPELINE_STAGES } from '@/lib/calculations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PlusCircle, Pencil } from 'lucide-react'

export default async function ProyectosPage() {
  const projects = await getProjects()

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Proyectos</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/proyectos/nuevo">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Proyecto
          </Link>
        </Button>
      </div>

      {/* Empty state */}
      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No hay proyectos. Crea el primero.
          </p>
          <Button asChild variant="outline">
            <Link href="/proyectos/nuevo">Crear proyecto</Link>
          </Button>
        </div>
      ) : (
        /* Project table */
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden sm:table-cell">N° Cotización</TableHead>
                <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total Venta</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map(project => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/proyectos/${project.id}`}
                      className="hover:underline"
                    >
                      {project.nombre}
                    </Link>
                  </TableCell>
                  <TableCell>{project.cliente_nombre}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {project.numero_cotizacion ?? '—'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {formatFecha(project.fecha_cotizacion)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{project.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatMXN(project.gran_total)}
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/proyectos/${project.id}/editar`}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
