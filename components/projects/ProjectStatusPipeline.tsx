'use client'

import { PIPELINE_STAGES } from '@/lib/calculations'
import { updateProjectStatusAction } from '@/lib/actions/projects'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ProjectStatusPipelineProps {
  projectId: string
  currentStatus: string
}

export function ProjectStatusPipeline({
  projectId,
  currentStatus,
}: ProjectStatusPipelineProps) {
  const stages = PIPELINE_STAGES as readonly string[]
  const currentIndex = stages.indexOf(currentStatus)
  const nextStage = currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null
  const prevStage = currentIndex > 0 ? stages[currentIndex - 1] : null

  const advanceAction: ((formData: FormData) => Promise<void>) | null = nextStage
    ? async (_formData: FormData) => {
        await updateProjectStatusAction(projectId, nextStage)
      }
    : null
  const revertAction: ((formData: FormData) => Promise<void>) | null = prevStage
    ? async (_formData: FormData) => {
        await updateProjectStatusAction(projectId, prevStage)
      }
    : null

  return (
    <div className="space-y-4">
      {/* Pipeline stages */}
      <div className="flex flex-wrap gap-2">
        {stages.map((stage, index) => {
          const isPast = index < currentIndex
          const isCurrent = index === currentIndex
          const isFuture = index > currentIndex

          return (
            <span
              key={stage}
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors',
                isPast && 'bg-muted text-muted-foreground',
                isCurrent && 'bg-primary text-primary-foreground shadow-sm',
                isFuture && 'bg-muted/40 text-muted-foreground/50'
              )}
            >
              {stage}
            </span>
          )
        })}
      </div>

      {/* Advance / Revert buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {advanceAction && nextStage && (
          <form action={advanceAction}>
            <Button type="submit" className="w-full sm:w-auto">
              Avanzar a {nextStage}
            </Button>
          </form>
        )}
        {revertAction && (
          <form action={revertAction}>
            <Button type="submit" variant="outline" className="w-full sm:w-auto">
              Retroceder
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
