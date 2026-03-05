'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2 } from 'lucide-react'

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

import type { PaymentClient } from '@/lib/types'
import {
  calcAnticipo,
  calcSaldo,
  calcTotalPagadoCliente,
  calcSaldoPendienteCliente,
} from '@/lib/calculations'
import { formatMXN, formatFecha } from '@/lib/formatters'
import {
  createClientPaymentAction,
  deleteClientPaymentAction,
} from '@/lib/actions/payments-client'

// Client-side form validation schema
const formSchema = z.object({
  tipo: z.enum(['anticipo', 'finiquito', 'otro']),
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
  fecha: z.string().min(1, 'La fecha es requerida'),
  notas: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface ClientPaymentPanelProps {
  projectId: string
  granTotal: number       // computed server-side from calcTotal(calcSubtotal(lineItems))
  payments: PaymentClient[] // monto already coerced to number by getClientPayments()
}

export function ClientPaymentPanel({
  projectId,
  granTotal,
  payments,
}: ClientPaymentPanelProps) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const anticipoEsperado = calcAnticipo(granTotal)
  const saldoEsperado = calcSaldo(granTotal)
  const totalCobrado = calcTotalPagadoCliente(payments)
  const saldoPendiente = calcSaldoPendienteCliente(granTotal, totalCobrado)

  const defaultValues: FormValues = {
    tipo: 'anticipo',
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
    formData.append('tipo', values.tipo)
    formData.append('monto', String(values.monto))
    formData.append('fecha', values.fecha)
    formData.append('notas', values.notas ?? '')

    const result = await createClientPaymentAction(formData)

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
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Resumen de Pagos del Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Anticipo Esperado (70%)</span>
            <span>{formatMXN(anticipoEsperado)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Finiquito Esperado (30%)</span>
            <span>{formatMXN(saldoEsperado)}</span>
          </div>

          <Separator />

          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Cobrado</span>
            <span className="font-medium">{formatMXN(totalCobrado)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Saldo Pendiente</span>
            {saldoPendiente <= 0 ? (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle2 className="size-4" />
                {formatMXN(saldoPendiente)}
              </span>
            ) : (
              <span>{formatMXN(saldoPendiente)}</span>
            )}
          </div>
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
              Registrar Pago
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Pago del Cliente</DialogTitle>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Tipo */}
              <div className="space-y-1">
                <Label>
                  Tipo de Pago <span className="text-destructive">*</span>
                </Label>
                <Select
                  defaultValue={defaultValues.tipo}
                  onValueChange={(val) =>
                    form.setValue('tipo', val as 'anticipo' | 'finiquito' | 'otro')
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anticipo">Anticipo</SelectItem>
                    <SelectItem value="finiquito">Finiquito (Saldo Final)</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.tipo && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.tipo.message}
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
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Tipo</th>
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
                  <td className="px-3 py-2 capitalize">
                    {payment.tipo === 'finiquito' ? 'Finiquito' : payment.tipo.charAt(0).toUpperCase() + payment.tipo.slice(1)}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {formatMXN(payment.monto)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate">
                    {payment.notas ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <form action={async (fd) => { await deleteClientPaymentAction(fd) }}>
                      <input type="hidden" name="paymentId" value={payment.id} />
                      <input type="hidden" name="projectId" value={projectId} />
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
