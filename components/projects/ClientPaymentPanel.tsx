'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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

interface ClientPaymentPanelProps {
  projectId: string
  granTotal: number
  payments: PaymentClient[]
}

interface QuickPayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  tipo: 'anticipo' | 'finiquito'
  stageLabel: string
  defaultAmount: number
}

function QuickPayDialog({
  open,
  onOpenChange,
  projectId,
  tipo,
  stageLabel,
  defaultAmount,
}: QuickPayDialogProps) {
  const today = new Date().toISOString().split('T')[0]
  const [monto, setMonto] = useState(defaultAmount.toFixed(2))
  const [fecha, setFecha] = useState(today)
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const montoNum = parseFloat(monto)
    if (isNaN(montoNum) || montoNum <= 0) {
      setError('El monto debe ser mayor a 0')
      return
    }
    if (!fecha) {
      setError('La fecha es requerida')
      return
    }
    setLoading(true)
    const fd = new FormData()
    fd.append('project_id', projectId)
    fd.append('tipo', tipo)
    fd.append('monto', String(montoNum))
    fd.append('fecha', fecha)
    fd.append('notas', notas)
    const result = await createClientPaymentAction(fd)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onOpenChange(false)
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      setError(null)
      setMonto(defaultAmount.toFixed(2))
      setFecha(today)
      setNotas('')
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{stageLabel}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cp-monto">Monto (MXN)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">
                $
              </span>
              <Input
                id="cp-monto"
                type="number"
                min={0.01}
                step={0.01}
                className="pl-6"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-fecha">Fecha de Pago</Label>
            <Input
              id="cp-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-notas">Notas (opcional)</Label>
            <Textarea
              id="cp-notas"
              placeholder="Ej: Transferencia BBVA"
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Pago'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ClientPaymentPanel({
  projectId,
  granTotal,
  payments,
}: ClientPaymentPanelProps) {
  const [activeStage, setActiveStage] = useState<'anticipo' | 'finiquito' | null>(null)

  const anticipoEsperado = calcAnticipo(granTotal)
  const finiquitoEsperado = calcSaldo(granTotal)
  const totalCobrado = calcTotalPagadoCliente(payments)
  const saldoPendiente = calcSaldoPendienteCliente(granTotal, totalCobrado)

  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  )

  // Stage status based on cumulative collected
  const anticipoPaid = totalCobrado >= anticipoEsperado - 0.01
  const finiquitoPaid = totalCobrado >= granTotal - 0.01

  const anticipoPayment = anticipoPaid
    ? sortedPayments.find((p) => p.tipo === 'anticipo') ?? sortedPayments[0] ?? null
    : null
  const finiquitoPayment = finiquitoPaid
    ? sortedPayments.find((p) => p.tipo === 'finiquito') ?? sortedPayments[sortedPayments.length - 1] ?? null
    : null

  if (granTotal <= 0) {
    return (
      <p className="text-sm text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center">
        Agrega partidas al proyecto para ver el resumen de cobros.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary totals */}
      <div className="grid grid-cols-3 divide-x rounded-md border text-center">
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
            Total del proyecto
          </p>
          <p className="text-sm font-semibold tabular-nums">{formatMXN(granTotal)}</p>
        </div>
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
            Cobrado
          </p>
          <p className="text-sm font-semibold tabular-nums">{formatMXN(totalCobrado)}</p>
        </div>
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
            Pendiente
          </p>
          <p className={`text-sm font-bold tabular-nums ${saldoPendiente <= 0.01 ? 'text-green-600' : ''}`}>
            {formatMXN(saldoPendiente)}
          </p>
        </div>
      </div>

      {/* Payment flow */}
      <div className="rounded-md border overflow-hidden">
        {/* Anticipo */}
        <StageRow
          label="Anticipo"
          pct={70}
          amount={anticipoEsperado}
          paid={anticipoPaid}
          payment={anticipoPayment}
          locked={false}
          onRegister={() => setActiveStage('anticipo')}
        />
        <div className="border-t" />
        {/* Finiquito */}
        <StageRow
          label="Finiquito"
          pct={30}
          amount={finiquitoEsperado}
          paid={finiquitoPaid}
          payment={finiquitoPayment}
          locked={!anticipoPaid}
          onRegister={() => setActiveStage('finiquito')}
        />
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="rounded-md border overflow-hidden">
          <div className="px-4 py-2 bg-muted/30 border-b">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Historial de pagos
            </p>
          </div>
          <div className="divide-y">
            {sortedPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-muted-foreground w-24 flex-shrink-0">
                  {formatFecha(p.fecha)}
                </span>
                <span className="capitalize flex-1 text-muted-foreground">
                  {p.tipo === 'finiquito' ? 'Finiquito' : p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1)}
                </span>
                <span className="tabular-nums font-medium">{formatMXN(p.monto)}</span>
                {p.notas && (
                  <span className="text-muted-foreground ml-4 max-w-[160px] truncate text-xs">
                    {p.notas}
                  </span>
                )}
                <form
                  className="ml-4"
                  action={async (fd) => { await deleteClientPaymentAction(fd) }}
                >
                  <input type="hidden" name="paymentId" value={p.id} />
                  <input type="hidden" name="projectId" value={projectId} />
                  <button
                    type="submit"
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Eliminar
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick pay dialog */}
      {activeStage && (
        <QuickPayDialog
          open={true}
          onOpenChange={(isOpen) => { if (!isOpen) setActiveStage(null) }}
          projectId={projectId}
          tipo={activeStage}
          stageLabel={activeStage === 'anticipo' ? 'Anticipo (70%)' : 'Finiquito (30%)'}
          defaultAmount={activeStage === 'anticipo' ? anticipoEsperado : finiquitoEsperado}
        />
      )}
    </div>
  )
}

// ─── Stage row ───────────────────────────────────────────────────────────────

interface StageRowProps {
  label: string
  pct: number
  amount: number
  paid: boolean
  payment: PaymentClient | null
  locked: boolean
  onRegister: () => void
}

function StageRow({ label, pct, amount, paid, payment, locked, onRegister }: StageRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div
          className={`size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
            paid
              ? 'bg-green-500 border-green-500'
              : locked
              ? 'border-muted-foreground/30'
              : 'border-muted-foreground/50'
          }`}
        >
          {paid && (
            <svg className="size-3 text-white" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6l3 3 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        <div>
          <p className={`text-sm font-medium ${locked && !paid ? 'text-muted-foreground' : ''}`}>
            {label}{' '}
            <span className="text-xs font-normal text-muted-foreground">{pct}%</span>
          </p>
          {paid && payment && (
            <p className="text-xs text-muted-foreground">
              Cobrado el {formatFecha(payment.fecha)}
            </p>
          )}
          {locked && !paid && (
            <p className="text-xs text-muted-foreground">
              Disponible al cobrar el anticipo
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`text-sm tabular-nums font-medium ${locked && !paid ? 'text-muted-foreground' : ''}`}
        >
          {formatMXN(amount)}
        </span>
        {!paid && !locked && (
          <Button type="button" size="sm" variant="outline" onClick={onRegister}>
            Registrar Pago
          </Button>
        )}
        {paid && (
          <span className="text-xs text-green-600 font-medium">Cobrado</span>
        )}
        {locked && !paid && (
          <span className="text-xs text-muted-foreground/60">Pendiente</span>
        )}
      </div>
    </div>
  )
}
