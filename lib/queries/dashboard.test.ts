import { describe, it, expect } from 'vitest'
import {
  aggregateDashboardKpis,
  aggregatePipelineSummary,
  aggregateSupplierDebt,
} from './dashboard'
import { PIPELINE_STAGES } from '@/lib/calculations'

// ─── Mock types ──────────────────────────────────────────────────────────────

type MockLineItem = {
  costo_proveedor: number | string
  margen: number | string
  cantidad: number
}

type MockPayment = {
  monto: number | string
}

type MockProject = {
  id: string
  status: string
  line_items: MockLineItem[]
  payments_client: MockPayment[]
  payments_supplier: MockPayment[]
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

const activeProject: MockProject = {
  id: 'proj-1',
  status: 'Prospecto',
  line_items: [
    { costo_proveedor: '100.00', margen: '0.50', cantidad: 2 }, // precio = 200 each, total = 400
  ],
  payments_client: [{ monto: '100.00' }],
  payments_supplier: [{ monto: '50.00' }],
}

const cerradoProject: MockProject = {
  id: 'proj-2',
  status: 'Cerrado',
  line_items: [
    { costo_proveedor: '200.00', margen: '0.50', cantidad: 1 },
  ],
  payments_client: [{ monto: '464.00' }],
  payments_supplier: [{ monto: '200.00' }],
}

const anotherActiveProject: MockProject = {
  id: 'proj-3',
  status: 'En Producción',
  line_items: [
    { costo_proveedor: '50.00', margen: '0.50', cantidad: 4 }, // precio = 100 each, total = 400
  ],
  payments_client: [{ monto: '0.00' }],
  payments_supplier: [{ monto: '0.00' }],
}

// ─── aggregateDashboardKpis ───────────────────────────────────────────────────

describe('aggregateDashboardKpis', () => {
  it('excludes Cerrado projects from activeProjectCount', () => {
    const result = aggregateDashboardKpis([activeProject, cerradoProject])
    expect(result.activeProjectCount).toBe(1)
  })

  it('returns 0 when all projects are Cerrado', () => {
    const result = aggregateDashboardKpis([cerradoProject])
    expect(result.activeProjectCount).toBe(0)
  })

  it('sums pipelineValue from non-Cerrado projects only using calcTotal(calcSubtotal)', () => {
    // activeProject: calcSubtotal = 400 (200*2), calcTotal = 400 * 1.16 = 464
    // cerradoProject should be excluded
    const result = aggregateDashboardKpis([activeProject, cerradoProject])
    expect(result.pipelineValue).toBeCloseTo(464, 2)
  })

  it('sums pipelineValue from multiple active projects', () => {
    // activeProject: gran_total = 464
    // anotherActiveProject: calcSubtotal = 400 (100*4), calcTotal = 464
    const result = aggregateDashboardKpis([activeProject, anotherActiveProject, cerradoProject])
    expect(result.pipelineValue).toBeCloseTo(928, 2)
  })

  it('computes totalPendingCliente = granTotal - paidCliente for active projects', () => {
    // activeProject: granTotal = 464, paid = 100 → pending = 364
    const result = aggregateDashboardKpis([activeProject])
    expect(result.totalPendingCliente).toBeCloseTo(364, 2)
  })

  it('computes totalPendingProveedor = totalCosto - paidProveedor for active projects', () => {
    // activeProject: totalCosto = 100 * 2 = 200, paid = 50 → pending = 150
    const result = aggregateDashboardKpis([activeProject])
    expect(result.totalPendingProveedor).toBeCloseTo(150, 2)
  })

  it('applies Number() coercion — NUMERIC strings treated as numbers', () => {
    const projectWithStrings: MockProject = {
      id: 'proj-str',
      status: 'Cotizado',
      line_items: [{ costo_proveedor: '100.00', margen: '0.50', cantidad: 1 }],
      payments_client: [{ monto: '116.00' }],
      payments_supplier: [{ monto: '50.00' }],
    }
    const result = aggregateDashboardKpis([projectWithStrings])
    // granTotal = calcTotal(calcSubtotal) = 200 * 1.16 = 232
    expect(result.pipelineValue).toBeCloseTo(232, 2)
    // totalPendingCliente = 232 - 116 = 116
    expect(result.totalPendingCliente).toBeCloseTo(116, 2)
    // totalPendingProveedor = 100 - 50 = 50
    expect(result.totalPendingProveedor).toBeCloseTo(50, 2)
  })

  it('returns zeros when projects array is empty', () => {
    const result = aggregateDashboardKpis([])
    expect(result.activeProjectCount).toBe(0)
    expect(result.pipelineValue).toBe(0)
    expect(result.totalPendingCliente).toBe(0)
    expect(result.totalPendingProveedor).toBe(0)
  })
})

// ─── aggregatePipelineSummary ─────────────────────────────────────────────────

describe('aggregatePipelineSummary', () => {
  it('returns all 6 pipeline stages', () => {
    const result = aggregatePipelineSummary([])
    expect(Object.keys(result)).toHaveLength(6)
    for (const stage of PIPELINE_STAGES) {
      expect(result).toHaveProperty(stage)
    }
  })

  it('returns 0 for stages with no projects', () => {
    const result = aggregatePipelineSummary([])
    for (const stage of PIPELINE_STAGES) {
      expect(result[stage]).toBe(0)
    }
  })

  it('counts projects by status correctly', () => {
    const projects = [
      { id: '1', status: 'Prospecto' },
      { id: '2', status: 'Prospecto' },
      { id: '3', status: 'Cotizado' },
      { id: '4', status: 'Cerrado' },
    ]
    const result = aggregatePipelineSummary(projects)
    expect(result['Prospecto']).toBe(2)
    expect(result['Cotizado']).toBe(1)
    expect(result['Cerrado']).toBe(1)
    expect(result['Anticipo Recibido']).toBe(0)
    expect(result['En Producción']).toBe(0)
    expect(result['Entregado']).toBe(0)
  })

  it('includes Cerrado stage with its count (unlike KPI filter)', () => {
    const projects = [{ id: '1', status: 'Cerrado' }, { id: '2', status: 'Cerrado' }]
    const result = aggregatePipelineSummary(projects)
    expect(result['Cerrado']).toBe(2)
  })
})

// ─── Mock data for supplier debt ─────────────────────────────────────────────

type MockSupplierLineItem = {
  costo_proveedor: number | string
  cantidad: number
  proveedor_id: string
  projects: { status: string } | Array<{ status: string }>
  suppliers: { id: string; nombre: string } | Array<{ id: string; nombre: string }>
}

type MockSupplierPayment = {
  supplier_id: string
  monto: number | string
}

// ─── aggregateSupplierDebt ────────────────────────────────────────────────────

describe('aggregateSupplierDebt', () => {
  it('routes Innovika line items to the Innovika bucket', () => {
    const lineItems: MockSupplierLineItem[] = [
      {
        costo_proveedor: '100.00',
        cantidad: 2,
        proveedor_id: 'sup-innovika',
        projects: { status: 'Prospecto' },
        suppliers: { id: 'sup-innovika', nombre: 'Innovika' },
      },
    ]
    const payments: MockSupplierPayment[] = []
    const result = aggregateSupplierDebt(lineItems, payments)
    expect(result.Innovika).toBeCloseTo(200, 2)
    expect(result['El Roble']).toBe(0)
    expect(result.Otros).toBe(0)
  })

  it('routes El Roble line items to the El Roble bucket', () => {
    const lineItems: MockSupplierLineItem[] = [
      {
        costo_proveedor: '50.00',
        cantidad: 3,
        proveedor_id: 'sup-roble',
        projects: { status: 'En Producción' },
        suppliers: { id: 'sup-roble', nombre: 'El Roble' },
      },
    ]
    const payments: MockSupplierPayment[] = []
    const result = aggregateSupplierDebt(lineItems, payments)
    expect(result['El Roble']).toBeCloseTo(150, 2)
    expect(result.Innovika).toBe(0)
    expect(result.Otros).toBe(0)
  })

  it('routes unknown suppliers to the Otros bucket', () => {
    const lineItems: MockSupplierLineItem[] = [
      {
        costo_proveedor: '75.00',
        cantidad: 2,
        proveedor_id: 'sup-other',
        projects: { status: 'Cotizado' },
        suppliers: { id: 'sup-other', nombre: 'Aceros SA' },
      },
    ]
    const payments: MockSupplierPayment[] = []
    const result = aggregateSupplierDebt(lineItems, payments)
    expect(result.Otros).toBeCloseTo(150, 2)
    expect(result.Innovika).toBe(0)
    expect(result['El Roble']).toBe(0)
  })

  it('excludes Cerrado projects from supplier debt', () => {
    const lineItems: MockSupplierLineItem[] = [
      {
        costo_proveedor: '100.00',
        cantidad: 1,
        proveedor_id: 'sup-innovika',
        projects: { status: 'Cerrado' },
        suppliers: { id: 'sup-innovika', nombre: 'Innovika' },
      },
    ]
    const payments: MockSupplierPayment[] = []
    const result = aggregateSupplierDebt(lineItems, payments)
    expect(result.Innovika).toBe(0)
  })

  it('subtracts payments from owed amounts', () => {
    const lineItems: MockSupplierLineItem[] = [
      {
        costo_proveedor: '200.00',
        cantidad: 1,
        proveedor_id: 'sup-innovika',
        projects: { status: 'Prospecto' },
        suppliers: { id: 'sup-innovika', nombre: 'Innovika' },
      },
    ]
    const payments: MockSupplierPayment[] = [
      { supplier_id: 'sup-innovika', monto: '75.00' },
    ]
    const result = aggregateSupplierDebt(lineItems, payments)
    expect(result.Innovika).toBeCloseTo(125, 2)
  })

  it('handles suppliers as array (Supabase joined relation pattern)', () => {
    const lineItems: MockSupplierLineItem[] = [
      {
        costo_proveedor: '100.00',
        cantidad: 1,
        proveedor_id: 'sup-roble',
        projects: [{ status: 'Cotizado' }],
        suppliers: [{ id: 'sup-roble', nombre: 'El Roble' }],
      },
    ]
    const payments: MockSupplierPayment[] = []
    const result = aggregateSupplierDebt(lineItems, payments)
    expect(result['El Roble']).toBeCloseTo(100, 2)
  })

  it('applies Number() coercion for monto and costo_proveedor strings', () => {
    const lineItems: MockSupplierLineItem[] = [
      {
        costo_proveedor: '100.00',
        cantidad: 2,
        proveedor_id: 'sup-innovika',
        projects: { status: 'Prospecto' },
        suppliers: { id: 'sup-innovika', nombre: 'Innovika' },
      },
    ]
    const payments: MockSupplierPayment[] = [
      { supplier_id: 'sup-innovika', monto: '50.00' },
    ]
    const result = aggregateSupplierDebt(lineItems, payments)
    // owed = 200, paid = 50, outstanding = 150
    expect(result.Innovika).toBeCloseTo(150, 2)
  })

  it('returns zeros when no line items', () => {
    const result = aggregateSupplierDebt([], [])
    expect(result.Innovika).toBe(0)
    expect(result['El Roble']).toBe(0)
    expect(result.Otros).toBe(0)
  })
})
