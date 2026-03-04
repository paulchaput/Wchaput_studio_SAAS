import { ProjectForm } from '@/components/projects/ProjectForm'

export default function NuevoProyectoPage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Nuevo Proyecto</h1>
      <ProjectForm />
    </div>
  )
}
