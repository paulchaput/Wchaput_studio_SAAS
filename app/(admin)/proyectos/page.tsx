import { getProjects } from '@/lib/queries/projects'
import { QuickProjectDialog } from '@/components/projects/QuickProjectDialog'
import { ImportProjectsDialog } from '@/components/projects/ImportProjectsDialog'
import { ProjectsTable } from '@/components/projects/ProjectsTable'
import { FolderOpen } from 'lucide-react'

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
        <div className="flex gap-2">
          <ImportProjectsDialog />
          <QuickProjectDialog />
        </div>
      </div>

      {/* Content */}
      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-medium mb-1">Sin proyectos todavia</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Crea tu primer proyecto o importa varios desde un archivo.
          </p>
          <div className="flex justify-center gap-3">
            <ImportProjectsDialog />
            <QuickProjectDialog />
          </div>
        </div>
      ) : (
        <ProjectsTable projects={projects} />
      )}
    </div>
  )
}
