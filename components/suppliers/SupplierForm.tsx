'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

import { createSupplierAction } from '@/lib/actions/suppliers'

const formSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  contacto: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  notas: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

const defaultValues: FormValues = {
  nombre: '',
  contacto: '',
  email: '',
  telefono: '',
  notas: '',
}

export function SupplierForm() {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  async function onSubmit(values: FormValues) {
    setServerError(null)

    const formData = new FormData()
    formData.append('nombre', values.nombre)
    formData.append('contacto', values.contacto ?? '')
    formData.append('email', values.email ?? '')
    formData.append('telefono', values.telefono ?? '')
    formData.append('notas', values.notas ?? '')

    const result = await createSupplierAction(formData)

    if (result.error) {
      setServerError(result.error)
      return
    }

    setOpen(false)
    form.reset(defaultValues)
    setServerError(null)
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      form.reset(defaultValues)
      setServerError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <PlusIcon className="size-4" />
          Nuevo Proveedor
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Proveedor</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1">
            <Label htmlFor="nombre">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nombre"
              placeholder="Ej: Innovika"
              {...form.register('nombre')}
            />
            {form.formState.errors.nombre && (
              <p className="text-sm text-destructive">
                {form.formState.errors.nombre.message}
              </p>
            )}
          </div>

          {/* Contacto */}
          <div className="space-y-1">
            <Label htmlFor="contacto">Contacto</Label>
            <Input
              id="contacto"
              placeholder="Nombre del contacto"
              {...form.register('contacto')}
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="contacto@empresa.com"
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* Teléfono */}
          <div className="space-y-1">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              placeholder="Ej: 55 1234 5678"
              {...form.register('telefono')}
            />
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <Label htmlFor="notas">Notas</Label>
            <textarea
              id="notas"
              placeholder="Notas adicionales..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...form.register('notas')}
            />
          </div>

          {/* Server Error */}
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando...' : 'Crear Proveedor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
