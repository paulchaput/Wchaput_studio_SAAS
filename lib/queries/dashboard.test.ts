import { describe, it, expect } from 'vitest'
import {
  aggregateDashboardKpis,
  aggregatePipelineSummary,
  aggregateSupplierDebt,
  aggregateMonthlyFinancials,
  aggregateCashFlow,
} from './dashboard'
import { PIPELINE_STAGES } from '@/lib/calculations'

// ─── Mock types ──────────────────────────────────────────────────────────────

type MockLineItem = {
  precio_venta: number | string
  cantidad: number
  line_item_costs: Array<{ costo: number | string }>
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
// Old model: costo_proveedor: '100.00', margen: '0.50', cantidad: 2
//   → precio = 100/(1-0.5) = 200 each, subtotal = 400, granTotal = 464, totalCosto = 100*2 = 200
// New model: precio_venta = 200 (direct), line_item_costs = [{costo: 100}], cantidad: 2
//   → subtotal = 200*2 = 400, granTotal = 464, totalCosto = 100 (single cost row) * 2 quantities = 200

const activeProject: MockProject = {
  id: 'proj-1',
  status: 'Prospecto',
  line_items: [
    { precio_venta: '200.00', cantidad: 2, line_item_costs: [{ costo: '100.00' }] },
  ],
  payments_client: [{ monto: '100.00' }],
  payments_supplier: [{ monto: '50.00' }],
}

const cerradoProject: MockProject = {
  id: 'proj-2',
  status: 'Cerrado',
  line_items: [
    { precio_venta: '400.00', cantidad: 1, line_item_costs: [{ costo: '200.00' }] },
  ],
  payments_client: [{ monto: '464.00' }],
  payments_supplier: [{ monto: '200.00' }],
}

const anotherActiveProject: MockProject = {
  id: 'proj-3',
  status: 'En Producción',
  line_items: [
    { precio_venta: '100.00', cantidad: 4, line_item_costs: [{ costo: '50.00' }] },
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

  it('sums pipelineValue from non-Cerrado projects only using calcTotal(calcSubtotalFromPrecio)', () => {
    // activeProject: subtotal = 200*2 = 400, granTotal = 400 * 1.16 = 464
    // cerradoProject should be excluded
    const result = aggregateDashboardKpis([activeProject, cerradoProject])
    expect(result.pipelineValue).toBeCloseTo(464, 2)
  })

  it('sums pipelineValue from multiple active projects', () => {
    // activeProject: granTotal = 464
    // anotherActiveProject: subtotal = 100*4 = 400, granTotal = 464
    const result = aggregateDashboardKpis([activeProject, anotherActiveProject, cerradoProject])
    expect(result.pipelineValue).toBeCloseTo(928, 2)
  })

  it('computes totalPendingCliente = granTotal - paidCliente for active projects', () => {
    // activeProject: granTotal = 464, paid = 100 → pending = 364
    const result = aggregateDashboardKpis([activeProject])
    expect(result.totalPendingCliente).toBeCloseTo(364, 2)
  })

  it('computes totalPendingProveedor = totalCosto - paidProveedor for active projects', () => {
    // activeProject: line_item_costs[0].costo = 100, cantidad = 2 → totalCosto = 100*2 = 200, paid = 50 → pending = 150
    const result = aggregateDashboardKpis([activeProject])
    expect(result.totalPendingProveedor).toBeCloseTo(150, 2)
  })

  it('applies Number() coercion — NUMERIC strings treated as numbers', () => {
    const projectWithStrings: MockProject = {
      id: 'proj-str',
      status: 'Cotizado',
      // precio_venta = 200 (from old costo=100, margen=0.5), line_item_costs.costo = 100
      line_items: [{ precio_venta: '200.00', cantidad: 1, line_item_costs: [{ costo: '100.00' }] }],
      payments_client: [{ monto: '116.00' }],
      payments_supplier: [{ monto: '50.00' }],
    }
    const result = aggregateDashboardKpis([projectWithStrings])
    // granTotal = 200 * 1.16 = 232
    expect(result.pipelineValue).toBeCloseTo(232, 2)
    // totalPendingCliente = 232 - 116 = 116
    expect(result.totalPendingCliente).toBeCloseTo(116, 2)
    // totalPendingProveedor = 100*1 - 50 = 50
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
// New model: aggregateSupplierDebt receives line_item_costs rows, not line_items rows.
// Each cost row has: costo, supplier_id, line_items (with project), suppliers

type MockSupplierCost = {
  costo: number | string
  supplier_id: string
  line_items: {
    project_id: string
    projects: { status: string } | Array<{ status: string }>
  } | null
  suppliers: { id: string; nombre: string } | Array<{ id: string; nombre: string }>
}

type MockSupplierPayment = {
  supplier_id: string
  monto: number | string
}

// ─── aggregateSupplierDebt ────────────────────────────────────────────────────

describe('aggregateSupplierDebt', () => {
  it('routes Innovika cost rows to the Innovika bucket', () => {
    const costs: MockSupplierCost[] = [
      {
        costo: '100.00',
        supplier_id: 'sup-innovika',
        line_items: { project_id: 'proj-1', projects: { status: 'Prospecto' } },
        suppliers: { id: 'sup-innovika', nombre: 'Innovika' },
      },
    ]
    const payments: MockSupplierPayment[] = []
    const result = aggregateSupplierDebt(costs, payments)
    // costo = 100 (single cost row, no cantidad multiplication in this new model)
    expect(result.Innovika).toBeCloseTo(100, 2)
    expect(result['El Roble']).toBe(0)
    expect(result.Otros).toBe(0)
  })

  it('routes El Roble cost rows to the El Roble bucket', () => {
    const costs: MockSupplierCost[] = [
      {
        costo: '150.00',
        supplier_id: 'sup-roble',
        line_items: { project_id: 'proj-1', projects: { status: 'En Producción' } },
        suppliers: { id: 'sup-roble', nombre: 'El Roble' },
      },
    ]
    const payments: MockSupplierPayment[] = []
    const result = aggregateSupplierDebt(costs, payments)
    expect(result['El Roble']).toBeCloseTo(150, 2)
    expect(result.Innovika).toBe(0)
    expect(result.Otros).toBe(0)
  })

  it('routes unknown suppliers to the Otros bucket', () => {
    const costs: MockSupplierCost[] = [
      {
        costo: '150.00',
        supplier_id: 'sup-other',
        line_items: { project_id: 'proj-1', projects: { status: 'Cotizado' } },
        suppliers: { id: 'sup-other', nombre: 'Aceros SA' },
      },
    ]
    const payments: MockSupplierPayment[] = []
    const result = aggregateSupplierDebt(costs, payments)
    expect(result.Otros).toBeCloseTo(150, 2)
    expect(result.Innovika).toBe(0)
    expect(result['El Roble']).toBe(0)
  })

  it('excludes Cerrado projects from supplier debt', () => {
    const costs: MockSupplierCost[] = [
      {
        costo: '100.00',
        supplier_id: 'sup-innovika',
        line_items: { project_id: 'proj-1', projects: { status: 'Cerrado' } },
        suppliers: { id: 'sup-innovika', nombre: 'Innovika' },
      },
    ]
    const payments: MockSupplierPayment[] = []
    const result = aggregateSupplierDebt(costs, payments)
    expect(result.Innovika).toBe(0)
  })

  it('subtracts payments from owed amounts', () => {
    const costs: MockSupplierCost[] = [
      {
        costo: '200.00',
        supplier_id: 'sup-innovika',
        line_items: { project_id: 'proj-1', projects: { status: 'Prospecto' } },
        suppliers: { id: 'sup-innovika', nombre: 'Innovika' },
      },
    ]
    const payments: MockSupplierPayment[] = [
      { supplier_id: 'sup-innovika', monto: '75.00' },
    ]
    const result = aggregateSupplierDebt(costs, payments)
    expect(result.Innovika).toBeCloseTo(125, 2)
  })

  it('handles suppliers as array (Supabase joined relation pattern)', () => {
    const costs: MockSupplierCost[] = [
      {
        costo: '100.00',
        supplier_id: 'sup-roble',
        line_items: { project_id: 'proj-1', projects: [{ status: 'Cotizado' }] },
        suppliers: [{ id: 'sup-roble', nombre: 'El Roble' }],
      },
    ]
    const payments: MockSupplierPayment[] = []
    const result = aggregateSupplierDebt(costs, payments)
    expect(result['El Roble']).toBeCloseTo(100, 2)
  })

  it('applies Number() coercion for monto and costo strings', () => {
    const costs: MockSupplierCost[] = [
      {
        costo: '200.00',
        supplier_id: 'sup-innovika',
        line_items: { project_id: 'proj-1', projects: { status: 'Prospecto' } },
        suppliers: { id: 'sup-innovika', nombre: 'Innovika' },
      },
    ]
    const payments: MockSupplierPayment[] = [
      { supplier_id: 'sup-innovika', monto: '50.00' },
    ]
    const result = aggregateSupplierDebt(costs, payments)
    // owed = 200, paid = 50, outstanding = 150
    expect(result.Innovika).toBeCloseTo(150, 2)
  })

  it('returns zeros when no cost rows', () => {
    const result = aggregateSupplierDebt([], [])
    expect(result.Innovika).toBe(0)
    expect(result['El Roble']).toBe(0)
    expect(result.Otros).toBe(0)
  })
})

// ─── aggregateMonthlyFinancials ───────────────────────────────────────────────

type MockMonthlyProject = {
  fecha_cotizacion: string
  line_items: Array<{
    precio_venta: number | string
    cantidad: number
    line_item_costs: Array<{ costo: number | string }>
  }>
}

describe('aggregateMonthlyFinancials', () => {
  it('always returns exactly 6 MonthlyDataPoint entries', () => {
    const result = aggregateMonthlyFinancials([], new Date('2026-03-15'))
    expect(result).toHaveLength(6)
  })

  it('returns zeros for all months when no projects', () => {
    const result = aggregateMonthlyFinancials([], new Date('2026-03-15'))
    for (const point of result) {
      expect(point.ingresos).toBe(0)
      expect(point.costos).toBe(0)
      expect(point.utilidad).toBe(0)
    }
  })

  it('utilidad always equals ingresos minus costos', () => {
    const projects: MockMonthlyProject[] = [
      {
        fecha_cotizacion: '2026-03-01',
        // precio_venta=200 (direct), cantidad=2, line_item_costs=[{costo:100}]
        line_items: [{ precio_venta: '200.00', cantidad: 2, line_item_costs: [{ costo: '100.00' }] }],
      },
    ]
    const result = aggregateMonthlyFinancials(projects, new Date('2026-03-15'))
    for (const point of result) {
      expect(point.utilidad).toBeCloseTo(point.ingresos - point.costos, 2)
    }
  })

  it('excludes project with fecha_cotizacion outside the 6-month window', () => {
    const projects: MockMonthlyProject[] = [
      {
        fecha_cotizacion: '2025-08-01', // older than 6 months from 2026-03-15
        line_items: [{ precio_venta: '1000.00', cantidad: 1, line_item_costs: [{ costo: '500.00' }] }],
      },
    ]
    const result = aggregateMonthlyFinancials(projects, new Date('2026-03-15'))
    const totalIngresos = result.reduce((s, p) => s + p.ingresos, 0)
    expect(totalIngresos).toBe(0)
  })

  it('correctly aggregates a project that falls within the 6-month window', () => {
    const projects: MockMonthlyProject[] = [
      {
        fecha_cotizacion: '2026-02-10',
        // precio_venta=200 (direct admin input), cantidad=1, costo=100
        line_items: [{ precio_venta: '200.00', cantidad: 1, line_item_costs: [{ costo: '100.00' }] }],
      },
    ]
    const result = aggregateMonthlyFinancials(projects, new Date('2026-03-15'))
    const feb = result.find((p) => p.mes.startsWith('feb'))
    expect(feb).toBeDefined()
    // ingresos = precio_venta * cantidad = 200 * 1 = 200
    expect(feb!.ingresos).toBeCloseTo(200, 2)
    // costos = costo * cantidad = 100 * 1 = 100
    expect(feb!.costos).toBeCloseTo(100, 2)
    // utilidad = 200 - 100 = 100
    expect(feb!.utilidad).toBeCloseTo(100, 2)
  })

  it('months with no data have 0 values and correct mes label', () => {
    const result = aggregateMonthlyFinancials([], new Date('2026-03-15'))
    // All 6 months should have a mes label
    for (const point of result) {
      expect(point.mes).toBeTruthy()
      expect(typeof point.mes).toBe('string')
    }
  })

  it('applies Number() coercion to NUMERIC string values from Supabase', () => {
    const projects: MockMonthlyProject[] = [
      {
        fecha_cotizacion: '2026-03-05',
        // precio_venta=400, cantidad=2, line_item_costs=[{costo:200}]
        line_items: [{ precio_venta: '400.00', cantidad: 2 as unknown as number, line_item_costs: [{ costo: '200.00' }] }],
      },
    ]
    const result = aggregateMonthlyFinancials(projects, new Date('2026-03-15'))
    const mar = result.find((p) => p.mes.startsWith('mar'))
    // ingresos: 400 * 2 = 800
    expect(mar!.ingresos).toBeCloseTo(800, 2)
    // costos: 200 * 2 = 400
    expect(mar!.costos).toBeCloseTo(400, 2)
  })
})

// ─── aggregateCashFlow ────────────────────────────────────────────────────────

type MockClientPayment = {
  fecha_pago: string | null
  monto: number | string
  tipo: string
}

type MockSupplierPaymentCashFlow = {
  fecha_pago: string | null
  monto: number | string
}

describe('aggregateCashFlow', () => {
  const today = new Date('2026-03-05')

  it('returns empty array when no payments provided', () => {
    const result = aggregateCashFlow([], [], today)
    expect(result).toHaveLength(0)
  })

  it('includes client payment within 30-day window as entrada', () => {
    const clientPayments: MockClientPayment[] = [
      { fecha_pago: '2026-03-10', monto: '5000.00', tipo: 'anticipo' },
    ]
    const result = aggregateCashFlow(clientPayments, [], today)
    expect(result).toHaveLength(1)
    expect(result[0].tipo).toBe('entrada')
    expect(result[0].monto).toBeCloseTo(5000, 2)
    expect(result[0].fecha).toBe('2026-03-10')
  })

  it('includes supplier payment within 30-day window as salida', () => {
    const supplierPayments: MockSupplierPaymentCashFlow[] = [
      { fecha_pago: '2026-03-15', monto: '2000.00' },
    ]
    const result = aggregateCashFlow([], supplierPayments, today)
    expect(result).toHaveLength(1)
    expect(result[0].tipo).toBe('salida')
    expect(result[0].monto).toBeCloseTo(2000, 2)
    expect(result[0].fecha).toBe('2026-03-15')
  })

  it('excludes client payment with fecha_pago before today', () => {
    const clientPayments: MockClientPayment[] = [
      { fecha_pago: '2026-03-04', monto: '1000.00', tipo: 'anticipo' },
    ]
    const result = aggregateCashFlow(clientPayments, [], today)
    expect(result).toHaveLength(0)
  })

  it('excludes client payment with fecha_pago after today+30', () => {
    const clientPayments: MockClientPayment[] = [
      { fecha_pago: '2026-04-06', monto: '3000.00', tipo: 'anticipo' }, // April 6 > March 5 + 30
    ]
    const result = aggregateCashFlow(clientPayments, [], today)
    expect(result).toHaveLength(0)
  })

  it('includes payment on today (inclusive lower bound)', () => {
    const clientPayments: MockClientPayment[] = [
      { fecha_pago: '2026-03-05', monto: '500.00', tipo: 'saldo' },
    ]
    const result = aggregateCashFlow(clientPayments, [], today)
    expect(result).toHaveLength(1)
  })

  it('includes payment on today+30 (inclusive upper bound)', () => {
    const clientPayments: MockClientPayment[] = [
      { fecha_pago: '2026-04-04', monto: '500.00', tipo: 'saldo' }, // March 5 + 30 = April 4
    ]
    const result = aggregateCashFlow(clientPayments, [], today)
    expect(result).toHaveLength(1)
  })

  it('returns entries sorted ascending by fecha', () => {
    const clientPayments: MockClientPayment[] = [
      { fecha_pago: '2026-03-20', monto: '1000.00', tipo: 'saldo' },
      { fecha_pago: '2026-03-08', monto: '500.00', tipo: 'anticipo' },
    ]
    const supplierPayments: MockSupplierPaymentCashFlow[] = [
      { fecha_pago: '2026-03-12', monto: '2000.00' },
    ]
    const result = aggregateCashFlow(clientPayments, supplierPayments, today)
    expect(result).toHaveLength(3)
    expect(result[0].fecha).toBe('2026-03-08')
    expect(result[1].fecha).toBe('2026-03-12')
    expect(result[2].fecha).toBe('2026-03-20')
  })

  it('excludes entries with null fecha_pago', () => {
    const clientPayments: MockClientPayment[] = [
      { fecha_pago: null, monto: '1000.00', tipo: 'anticipo' },
    ]
    const result = aggregateCashFlow(clientPayments, [], today)
    expect(result).toHaveLength(0)
  })

  it('applies Number() coercion to monto strings', () => {
    const clientPayments: MockClientPayment[] = [
      { fecha_pago: '2026-03-10', monto: '9999.99', tipo: 'anticipo' },
    ]
    const result = aggregateCashFlow(clientPayments, [], today)
    expect(typeof result[0].monto).toBe('number')
    expect(result[0].monto).toBeCloseTo(9999.99, 2)
  })
})
