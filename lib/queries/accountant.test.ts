import { describe, it, expect } from 'vitest'
import {
  aggregateAccountantProjects,
  aggregateSupplierTotals,
  aggregateCashFlow,
} from './accountant'

// ─── Mock types ──────────────────────────────────────────────────────────────

type MockClientPayment = {
  monto: number | string
}

type MockProject = {
  id: string
  nombre: string
  cliente_nombre: string
  gran_total: number | string
  payments_client: MockClientPayment[]
}

type MockSupplierPayment = {
  supplier_id: string
  monto: number | string
  fecha: string
  tipo?: string
}

type MockSupplier = {
  id: string
  nombre: string
}

// ─── aggregateAccountantProjects ─────────────────────────────────────────────

describe('aggregateAccountantProjects', () => {
  it('maps gran_total from project row using Number() coercion', () => {
    const projects: MockProject[] = [
      {
        id: 'proj-1',
        nombre: 'Proyecto Alpha',
        cliente_nombre: 'Empresa SA',
        gran_total: '12000.00',
        payments_client: [],
      },
    ]
    const result = aggregateAccountantProjects(projects)
    expect(result[0].granTotal).toBe(12000)
  })

  it('computes collected as sum of payments_client.monto', () => {
    const projects: MockProject[] = [
      {
        id: 'proj-1',
        nombre: 'Proyecto Alpha',
        cliente_nombre: 'Empresa SA',
        gran_total: '5000.00',
        payments_client: [{ monto: '2000.00' }, { monto: '1000.00' }],
      },
    ]
    const result = aggregateAccountantProjects(projects)
    expect(result[0].collected).toBe(3000)
  })

  it('outstanding = 0 when collected equals granTotal', () => {
    const projects: MockProject[] = [
      {
        id: 'proj-1',
        nombre: 'Proyecto Beta',
        cliente_nombre: 'Cliente SA',
        gran_total: '5000.00',
        payments_client: [{ monto: '3000.00' }, { monto: '2000.00' }],
      },
    ]
    const result = aggregateAccountantProjects(projects)
    expect(result[0].outstanding).toBe(0)
  })

  it('outstanding is negative when collected exceeds granTotal (overpayment edge case)', () => {
    const projects: MockProject[] = [
      {
        id: 'proj-1',
        nombre: 'Proyecto Gamma',
        cliente_nombre: 'Overpaying Client',
        gran_total: '1000.00',
        payments_client: [{ monto: '1500.00' }],
      },
    ]
    const result = aggregateAccountantProjects(projects)
    expect(result[0].outstanding).toBe(-500)
  })

  it('reads gran_total from project row — NOT computed from line_items', () => {
    // gran_total should come from the project column, not from any computation
    const projects: MockProject[] = [
      {
        id: 'proj-1',
        nombre: 'Proyecto Delta',
        cliente_nombre: 'Cliente X',
        gran_total: '9999.99',
        payments_client: [],
      },
    ]
    const result = aggregateAccountantProjects(projects)
    // granTotal must equal the provided gran_total value exactly (after coercion)
    expect(result[0].granTotal).toBeCloseTo(9999.99, 2)
  })

  it('maps all required fields', () => {
    const projects: MockProject[] = [
      {
        id: 'uuid-123',
        nombre: 'Test Proyecto',
        cliente_nombre: 'Test Cliente',
        gran_total: '5800.00',
        payments_client: [{ monto: '2000.00' }],
      },
    ]
    const result = aggregateAccountantProjects(projects)
    expect(result[0].id).toBe('uuid-123')
    expect(result[0].nombre).toBe('Test Proyecto')
    expect(result[0].clienteNombre).toBe('Test Cliente')
    expect(result[0].granTotal).toBe(5800)
    expect(result[0].collected).toBe(2000)
    expect(result[0].outstanding).toBe(3800)
  })

  it('applies Number() coercion on monto strings', () => {
    const projects: MockProject[] = [
      {
        id: 'proj-1',
        nombre: 'Proyecto',
        cliente_nombre: 'Cliente',
        gran_total: '250.00',
        payments_client: [{ monto: '250.00' }],
      },
    ]
    const result = aggregateAccountantProjects(projects)
    expect(result[0].collected).toBe(250)
  })

  it('returns empty array when projects is empty', () => {
    const result = aggregateAccountantProjects([])
    expect(result).toHaveLength(0)
  })
})

// ─── aggregateSupplierTotals ──────────────────────────────────────────────────

