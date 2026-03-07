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

import type { PaymentSupplier, LineItem } from '@/lib/types'
import {
  calcTotalPagadoProveedor,
  calcSaldoProveedor,
} from '@/lib/calculations'
import { formatMXN, formatFecha } from '@/lib/formatters'
import {
  createSupplierPaymentAction,
  deleteSupplierPaymentAction,
} from '@/lib/actions/payments-supplier'

interface SupplierPaymentPanelProps {
  projectId: string
  lineItems: LineItem[]
  payments: PaymentSupplier[]
  suppliers: Array<{ id: string; nombre: string }>
}

interface QuickPayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  supplierId: string
  supplierNombre: string
  defaultAmount: number
  stageLabel: string
}

function QuickPayDialog({
  open,
  onOpenChange,
  projectId,
  supplierId,
  supplierNombre,
  defaultAmount,
  stageLabel,
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
    fd.append('supplier_id', supplierId)
    fd.append('monto', String(montoNum))
    fd.append('fecha', fecha)
    fd.append('notas', notas)
    const result = await createSupplierPaymentAction(fd)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onOpenChange(false)
    setMonto(defaultAmount.toFixed(2))
    setFecha(today)
    setNotas('')
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
          <DialogTitle>
            {stageLabel} — {supplierNombre}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="qp-monto">Monto (MXN)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">
                $
              </span>
              <Input
                id="qp-monto"
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
            <Label htmlFor="qp-fecha">Fecha de Pago</Label>
            <Input
              id="qp-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qp-notas">Notas (opcional)</Label>
            <Textarea
              id="qp-notas"
              placeholder="Ej: Transferencia bancaria"
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

export function SupplierPaymentPanel({
  projectId,
  lineItems,
  payments,
  suppliers,
}: SupplierPaymentPanelProps) {
  const [activeDialog, setActiveDialog] = useState<{
    supplierId: string
    supplierNombre: string
    defaultAmount: number
    stageLabel: string
  } | null>(null)

  // Derive unique suppliers from line_item_costs
  const suppliersOnProjectMap = new Map<string, { id: string; nombre: string }>()
  for (const item of lineItems) {
    for (const cost of (item.line_item_costs ?? [])) {
      if (cost.supplier_id && cost.suppliers) {
        suppliersOnProjectMap.set(cost.supplier_id, {
          id: cost.suppliers.id,
          nombre: cost.suppliers.nombre,
        })
      }
    }
  }
  const suppliersOnProject =
    suppliersOnProjectMap.size > 0
      ? Array.from(suppliersOnProjectMap.values())
      : suppliers

  // Per-supplier breakdown
  const supplierBreakdown = suppliersOnProject.map((supplier) => {
    const totalOwed = lineItems.reduce((sum, li) => {
      const costSum = (li.line_item_costs ?? [])
        .filter((c) => c.supplier_id === supplier.id)
        .reduce((s, c) => s + Number(c.costo), 0)
      return sum + costSum * li.cantidad
    }, 0)

    const supplierPayments = payments
      .filter((p) => p.supplier_id === supplier.id)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

    const totalPagado = calcTotalPagadoProveedor(supplierPayments)
    const saldo = calcSaldoProveedor(totalOwed, totalPagado)
    const anticipo = totalOwed * 0.5
    const finiquito = totalOwed * 0.5

    // Stage status based on cumulative payments
    const anticipoPaid = totalPagado >= anticipo - 0.01
    const finiquitoPaid = totalPagado >= totalOwed - 0.01

    // Which payment record covers each stage (for delete + date display)
    const anticipoPayment = anticipoPaid ? supplierPayments[0] ?? null : null
    const finiquitoPayment = finiquitoPaid ? supplierPayments[supplierPayments.length - 1] ?? null : null

    return {
      supplier,
      totalOwed,
      totalPagado,
      saldo,
      anticipo,
      finiquito,
      anticipoPaid,
      finiquitoPaid,
      anticipoPayment,
      finiquitoPayment,
      supplierPayments,
    }
  })

  const grandOwed = supplierBreakdown.reduce((sum, r) => sum + r.totalOwed, 0)
  const grandPagado = supplierBreakdown.reduce((sum, r) => sum + r.totalPagado, 0)
  const grandSaldo = calcSaldoProveedor(grandOwed, grandPagado)

  if (suppliersOnProject.length === 0) {
    return (
      <p className="text-sm text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center">
        No hay proveedores en las partidas de este proyecto.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary totals */}
      <div className="grid grid-cols-3 divide-x rounded-md border text-center">
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
            Total a pagar
          </p>
          <p className="text-sm font-semibold tabular-nums">{formatMXN(grandOwed)}</p>
        </div>
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
            Pagado
          </p>
          <p className="text-sm font-semibold tabular-nums">{formatMXN(grandPagado)}</p>
        </div>
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
            Saldo
          </p>
          <p className={`text-sm font-bold tabular-nums ${grandSaldo <= 0.01 ? 'text-green-600' : ''}`}>
            {formatMXN(grandSaldo)}
          </p>
        </div>
      </div>

      {/* Per-supplier payment flow */}
      <div className="space-y-3">
        {supplierBreakdown.map(({
          supplier,
          totalOwed,
          saldo,
          anticipo,
          finiquito,
          anticipoPaid,
          finiquitoPaid,
          anticipoPayment,
          finiquitoPayment,
          supplierPayments,
        }) => (
          <div key={supplier.id} className="rounded-md border overflow-hidden">
            {/* Supplier header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b">
              <span className="font-medium text-sm">{supplier.nombre}</span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Total: {formatMXN(totalOwed)}</span>
                <span className={`font-semibold ${saldo <= 0.01 ? 'text-green-600' : ''}`}>
                  Saldo: {formatMXN(saldo)}
                </span>
              </div>
            </div>

            {/* Stage rows */}
            <div className="divide-y">
              {/* Anticipo */}
              <StageRow
                label="Anticipo"
                amount={anticipo}
                paid={anticipoPaid}
                payment={anticipoPayment}
                projectId={projectId}
                supplierId={supplier.id}
                onRegister={() =>
                  setActiveDialog({
                    supplierId: supplier.id,
                    supplierNombre: supplier.nombre,
                    defaultAmount: anticipo,
                    stageLabel: 'Anticipo (50%)',
                  })
                }
              />

              {/* Finiquito — locked until anticipo is paid */}
              <StageRow
                label="Finiquito"
                amount={finiquito}
                paid={finiquitoPaid}
                payment={finiquitoPayment}
                projectId={projectId}
                supplierId={supplier.id}
                locked={!anticipoPaid}
                onRegister={() =>
                  setActiveDialog({
                    supplierId: supplier.id,
                    supplierNombre: supplier.nombre,
                    defaultAmount: finiquito,
                    stageLabel: 'Finiquito (50%)',
                  })
                }
              />
            </div>

            {/* Individual payment history (collapsible summary) */}
            {supplierPayments.length > 0 && (
              <div className="px-4 py-2 border-t bg-muted/20">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                  Historial de pagos
                </p>
                <div className="space-y-1">
                  {supplierPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{formatFecha(p.fecha)}</span>
                      <span className="tabular-nums">{formatMXN(p.monto)}</span>
                      {p.notas && (
                        <span className="text-muted-foreground max-w-[140px] truncate">
                          {p.notas}
                        </span>
                      )}
                      <form action={async (fd) => { await deleteSupplierPaymentAction(fd) }}>
                        <input type="hidden" name="paymentId" value={p.id} />
                        <input type="hidden" name="projectId" value={projectId} />
                        <input type="hidden" name="supplierId" value={p.supplier_id ?? ''} />
                        <button
                          type="submit"
                          className="text-muted-foreground hover:text-destructive transition-colors ml-2"
                        >
                          Eliminar
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick pay dialog */}
      {activeDialog && (
        <QuickPayDialog
          open={true}
          onOpenChange={(isOpen) => { if (!isOpen) setActiveDialog(null) }}
          projectId={projectId}
          supplierId={activeDialog.supplierId}
          supplierNombre={activeDialog.supplierNombre}
          defaultAmount={activeDialog.defaultAmount}
          stageLabel={activeDialog.stageLabel}
        />
      )}
    </div>
  )
}

// ─── Stage row sub-component ────────────────────────────────────────────────

interface StageRowProps {
  label: string
  amount: number
  paid: boolean
  payment: PaymentSupplier | null
  projectId: string
  supplierId: string
  locked?: boolean
  onRegister: () => void
}

function StageRow({ label, amount, paid, payment, locked, onRegister }: StageRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Status indicator */}
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
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        <div>
          <p className={`text-sm font-medium ${locked && !paid ? 'text-muted-foreground' : ''}`}>
            {label} <span className="text-xs font-normal text-muted-foreground">50%</span>
          </p>
          {paid && payment && (
            <p className="text-xs text-muted-foreground">
              Pagado el {formatFecha(payment.fecha)}
            </p>
          )}
          {locked && !paid && (
            <p className="text-xs text-muted-foreground">Disponible al pagar el anticipo</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={`text-sm tabular-nums font-medium ${locked && !paid ? 'text-muted-foreground' : ''}`}>
          {formatMXN(amount)}
        </span>
        {!paid && !locked && (
          <Button type="button" size="sm" variant="outline" onClick={onRegister}>
            Registrar Pago
          </Button>
        )}
        {paid && (
          <span className="text-xs text-green-600 font-medium">Pagado</span>
        )}
        {locked && !paid && (
          <span className="text-xs text-muted-foreground/60">Pendiente</span>
        )}
      </div>
    </div>
  )
}
