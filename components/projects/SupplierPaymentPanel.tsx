'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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

import type { PaymentSupplier } from '@/lib/types'
import {
  calcTotalCostoProyecto,
  calcTotalPagadoProveedor,
  calcSaldoProveedor,
} from '@/lib/calculations'
import { formatMXN, formatFecha } from '@/lib/formatters'
import {
  createSupplierPaymentAction,
  deleteSupplierPaymentAction,
} from '@/lib/actions/payments-supplier'

// Client-side form validation schema
const formSchema = z.object({
  supplier_id: z.string().uuid('Selecciona un proveedor'),
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
  fecha: z.string().min(1, 'La fecha es requerida'),
  notas: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface SupplierPaymentPanelProps {
  projectId: string
  lineItems: Array<{
    costo_proveedor: number
    cantidad: number
    proveedor_id: string | null
    suppliers: { id: string; nombre: string } | null
  }>
  payments: PaymentSupplier[]  // monto already coerced by getSupplierPayments()
  suppliers: Array<{ id: string; nombre: string }>  // full list fallback
}

export function SupplierPaymentPanel({
  projectId,
  lineItems,
  payments,
  suppliers,
}: SupplierPaymentPanelProps) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Derive suppliers that have line items on this project
  const suppliersOnProjectMap = new Map<string, { id: string; nombre: string }>()
  for (const item of lineItems) {
    if (item.proveedor_id && item.suppliers) {
      suppliersOnProjectMap.set(item.proveedor_id, {
        id: item.suppliers.id,
        nombre: item.suppliers.nombre,
      })
    }
  }
  // Fall back to full suppliers list if no suppliers on line items
  const suppliersOnProject =
    suppliersOnProjectMap.size > 0
      ? Array.from(suppliersOnProjectMap.values())
      : suppliers

  // Compute per-supplier breakdown
  const supplierBreakdown = suppliersOnProject.map((supplier) => {
    const supplierLineItems = lineItems.filter(
      (item) => item.proveedor_id === supplier.id
    )
    const totalOwed = calcTotalCostoProyecto(supplierLineItems)
    const supplierPayments = payments.filter(
      (p) => p.supplier_id === supplier.id
    )
    const totalPagado = calcTotalPagadoProveedor(supplierPayments)
    const saldo = calcSaldoProveedor(totalOwed, totalPagado)
    return { supplier, totalOwed, totalPagado, saldo }
  })

  // Grand totals
  const grandOwed = supplierBreakdown.reduce((sum, row) => sum + row.totalOwed, 0)
  const grandPagado = supplierBreakdown.reduce((sum, row) => sum + row.totalPagado, 0)
  const grandSaldo = calcSaldoProveedor(grandOwed, grandPagado)

  const defaultValues: FormValues = {
    supplier_id: '',
    monto: 0,
    fecha: '',
    notas: '',
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  async function onSubmit(values: FormValues) {
    setServerError(null)

    const formData = new FormData()
    formData.append('project_id', projectId)
    formData.append('supplier_id', values.supplier_id)
    formData.append('monto', String(values.monto))
    formData.append('fecha', values.fecha)
    formData.append('notas', values.notas ?? '')

    const result = await createSupplierPaymentAction(formData)

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

  // Lookup supplier name from payments
  function getSupplierName(supplierId: string | null): string {
    if (!supplierId) return '—'
    const found = suppliersOnProject.find((s) => s.id === supplierId)
    return found?.nombre ?? '—'
  }

  return (
    <div className="space-y-4">
      {/* Per-supplier summary card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Resumen de Pagos a Proveedores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {suppliersOnProject.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay proveedores en las partidas de este proyecto.
            </p>
          ) : (
            <>
              {/* Header row */}
              <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground pb-1">
                <span>Proveedor</span>
                <span className="text-right">Por Pagar</span>
                <span className="text-right">Pagado</span>
                <span className="text-right">Saldo</span>
              </div>

              {supplierBreakdown.map(({ supplier, totalOwed, totalPagado, saldo }) => (
                <div key={supplier.id} className="grid grid-cols-4 gap-2">
                  <span className="truncate">{supplier.nombre}</span>
                  <span className="text-right">{formatMXN(totalOwed)}</span>
                  <span className="text-right">{formatMXN(totalPagado)}</span>
                  <span className={`text-right font-medium ${saldo <= 0 ? 'text-green-600 dark:text-green-400' : ''}`}>
                    {formatMXN(saldo)}
                  </span>
                </div>
              ))}

              <Separator />

              {/* Grand total row */}
              <div className="grid grid-cols-4 gap-2 font-semibold">
                <span>Total</span>
                <span className="text-right">{formatMXN(grandOwed)}</span>
                <span className="text-right">{formatMXN(grandPagado)}</span>
                <span className={`text-right ${grandSaldo <= 0 ? 'text-green-600 dark:text-green-400' : ''}`}>
                  {formatMXN(grandSaldo)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Register Payment Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {payments.length === 0
            ? 'No hay pagos registrados'
            : `${payments.length} pago${payments.length === 1 ? '' : 's'} registrado${payments.length === 1 ? '' : 's'}`}
        </p>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm">
              Registrar Pago a Proveedor
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Pago a Proveedor</DialogTitle>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Proveedor */}
              <div className="space-y-1">
                <Label>
                  Proveedor <span className="text-destructive">*</span>
                </Label>
                <Select
                  onValueChange={(val) => form.setValue('supplier_id', val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliersOnProject.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.supplier_id && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.supplier_id.message}
                  </p>
                )}
              </div>

              {/* Monto */}
              <div className="space-y-1">
                <Label htmlFor="monto">
                  Monto (MXN) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  {...form.register('monto')}
                />
                {form.formState.errors.monto && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.monto.message}
                  </p>
                )}
              </div>

              {/* Fecha */}
              <div className="space-y-1">
                <Label htmlFor="fecha">
                  Fecha de Pago <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fecha"
                  type="date"
                  {...form.register('fecha')}
                />
                {form.formState.errors.fecha && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.fecha.message}
                  </p>
                )}
              </div>

              {/* Notas */}
              <div className="space-y-1">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  placeholder="Notas opcionales..."
                  rows={3}
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
                  {form.formState.isSubmitting ? 'Registrando...' : 'Registrar Pago'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Fecha</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Proveedor</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Monto</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Notas</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatFecha(payment.fecha)}
                  </td>
                  <td className="px-3 py-2">
                    {getSupplierName(payment.supplier_id)}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {formatMXN(payment.monto)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate">
                    {payment.notas ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <form action={async (fd) => { await deleteSupplierPaymentAction(fd) }}>
                      <input type="hidden" name="paymentId" value={payment.id} />
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="supplierId" value={payment.supplier_id ?? ''} />
                      <button
                        type="submit"
                        className="text-xs text-destructive hover:text-destructive/80 transition-colors"
                      >
                        Eliminar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
