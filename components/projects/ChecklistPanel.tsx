'use client'

import { useState } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { ChecklistTask, ChecklistStatus } from '@/lib/types'
import { CHECKLIST_PHASES, type ChecklistFase, calcPhaseProgress } from '@/lib/checklist-tasks'
import { updateChecklistTaskAction } from '@/lib/actions/checklist'

interface ChecklistPanelProps {
  tasks: ChecklistTask[]
  projectId: string
}

const STATUS_OPTIONS: ChecklistStatus[] = ['Pendiente', 'En Proceso', 'Completado', 'Bloqueado', 'N/A']

function getStatusClass(status: ChecklistStatus): string {
  switch (status) {
    case 'Completado':
    case 'N/A':
      return 'text-green-600 dark:text-green-400'
    case 'En Proceso':
      return 'text-blue-600 dark:text-blue-400'
    case 'Bloqueado':
      return 'text-destructive'
    case 'Pendiente':
    default:
      return 'text-muted-foreground'
  }
}

export function ChecklistPanel({ tasks, projectId }: ChecklistPanelProps) {
  const [localTasks, setLocalTasks] = useState<ChecklistTask[]>(tasks)

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin tareas de checklist. Crea un nuevo proyecto para generar el checklist automáticamente.
      </p>
    )
  }

  const FASE_ORDER: ChecklistFase[] = [...CHECKLIST_PHASES]

  const grouped = FASE_ORDER.map(fase => ({
    fase,
    tasks: localTasks.filter(t => t.fase === fase).sort((a, b) => a.sort_order - b.sort_order),
  }))

  const handleStatusChange = async (task: ChecklistTask, newStatus: ChecklistStatus) => {
    // Optimistic update
    setLocalTasks(prev =>
      prev.map(t => (t.id === task.id ? { ...t, status: newStatus } : t))
    )

    const fd = new FormData()
    fd.append('taskId', task.id)
    fd.append('projectId', projectId)
    fd.append('status', newStatus)
    const result = await updateChecklistTaskAction(fd)

    if (result?.error) {
      // Revert
      setLocalTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, status: task.status } : t))
      )
    }
  }

  const handleFieldBlur = async (
    task: ChecklistTask,
    field: 'assignee' | 'due_date',
    value: string
  ) => {
    const fd = new FormData()
    fd.append('taskId', task.id)
    fd.append('projectId', projectId)
    fd.append(field, value)
    await updateChecklistTaskAction(fd)
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ fase, tasks: phaseTasks }) => {
        const progress = calcPhaseProgress(phaseTasks)
        return (
          <Card key={fase}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{fase}</CardTitle>
                <span className="text-sm text-muted-foreground">
                  {progress.completed} / {progress.total} Completadas
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {phaseTasks.length === 0 ? (
                <p className="px-6 pb-4 text-sm text-muted-foreground">Sin tareas en esta fase.</p>
              ) : (
                <div className="divide-y">
                  {phaseTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 px-6 py-3"
                    >
                      {/* Task name */}
                      <span
                        className={`flex-1 text-sm ${
                          task.status === 'Completado' || task.status === 'N/A'
                            ? 'text-muted-foreground line-through'
                            : ''
                        }`}
                      >
                        {task.nombre}
                      </span>

                      {/* Status Select */}
                      <div className="flex items-center gap-1 sm:w-40">
                        <span
                          className={`h-2 w-2 rounded-full flex-shrink-0 ${
                            task.status === 'Completado' || task.status === 'N/A'
                              ? 'bg-green-500'
                              : task.status === 'En Proceso'
                              ? 'bg-blue-500'
                              : task.status === 'Bloqueado'
                              ? 'bg-destructive'
                              : 'bg-muted-foreground/40'
                          }`}
                        />
                        <Select
                          value={task.status}
                          onValueChange={(val) =>
                            handleStatusChange(task, val as ChecklistStatus)
                          }
                        >
                          <SelectTrigger
                            className={`h-8 text-xs w-full ${getStatusClass(task.status)}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(opt => (
                              <SelectItem key={opt} value={opt} className="text-xs">
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Assignee input */}
                      <Input
                        type="text"
                        placeholder="Responsable"
                        defaultValue={task.assignee ?? ''}
                        className="h-8 text-xs sm:w-36"
                        onBlur={(e) => handleFieldBlur(task, 'assignee', e.target.value)}
                      />

                      {/* Due date input */}
                      <Input
                        type="date"
                        defaultValue={task.due_date ?? ''}
                        className="h-8 text-xs sm:w-36"
                        onBlur={(e) => handleFieldBlur(task, 'due_date', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
