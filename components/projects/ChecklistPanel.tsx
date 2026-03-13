'use client'

import { useState } from 'react'

import type { ChecklistTask } from '@/lib/types'
import { CHECKLIST_PHASES, type ChecklistFase, calcPhaseProgress } from '@/lib/checklist-tasks'
import { toggleChecklistTaskAction } from '@/lib/actions/checklist'

interface ChecklistPanelProps {
  tasks: ChecklistTask[]
  projectId: string
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `hace ${diffDays}d`
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

export function ChecklistPanel({ tasks, projectId }: ChecklistPanelProps) {
  const [localTasks, setLocalTasks] = useState<ChecklistTask[]>(tasks)

  // Find the first phase with incomplete tasks to auto-open
  const grouped = CHECKLIST_PHASES.map(fase => ({
    fase,
    tasks: localTasks.filter(t => t.fase === fase).sort((a, b) => a.sort_order - b.sort_order),
  }))

  const activePhaseIndex = grouped.findIndex(g => {
    const prog = calcPhaseProgress(g.tasks)
    return prog.completed < prog.total
  })

  const [openPhase, setOpenPhase] = useState<ChecklistFase | null>(
    activePhaseIndex >= 0 ? grouped[activePhaseIndex].fase : null
  )

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center">
        Sin tareas de checklist.
      </p>
    )
  }

  const handleToggle = async (task: ChecklistTask) => {
    const newCompleted = task.status !== 'Completado'
    // Optimistic update
    setLocalTasks(prev =>
      prev.map(t =>
        t.id === task.id
          ? { ...t, status: newCompleted ? 'Completado' : 'Pendiente', completed_at: newCompleted ? new Date().toISOString() : null }
          : t
      )
    )

    const fd = new FormData()
    fd.append('taskId', task.id)
    fd.append('projectId', projectId)
    fd.append('completed', String(newCompleted))
    const result = await toggleChecklistTaskAction(fd)

    if (result?.error) {
      // Revert
      setLocalTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, status: task.status, completed_at: task.completed_at } : t))
      )
    }
  }

  // Overall progress
  const totalCompleted = localTasks.filter(t => t.status === 'Completado').length
  const totalTasks = localTasks.length

  return (
    <div className="space-y-3">
      {/* Overall progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
          {totalCompleted}/{totalTasks}
        </span>
      </div>

      {/* Phase accordion */}
      <div className="rounded-md border overflow-hidden divide-y">
        {grouped.map(({ fase, tasks: phaseTasks }, phaseIndex) => {
          const progress = calcPhaseProgress(phaseTasks)
          const isOpen = openPhase === fase
          const isComplete = progress.completed === progress.total && progress.total > 0
          const isActive = phaseIndex === activePhaseIndex

          return (
            <div key={fase}>
              {/* Phase header */}
              <button
                type="button"
                onClick={() => setOpenPhase(isOpen ? null : fase)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                {/* Phase number circle */}
                <div
                  className={`size-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                    isComplete
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isComplete ? (
                    <svg className="size-4" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    phaseIndex + 1
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${isComplete ? 'text-muted-foreground' : ''}`}>
                    {fase}
                  </span>
                </div>

                {/* Progress pills */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {progress.completed}/{progress.total}
                  </span>
                  <svg
                    className={`size-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>

              {/* Phase tasks (collapsible) */}
              {isOpen && phaseTasks.length > 0 && (
                <div className="pb-2">
                  {phaseTasks.map((task, taskIndex) => {
                    const isDone = task.status === 'Completado'
                    const isLast = taskIndex === phaseTasks.length - 1
                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 pl-6 pr-4 py-0.5"
                      >
                        {/* Timeline connector */}
                        <div className="relative flex flex-col items-center w-7 flex-shrink-0">
                          {taskIndex > 0 && (
                            <div className={`absolute bottom-1/2 w-0.5 h-full ${isDone ? 'bg-green-300' : 'bg-muted'}`} />
                          )}
                          {!isLast && (
                            <div className={`absolute top-1/2 w-0.5 h-full ${isDone ? 'bg-green-300' : 'bg-muted'}`} />
                          )}
                          {/* Toggle button */}
                          <button
                            type="button"
                            onClick={() => handleToggle(task)}
                            className={`relative z-10 size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isDone
                                ? 'bg-green-500 border-green-500 hover:bg-green-600'
                                : 'border-muted-foreground/30 hover:border-muted-foreground/60 bg-background'
                            }`}
                          >
                            {isDone && (
                              <svg className="size-3 text-white" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                        </div>

                        {/* Task label */}
                        <span
                          className={`flex-1 text-sm py-2 ${
                            isDone ? 'text-muted-foreground line-through' : ''
                          }`}
                        >
                          {task.nombre}
                        </span>

                        {/* Completed date */}
                        {isDone && task.completed_at && (
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {formatRelativeDate(task.completed_at)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
