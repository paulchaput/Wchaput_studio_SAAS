import { getProjectById } from '@/lib/queries/projects'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { notFound } from 'next/navigation'

export default async function EditarProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let project

  try {
    project = await getProjectById(id)
  } catch {
    notFound()
  }

  if (!project) notFound()

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Editar Proyecto</h1>
      <ProjectForm project={project} />
    </div>
  )
}