describe('aggregateSupplierTotals', () => {
  it('groups payments by supplier_id and sums monto', () => {
    const payments: MockSupplierPayment[] = [
      { supplier_id: 'sup-1', monto: '1000.00', fecha: '2026-01-01' },
      { supplier_id: 'sup-1', monto: '500.00', fecha: '2026-01-15' },
    ]
    const suppliers: MockSupplier[] = [
      { id: 'sup-1', nombre: 'Proveedor Uno' },
    ]
    const result = aggregateSupplierTotals(payments, suppliers)
    expect(result[0].totalPagado).toBe(1500)
  })

  it('joins supplier nombre from suppliers list', () => {
    const payments: MockSupplierPayment[] = [
      { supplier_id: 'sup-2', monto: '300.00', fecha: '2026-02-01' },
    ]
    const suppliers: MockSupplier[] = [
      { id: 'sup-2', nombre: 'Proveedor Dos' },
    ]
    const result = aggregateSupplierTotals(payments, suppliers)
    expect(result[0].supplierNombre).toBe('Proveedor Dos')
    expect(result[0].supplierId).toBe('sup-2')
  })

  it('only includes suppliers that have received at least one payment', () => {
    const payments: MockSupplierPayment[] = [
      { supplier_id: 'sup-1', monto: '500.00', fecha: '2026-01-01' },
    ]
    const suppliers: MockSupplier[] = [
      { id: 'sup-1', nombre: 'Proveedor Uno' },
      { id: 'sup-2', nombre: 'Sin Pagos' },
    ]
    const result = aggregateSupplierTotals(payments, suppliers)
    expect(result).toHaveLength(1)
    expect(result[0].supplierId).toBe('sup-1')
  })

  it('applies Number() coercion — "250.00" string treated as 250', () => {
    const payments: MockSupplierPayment[] = [
      { supplier_id: 'sup-1', monto: '250.00', fecha: '2026-01-01' },
    ]
    const suppliers: MockSupplier[] = [
      { id: 'sup-1', nombre: 'Proveedor Test' },
    ]
    const result = aggregateSupplierTotals(payments, suppliers)
    expect(result[0].totalPagado).toBe(250)
  })

  it('returns empty array when no payments', () => {
    const result = aggregateSupplierTotals([], [])
    expect(result).toHaveLength(0)
  })
})

// ─── aggregateCashFlow ────────────────────────────────────────────────────────

type MockClientCashPayment = {
  monto: number | string
  fecha: string
  tipo: string
}

type MockSupplierCashPayment = {
  monto: number | string
  fecha: string
}

describe('aggregateCashFlow', () => {
  it('merges client and supplier payments into a single sorted list', () => {
    const clientPayments: MockClientCashPayment[] = [
      { monto: '1000.00', fecha: '2026-02-01', tipo: 'anticipo' },
    ]
    const supplierPayments: MockSupplierCashPayment[] = [
      { monto: '500.00', fecha: '2026-01-15' },
    ]
    const result = aggregateCashFlow(clientPayments, supplierPayments)
    expect(result).toHaveLength(2)
  })

  it('sorts result by fecha ascending', () => {
    const clientPayments: MockClientCashPayment[] = [
      { monto: '1000.00', fecha: '2026-03-01', tipo: 'finiquito' },
    ]
    const supplierPayments: MockSupplierCashPayment[] = [
      { monto: '500.00', fecha: '2026-01-15' },
    ]
    const result = aggregateCashFlow(clientPayments, supplierPayments)
    expect(result[0].fecha).toBe('2026-01-15')
    expect(result[1].fecha).toBe('2026-03-01')
  })

  it('client entries have tipo="cliente"', () => {
    const clientPayments: MockClientCashPayment[] = [
      { monto: '1000.00', fecha: '2026-02-01', tipo: 'anticipo' },
    ]
    const result = aggregateCashFlow(clientPayments, [])
    expect(result[0].tipo).toBe('cliente')
  })

  it('supplier entries have tipo="proveedor"', () => {
    const supplierPayments: MockSupplierCashPayment[] = [
      { monto: '500.00', fecha: '2026-01-15' },
    ]
    const result = aggregateCashFlow([], supplierPayments)
    expect(result[0].tipo).toBe('proveedor')
  })

  it('client entry label uses payment tipo (anticipo/finiquito/otro)', () => {
    const clientPayments: MockClientCashPayment[] = [
      { monto: '1000.00', fecha: '2026-02-01', tipo: 'anticipo' },
    ]
    const result = aggregateCashFlow(clientPayments, [])
    expect(result[0].label).toBe('anticipo')
  })

  it('supplier entry label is "Pago proveedor"', () => {
    const supplierPayments: MockSupplierCashPayment[] = [
      { monto: '500.00', fecha: '2026-01-15' },
    ]
    const result = aggregateCashFlow([], supplierPayments)
    expect(result[0].label).toBe('Pago proveedor')
  })

  it('returns empty array when both inputs are empty', () => {
    const result = aggregateCashFlow([], [])
    expect(result).toHaveLength(0)
  })

  it('handles multiple entries from same fecha (stable sort)', () => {
    const clientPayments: MockClientCashPayment[] = [
      { monto: '500.00', fecha: '2026-02-15', tipo: 'otro' },
    ]
    const supplierPayments: MockSupplierCashPayment[] = [
      { monto: '250.00', fecha: '2026-02-15' },
    ]
    const result = aggregateCashFlow(clientPayments, supplierPayments)
    expect(result).toHaveLength(2)
    expect(result[0].fecha).toBe('2026-02-15')
    expect(result[1].fecha).toBe('2026-02-15')
  })
})
