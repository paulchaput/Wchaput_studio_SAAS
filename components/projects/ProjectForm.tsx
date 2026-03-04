'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createProjectAction, updateProjectAction } from '@/lib/actions/projects'
import type { Project } from '@/lib/types'

const projectFormSchema = z.object({
  nombre: z.string().min(1, 'El nombre del proyecto es requerido'),
  cliente_nombre: z.string().min(1, 'El cliente es requerido'),
  numero_cotizacion: z.string().optional(),
  fecha_cotizacion: z.string().optional(),
  salesperson: z.string().optional(),
  fecha_entrega_estimada: z.string().optional(),
  notas: z.string().optional(),
})

type ProjectFormValues = z.infer<typeof projectFormSchema>

interface ProjectFormProps {
  project?: Project
}

export function ProjectForm({ project }: ProjectFormProps) {
  const isEditMode = !!project
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      nombre: project?.nombre ?? '',
      cliente_nombre: project?.cliente_nombre ?? '',
      numero_cotizacion: project?.numero_cotizacion ?? '',
      fecha_cotizacion: project?.fecha_cotizacion ?? '',
      salesperson: project?.salesperson ?? '',
      fecha_entrega_estimada: project?.fecha_entrega_estimada ?? '',
      notas: project?.notas ?? '',
    },
  })

  async function onSubmit(values: ProjectFormValues) {
    setServerError(null)

    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      if (value != null && value !== '') {
        formData.append(key, value)
      }
    })

    let result: { error?: string } | undefined

    if (isEditMode && project) {
      result = await updateProjectAction(project.id, formData)
    } else {
      result = await createProjectAction(formData)
    }

    if (result?.error) {
      setServerError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* Nombre del Proyecto */}
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre del Proyecto *</Label>
        <Input
          id="nombre"
          {...register('nombre')}
          placeholder="Ej. Cocina integral para oficina"
          className="w-full"
        />
        {errors.nombre && (
          <p className="text-sm text-destructive">{errors.nombre.message}</p>
        )}
      </div>

      {/* Cliente */}
      <div className="space-y-2">
        <Label htmlFor="cliente_nombre">Cliente *</Label>
        <Input
          id="cliente_nombre"
          {...register('cliente_nombre')}
          placeholder="Nombre del cliente"
          className="w-full"
        />
        {errors.cliente_nombre && (
          <p className="text-sm text-destructive">{errors.cliente_nombre.message}</p>
        )}
      </div>

      {/* Número de Cotización */}
      <div className="space-y-2">
        <Label htmlFor="numero_cotizacion">Número de Cotización</Label>
        <Input
          id="numero_cotizacion"
          {...register('numero_cotizacion')}
          placeholder="Ej. COT-2026-001"
          className="w-full"
        />
      </div>

      {/* Fecha de Cotización */}
      <div className="space-y-2">
        <Label htmlFor="fecha_cotizacion">Fecha de Cotización</Label>
        <Input
          id="fecha_cotizacion"
          type="date"
          {...register('fecha_cotizacion')}
          className="w-full"
        />
      </div>

      {/* Vendedor */}
      <div className="space-y-2">
        <Label htmlFor="salesperson">Vendedor</Label>
        <Input
          id="salesperson"
          {...register('salesperson')}
          placeholder="Nombre del vendedor"
          className="w-full"
        />
      </div>

      {/* Fecha de Entrega Estimada */}
      <div className="space-y-2">
        <Label htmlFor="fecha_entrega_estimada">Entrega Estimada</Label>
        <Input
          id="fecha_entrega_estimada"
          type="date"
          {...register('fecha_entrega_estimada')}
          className="w-full"
        />
      </div>

      {/* Notas Internas */}
      <div className="space-y-2">
        <Label htmlFor="notas">Notas Internas</Label>
        <Textarea
          id="notas"
          {...register('notas')}
          placeholder="Notas internas del proyecto..."
          rows={4}
          className="w-full resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting
            ? 'Guardando...'
            : isEditMode
            ? 'Guardar Cambios'
            : 'Crear Proyecto'}
        </Button>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/proyectos">Cancelar</Link>
        </Button>
      </div>
    </form>
  )
}
