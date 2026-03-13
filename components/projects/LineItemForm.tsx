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
import { Separator } from '@/components/ui/separator'

import { LineItem } from '@/lib/types'
import { calcMargenFromPrecio, calcTotalCostoFromCosts } from '@/lib/calculations'
import { formatMXN } from '@/lib/formatters'
import {
  createLineItemAction,
  updateLineItemAction,
  createLineItemCostAction,
  deleteLineItemCostAction,
} from '@/lib/actions/line-items'

const formSchema = z.object({
  descripcion: z.string().min(1, 'La descripcion es requerida'),
  referencia: z.string().optional(),
  dimensiones: z.string().optional(),
  cantidad: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
  precio_venta: z.coerce.number().nonnegative('El precio de venta no puede ser negativo'),
  descuento: z.coerce.number().min(0).max(100).default(0),
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
        descuento: lineItem.descuento ?? 0,
      }
    : {
        descripcion: '',
        referencia: '',
        dimensiones: '',
        cantidad: 1,
        precio_venta: 0,
        descuento: 0,
      }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  const precioVenta = form.watch('precio_venta') ?? 0
  const existingCosts = lineItem?.line_item_costs ?? []
  const totalCostoUnitario = calcTotalCostoFromCosts(existingCosts)
  const margenDecimal = calcMargenFromPrecio(Number(precioVenta), totalCostoUnitario)
  const margenPct = (margenDecimal * 100).toFixed(1)
  const margenColor =
    margenDecimal >= 0.4
      ? 'text-green-600'
      : margenDecimal >= 0.2
      ? 'text-amber-600'
      : 'text-red-600'

  // Editable margen state — user can type a target margin% to back-calculate precio_venta
  const [isEditingMargen, setIsEditingMargen] = useState(false)
  const [margenInputValue, setMargenInputValue] = useState('')

  function handleMargenClick() {
    setMargenInputValue(margenPct)
    setIsEditingMargen(true)
  }

  function handleMargenCommit() {
    setIsEditingMargen(false)
    const targetMargen = parseFloat(margenInputValue)
    if (isNaN(targetMargen) || targetMargen >= 100) return
    if (totalCostoUnitario <= 0) return
    // precio_venta = totalCosto / (1 - margen/100)
    const newPrecio = totalCostoUnitario / (1 - targetMargen / 100)
    form.setValue('precio_venta', Math.round(newPrecio * 100) / 100)
  }

  function handleMargenKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleMargenCommit()
    }
    if (e.key === 'Escape') {
      setIsEditingMargen(false)
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
    formData.append('precio_venta', String(values.precio_venta))
    formData.append('descuento', String(values.descuento))

    const result = isEditMode && lineItem
      ? await updateLineItemAction(lineItem.id, formData)
      : await createLineItemAction(formData)

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
          <div className="space-y-1.5">
            <Label htmlFor="descripcion">
              Descripcion <span className="text-destructive">*</span>
            </Label>
            <Input
              id="descripcion"
              placeholder="Ej: Mesa de madera"
              {...form.register('descripcion')}
            />
            {form.formState.errors.descripcion && (
              <p className="text-xs text-destructive">
                {form.formState.errors.descripcion.message}
              </p>
            )}
          </div>

          {/* Referencia + Dimensiones */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="referencia">Referencia</Label>
              <Input
                id="referencia"
                placeholder="REF-001"
                {...form.register('referencia')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dimensiones">Dimensiones</Label>
              <Input
                id="dimensiones"
                placeholder="120x60x75 cm"
                {...form.register('dimensiones')}
              />
            </div>
          </div>

          {/* Cantidad + Precio de Venta + Descuento */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
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
                <p className="text-xs text-destructive">
                  {form.formState.errors.cantidad.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="precio_venta">
                Precio de Venta <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">
                  $
                </span>
                <Input
                  id="precio_venta"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  className="pl-6"
                  {...form.register('precio_venta')}
                />
              </div>
              {form.formState.errors.precio_venta && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.precio_venta.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="descuento">Descuento %</Label>
              <Input
                id="descuento"
                type="number"
                min={0}
                max={100}
                step={0.01}
                placeholder="0"
                {...form.register('descuento')}
              />
              {form.formState.errors.descuento && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.descuento.message}
                </p>
              )}
            </div>
          </div>

          {/* Cost Panel — only when editing an existing line item */}
          {isEditMode && lineItem && (
            <>
              <Separator />

              <div className="space-y-3">
                {/* Section header */}
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Costos por Proveedor</h4>
                  {existingCosts.length > 0 && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {existingCosts.length} {existingCosts.length === 1 ? 'costo' : 'costos'}
                    </span>
                  )}
                </div>

                {/* Existing cost rows */}
                {existingCosts.length > 0 ? (
                  <div className="divide-y rounded-md border">
                    {existingCosts.map((cost) => (
                      <div
                        key={cost.id}
                        className="flex items-center justify-between px-3 py-2"
                      >
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                          {cost.suppliers?.nombre ?? 'Proveedor desconocido'}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium tabular-nums">
                            {formatMXN(Number(cost.costo))}
                          </span>
                          <form
                            action={async (fd) => {
                              await deleteLineItemCostAction(fd)
                            }}
                          >
                            <input type="hidden" name="costRowId" value={cost.id} />
                            <input type="hidden" name="lineItemId" value={lineItem.id} />
                            <button
                              type="submit"
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              aria-label="Eliminar costo"
                              onClick={(e) => {
                                if (!confirm('¿Eliminar este costo?')) e.preventDefault()
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
                  <p className="text-xs text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center">
                    Sin costos registrados. Agrega el costo de cada proveedor abajo.
                  </p>
                )}

                {/* Add cost row */}
                <div className="rounded-md bg-muted/50 p-3 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Agregar costo
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Proveedor</Label>
                      <Select
                        value={newCostSupplierId}
                        onValueChange={setNewCostSupplierId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Costo unitario</Label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">
                          $
                        </span>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder="0.00"
                          className="pl-6"
                          value={newCostAmount}
                          onChange={(e) => setNewCostAmount(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={handleAddCost}
                    disabled={isAddingCost}
                  >
                    <PlusIcon className="size-3.5 mr-1" />
                    {isAddingCost ? 'Agregando...' : 'Agregar Costo'}
                  </Button>
                  {costError && (
                    <p className="text-xs text-destructive">{costError}</p>
                  )}
                </div>

                {/* Financial summary — Precio | Costo | Margen */}
                <div className="grid grid-cols-3 divide-x rounded-md border text-center">
                  <div className="px-3 py-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                      Precio venta
                    </p>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatMXN(Number(precioVenta))}
                    </p>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                      Costo total
                    </p>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatMXN(totalCostoUnitario)}
                    </p>
                  </div>
                  <div
                    className="px-3 py-2 cursor-pointer group"
                    onClick={!isEditingMargen ? handleMargenClick : undefined}
                    title="Click para editar margen"
                  >
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                      Margen
                      <span className="ml-1 opacity-0 group-hover:opacity-60 text-[9px] normal-case tracking-normal">
                        editar
                      </span>
                    </p>
                    {isEditingMargen ? (
                      <div className="flex items-center gap-0.5">
                        <input
                          type="number"
                          min={0}
                          max={99}
                          step={0.1}
                          autoFocus
                          value={margenInputValue}
                          onChange={(e) => setMargenInputValue(e.target.value)}
                          onBlur={handleMargenCommit}
                          onKeyDown={handleMargenKeyDown}
                          className="w-14 rounded border bg-background px-1.5 py-0.5 text-sm font-bold text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <span className="text-sm font-bold text-muted-foreground">%</span>
                      </div>
                    ) : (
                      <p className={`text-sm font-bold tabular-nums ${margenColor}`}>
                        {margenPct}%
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

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
