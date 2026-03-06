'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PencilIcon, PlusIcon, TrashIcon } from 'lucide-react'

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
import { calcMargenFromPrecio, calcTotalCostoFromCosts } from '@/lib/calculations'
import { formatMXN } from '@/lib/formatters'
import {
  createLineItemAction,
  updateLineItemAction,
  createLineItemCostAction,
  deleteLineItemCostAction,
} from '@/lib/actions/line-items'

// Client-side validation schema — precio_venta as direct input
const formSchema = z.object({
  descripcion: z.string().min(1, 'La descripcion es requerida'),
  referencia: z.string().optional(),
  dimensiones: z.string().optional(),
  cantidad: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
  precio_venta: z.coerce.number().nonnegative('El precio de venta no puede ser negativo'),
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

  // State for the add-cost row sub-panel
  const [newCostSupplierId, setNewCostSupplierId] = useState<string>('')
  const [newCostAmount, setNewCostAmount] = useState<string>('')
  const [costError, setCostError] = useState<string | null>(null)
  const [isAddingCost, setIsAddingCost] = useState(false)

  const isEditMode = Boolean(lineItem)

  const defaultValues: FormValues = lineItem
    ? {
        descripcion: lineItem.descripcion,
        referencia: lineItem.referencia ?? '',
        dimensiones: lineItem.dimensiones ?? '',
        cantidad: lineItem.cantidad,
        precio_venta: lineItem.precio_venta,
      }
    : {
        descripcion: '',
        referencia: '',
        dimensiones: '',
        cantidad: 1,
        precio_venta: 0,
      }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  // Compute margin from current cost rows (read-only display)
  const precioVenta = form.watch('precio_venta') ?? 0
  const existingCosts = lineItem?.line_item_costs ?? []
  const totalCostoUnitario = calcTotalCostoFromCosts(existingCosts)
  const margenDecimal = calcMargenFromPrecio(Number(precioVenta), totalCostoUnitario)
  const margenDisplay = (margenDecimal * 100).toFixed(1)

  async function onSubmit(values: FormValues) {
    setServerError(null)

    const formData = new FormData()
    formData.append('project_id', projectId)
    formData.append('descripcion', values.descripcion)
    formData.append('referencia', values.referencia ?? '')
    formData.append('dimensiones', values.dimensiones ?? '')
    formData.append('cantidad', String(values.cantidad))
    formData.append('precio_venta', String(values.precio_venta))

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
  }

  async function handleAddCost() {
    setCostError(null)
    if (!newCostSupplierId) {
      setCostError('Selecciona un proveedor')
      return
    }
    const costoNum = parseFloat(newCostAmount)
    if (isNaN(costoNum) || costoNum < 0) {
      setCostError('Ingresa un costo valido')
      return
    }
    if (!lineItem?.id) return

    setIsAddingCost(true)
    const fd = new FormData()
    fd.append('line_item_id', lineItem.id)
    fd.append('supplier_id', newCostSupplierId)
    fd.append('costo', String(costoNum))

    const result = await createLineItemCostAction(fd)
    setIsAddingCost(false)

    if (result.error) {
      setCostError(result.error)
      return
    }

    // Reset add-cost form
    setNewCostSupplierId('')
    setNewCostAmount('')
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      form.reset(defaultValues)
      setServerError(null)
      setNewCostSupplierId('')
      setNewCostAmount('')
      setCostError(null)
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
              Descripcion <span className="text-destructive">*</span>
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

          {/* Precio de Venta */}
          <div className="space-y-1">
            <Label htmlFor="precio_venta">
              Precio de Venta (MXN) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="precio_venta"
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              {...form.register('precio_venta')}
            />
            {form.formState.errors.precio_venta && (
              <p className="text-sm text-destructive">
                {form.formState.errors.precio_venta.message}
              </p>
            )}
          </div>

          {/* Cost Rows Sub-panel — visible only when editing an existing line item */}
          {isEditMode && lineItem && (
            <div className="space-y-3 rounded-md border p-3">
              <h4 className="text-sm font-medium">Costos por Proveedor</h4>

              {/* Existing cost rows */}
              {existingCosts.length > 0 ? (
                <div className="space-y-1.5">
                  {existingCosts.map((cost) => (
                    <div
                      key={cost.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        {cost.suppliers?.nombre ?? 'Proveedor desconocido'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>{formatMXN(Number(cost.costo))}</span>
                        <form
                          action={async (fd) => {
                            await deleteLineItemCostAction(fd)
                          }}
                        >
                          <input type="hidden" name="costRowId" value={cost.id} />
                          <input type="hidden" name="lineItemId" value={lineItem.id} />
                          <button
                            type="submit"
                            className="text-destructive hover:text-destructive/80 transition-colors"
                            aria-label="Eliminar costo"
                            onClick={(e) => {
                              if (!confirm('Eliminar este costo?')) e.preventDefault()
                            }}
                          >
                            <TrashIcon className="size-3.5" />
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sin costos registrados.</p>
              )}

              {/* Add cost row */}
              <div className="space-y-2 pt-1 border-t">
                <p className="text-xs text-muted-foreground">Agregar costo</p>
                <div className="flex gap-2">
                  <Select
                    value={newCostSupplierId}
                    onValueChange={setNewCostSupplierId}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    value={newCostAmount}
                    onChange={(e) => setNewCostAmount(e.target.value)}
                    className="w-28"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddCost}
                    disabled={isAddingCost}
                  >
                    {isAddingCost ? 'Agregando...' : 'Agregar Costo'}
                  </Button>
                </div>
                {costError && (
                  <p className="text-sm text-destructive">{costError}</p>
                )}
              </div>

              {/* Computed margin display */}
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                <span className="text-muted-foreground">Costo total unitario: </span>
                <span className="font-medium">{formatMXN(totalCostoUnitario)}</span>
                <span className="text-muted-foreground ml-3">Margen: </span>
                <span className="font-medium">{margenDisplay}%</span>
              </div>
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
