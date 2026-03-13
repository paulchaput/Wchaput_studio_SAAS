'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  Eye,
  Pencil,
  Trash2,
  MoreHorizontal,
  FolderOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatMXN, formatFecha } from '@/lib/formatters'
import { deleteProjectAction } from '@/lib/actions/projects'
import { PIPELINE_STAGES } from '@/lib/calculations'

interface ProjectRow {
  id: string
  nombre: string
  cliente_nombre: string
  numero_cotizacion: string | null
  fecha_cotizacion: string | null
  status: string
  gran_total: number
}

interface ProjectsTableProps {
  projects: ProjectRow[]
}

const STATUS_COLORS: Record<string, string> = {
  'Prospecto': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'Cotizado': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  'Anticipo Recibido': 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  'En Producción': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  'Entregado': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  'Cerrado': 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

export function ProjectsTable({ projects }: ProjectsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [deleteTarget, setDeleteTarget] = useState<ProjectRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const filtered = projects.filter(p => {
    const matchesSearch =
      search === '' ||
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.cliente_nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.numero_cotizacion?.toLowerCase().includes(search.toLowerCase()) ?? false)

    const matchesStatus = statusFilter === 'todos' || p.status === statusFilter

    return matchesSearch && matchesStatus
  })

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deleteProjectAction(deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    if (!result?.error) {
      router.refresh()
    }
  }

  // Count projects per status for filter pills
  const statusCounts = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, cliente o cotización..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('todos')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === 'todos'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Todos ({projects.length})
          </button>
          {PIPELINE_STAGES.map(stage => {
            const count = statusCounts[stage] ?? 0
            if (count === 0) return null
            return (
              <button
                key={stage}
                onClick={() => setStatusFilter(statusFilter === stage ? 'todos' : stage)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === stage
                    ? 'bg-primary text-primary-foreground'
                    : `${STATUS_COLORS[stage] ?? 'bg-muted text-muted-foreground'} hover:opacity-80`
                }`}
              >
                {stage} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {search || statusFilter !== 'todos'
              ? 'No se encontraron proyectos con esos filtros.'
              : 'No hay proyectos. Crea el primero.'}
          </p>
          {(search || statusFilter !== 'todos') && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('todos') }}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead className="hidden sm:table-cell">N° Cotización</TableHead>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(project => (
                <TableRow
                  key={project.id}
                  className="group cursor-pointer"
                  onClick={() => router.push(`/proyectos/${project.id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium group-hover:text-primary transition-colors">
                        {project.nombre}
                      </p>
                      <p className="text-xs text-muted-foreground">{project.cliente_nombre}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                    {project.numero_cotizacion ?? '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {formatFecha(project.fecha_cotizacion)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={STATUS_COLORS[project.status] ?? ''}
                    >
                      {project.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatMXN(project.gran_total)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setMenuOpen(menuOpen === project.id ? null : project.id)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>

                      {menuOpen === project.id && (
                        <>
                          {/* Backdrop to close menu */}
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setMenuOpen(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-md border bg-background shadow-lg py-1">
                            <Link
                              href={`/proyectos/${project.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                              onClick={() => setMenuOpen(null)}
                            >
                              <Eye className="h-4 w-4" />
                              Ver detalle
                            </Link>
                            <Link
                              href={`/proyectos/${project.id}/editar`}
                              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                              onClick={() => setMenuOpen(null)}
                            >
                              <Pencil className="h-4 w-4" />
                              Editar
                            </Link>
                            <button
                              onClick={() => {
                                setMenuOpen(null)
                                setDeleteTarget(project)
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors w-full text-left"
                            >
                              <Trash2 className="h-4 w-4" />
                              Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Results count */}
      {filtered.length > 0 && filtered.length !== projects.length && (
        <p className="text-xs text-muted-foreground text-center">
          Mostrando {filtered.length} de {projects.length} proyectos
        </p>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar proyecto</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todas las partidas,
              pagos y archivos asociados.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="rounded-md border p-3 space-y-1">
              <p className="font-medium">{deleteTarget.nombre}</p>
              <p className="text-sm text-muted-foreground">{deleteTarget.cliente_nombre}</p>
              {deleteTarget.gran_total > 0 && (
                <p className="text-sm text-muted-foreground">
                  Total: {formatMXN(deleteTarget.gran_total)}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Eliminando...' : 'Eliminar proyecto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
