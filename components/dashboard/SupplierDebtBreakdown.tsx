'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { formatMXN } from '@/lib/formatters'
import type { SupplierProjectDebt } from '@/lib/queries/dashboard'

interface SupplierDebtBreakdownProps {
  debtDetails: SupplierProjectDebt[]
}

export function SupplierDebtBreakdown({ debtDetails }: SupplierDebtBreakdownProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const totalDebt = debtDetails.reduce((sum, s) => sum + s.outstanding, 0)

  function toggle(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold">Deuda a Proveedores</h2>
        <span className="text-sm font-medium text-muted-foreground">
          Total: {formatMXN(totalDebt)}
        </span>
      </div>

      {debtDetails.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">Sin deuda pendiente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {debtDetails.map((supplier) => {
            const isOpen = expanded[supplier.supplier_id] ?? false
            const pct = totalDebt > 0 ? (supplier.outstanding / totalDebt) * 100 : 0

            return (
              <div key={supplier.supplier_id} className="rounded-lg border overflow-hidden">
                {/* Supplier row */}
                <button
                  onClick={() => toggle(supplier.supplier_id)}
                  className="flex items-center w-full px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="mr-2 text-muted-foreground">
                    {isOpen
                      ? <ChevronDown className="h-4 w-4" />
                      : <ChevronRight className="h-4 w-4" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium truncate">{supplier.supplier_nombre}</span>
                      <span className="font-mono text-sm font-semibold shrink-0">
                        {formatMXN(supplier.outstanding)}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-destructive/70 transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </button>

                {/* Project breakdown */}
                {isOpen && (
                  <div className="border-t bg-muted/30">
                    {supplier.projects.map((proj) => (
                      <Link
                        key={proj.project_id}
                        href={`/proyectos/${proj.project_id}`}
                        className="flex items-center justify-between px-4 py-2 pl-10 hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm text-muted-foreground truncate">
                            {proj.project_nombre}
                          </span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground shrink-0 ml-2">
                          {formatMXN(proj.amount)}
                        </span>
                      </Link>
                    ))}

                    {/* Paid summary */}
                    {supplier.total_paid > 0 && (
                      <div className="flex items-center justify-between px-4 py-2 pl-10 border-t text-xs text-muted-foreground">
                        <span>Pagado</span>
                        <span className="font-mono">- {formatMXN(supplier.total_paid)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
