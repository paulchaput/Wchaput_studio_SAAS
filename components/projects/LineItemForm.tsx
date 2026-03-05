'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PencilIcon, PlusIcon } from 'lucide-react'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { LineItem } from '@/lib/types'
import { calcPrecioVenta } from '@/lib/calculations'
import { formatMXN, margenToPercent } from '@/lib/formatters'
import { createLineItemAction, updateLineItemAction } from '@/lib/actions/line-items'

// Client-side validation schema — margen as percentage integer (e.g. 50)
// The server action does the percent→decimal conversion (50 → 0.50)
const formSchema = z.object({
  descripcion: z.string().min(1, 'La descripción es requerida'),
  referencia: z.string().optional(),
  dimensiones: z.string().optional(),
  cantidad: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
  proveedor_id: z.string().optional().nullable(),
  costo_proveedor: z.coerce.number().nonnegative('El costo no puede ser negativo'),
  margen: z.coerce.number().min(0).max(99, 'El margen no puede ser 100% o más'),
})

type FormValues = z.infer<typeof formSchema>

interface LineItemFormProps {
  projectId: string
  suppliers: Array<{ id: string; nombre: string }>
  lineItem?: LineItem
}

export function LineItemForm({ projectId, suppliers, lineItem }: LineItemFormProps) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [precioPreview, setPrecioPreview] = useState<string | null>(null)

  const isEditMode = Boolean(lineItem)

  const defaultValues: FormValues = lineItem
    ? {
        descripcion: lineItem.descripcion,
        referencia: lineItem.referencia ?? '',
        dimensiones: lineItem.dimensiones ?? '',
        cantidad: lineItem.cantidad,
        proveedor_id: lineItem.proveedor_id ?? null,
        costo_proveedor: lineItem.costo_proveedor,
        // margenToPercent: 0.50 → "50"
        margen: parseFloat(margenToPercent(lineItem.margen)),
      }
    : {
        descripcion: '',
        referencia: '',
        dimensiones: '',
        cantidad: 1,
        proveedor_id: null,
        costo_proveedor: 0,
        margen: 50,
      }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  function updatePrecioPreview() {
    const costo = form.getValues('costo_proveedor')
    const margenPct = form.getValues('margen')
    if (costo >= 0 && margenPct >= 0 && margenPct < 100) {
      const margenDecimal = margenPct / 100
      try {
        const precio = calcPrecioVenta(costo, margenDecimal)
        setPrecioPreview(formatMXN(precio))
      } catch {
        setPrecioPreview(null)
      }
    } else {
      setPrecioPreview(null)
    }
  }

  async function onSubmit(values: FormValues) {
    setServerError(null)

    const formData = new FormData()
    formData.append('project_id', projectId)
    formData.append('descripcion', values.descripcion)
    formData.append('referencia', values.referencia ?? '')
    formData.append('dimensiones', values.dimensiones ?? '')
    formData.append('cantidad', String(values.cantidad))
    formData.append('proveedor_id', values.proveedor_id ?? '')
    formData.append('costo_proveedor', String(values.costo_proveedor))
    formData.append('margen', String(values.margen))

    let result: { error?: string }

    if (isEditMode && lineItem) {
      result = await updateLineItemAction(lineItem.id, formData)
    } else {
      result = await createLineItemAction(formData)
    }

    if (result.error) {
      setServerError(result.error)
      return
    }

    setOpen(false)
    form.reset(defaultValues)
    setServerError(null)
    setPrecioPreview(null)
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      form.reset(defaultValues)
      setServerError(null)
      setPrecioPreview(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEditMode ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Editar partida"
          >
            <PencilIcon className="size-4" />
          </button>
        ) : (
          <Button type="button" size="sm">
            <PlusIcon className="size-4" />
            Agregar Partida
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar Partida' : 'Agregar Partida'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Descripcion */}
          <div className="space-y-1">
            <Label htmlFor="descripcion">
              Descripción <span className="text-destructive">*</span>
            </Label>
            <Input
              id="descripcion"
              placeholder="Ej: Mesa de madera"
              {...form.register('descripcion')}
            />
            {form.formState.errors.descripcion && (
              <p className="text-sm text-destructive">
                {form.formState.errors.descripcion.message}
              </p>
            )}
          </div>

          {/* Referencia */}
          <div className="space-y-1">
            <Label htmlFor="referencia">Referencia</Label>
            <Input
              id="referencia"
              placeholder="Ej: REF-001"
              {...form.register('referencia')}
            />
          </div>

          {/* Dimensiones */}
          <div className="space-y-1">
            <Label htmlFor="dimensiones">Dimensiones</Label>
            <Input
              id="dimensiones"
              placeholder="Ej: 120x60x75 cm"
              {...form.register('dimensiones')}
            />
          </div>

          {/* Cantidad */}
          <div className="space-y-1">
            <Label htmlFor="cantidad">
              Cantidad <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cantidad"
              type="number"
              min={1}
              step={1}
              {...form.register('cantidad')}
            />
            {form.formState.errors.cantidad && (
              <p className="text-sm text-destructive">
                {form.formState.errors.cantidad.message}
              </p>
            )}
          </div>

          {/* Proveedor */}
          <div className="space-y-1">
            <Label>Proveedor</Label>
            <Select
              defaultValue={defaultValues.proveedor_id ?? 'none'}
              onValueChange={(val) =>
                form.setValue('proveedor_id', val === 'none' ? null : val)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sin proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin proveedor</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Costo Proveedor */}
          <div className="space-y-1">
            <Label htmlFor="costo_proveedor">
              Costo Proveedor <span className="text-destructive">*</span>
            </Label>
            <Input
              id="costo_proveedor"
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              {...form.register('costo_proveedor', {
                onBlur: updatePrecioPreview,
              })}
            />
            {form.formState.errors.costo_proveedor && (
              <p className="text-sm text-destructive">
                {form.formState.errors.costo_proveedor.message}
              </p>
            )}
          </div>

          {/* Margen % */}
          <div className="space-y-1">
            <Label htmlFor="margen">
              Margen % <span className="text-destructive">*</span>
            </Label>
            <Input
              id="margen"
              type="number"
              min={0}
              max={99}
              step={1}
              {...form.register('margen', {
                onBlur: updatePrecioPreview,
              })}
            />
            {form.formState.errors.margen && (
              <p className="text-sm text-destructive">
                {form.formState.errors.margen.message}
              </p>
            )}
          </div>

          {/* Precio Venta Preview */}
          {precioPreview && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">Precio de venta estimado: </span>
              <span className="font-medium">{precioPreview}</span>
            </div>
          )}

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
              {form.formState.isSubmitting
                ? 'Guardando...'
                : isEditMode
                ? 'Guardar'
                : 'Agregar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
