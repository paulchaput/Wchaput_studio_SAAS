import { describe, it, expect } from 'vitest'
import {
  calcPrecioVenta,
  calcTotalVenta,
  calcTotalCosto,
  calcSubtotal,
  calcIVA,
  calcTotal,
  calcTotalCostoProyecto,
  calcUtilidad,
  IVA_RATE,
  DEFAULT_MARGEN,
  PIPELINE_STAGES,
  // Payment calculation functions (Phase 03-01)
  calcAnticipo,
  calcSaldo,
  calcTotalPagadoCliente,
  calcSaldoPendienteCliente,
  calcTotalPagadoProveedor,
  calcSaldoProveedor,
  ANTICIPO_RATE,
  SALDO_RATE,
} from './calculations'

describe('calcPrecioVenta', () => {
  it('returns 200 for cost=100, margen=0.50 (gross margin, not markup)', () => {
    expect(calcPrecioVenta(100, 0.50)).toBeCloseTo(200, 2)
  })

  it('returns ~153.846 for cost=100, margen=0.35', () => {
    expect(calcPrecioVenta(100, 0.35)).toBeCloseTo(153.846, 2)
  })

  it('returns 100 for cost=100, margen=0 (no markup)', () => {
    expect(calcPrecioVenta(100, 0)).toBeCloseTo(100, 2)
  })

  it('throws if margen >= 1 (division by zero protection)', () => {
    expect(() => calcPrecioVenta(100, 1)).toThrow()
    expect(() => calcPrecioVenta(100, 1.5)).toThrow()
  })
})

describe('calcTotalVenta', () => {
  it('returns 600 for precioVenta=200, cantidad=3', () => {
    expect(calcTotalVenta(200, 3)).toBe(600)
  })
})

describe('calcTotalCosto', () => {
  it('returns 300 for costo=100, cantidad=3', () => {
    expect(calcTotalCosto(100, 3)).toBe(300)
  })
})

describe('calcSubtotal', () => {
  it('returns 400 for one item with costo=100, margen=0.5, cantidad=2', () => {
    const items = [{ costo_proveedor: 100, margen: 0.5, cantidad: 2 }]
    expect(calcSubtotal(items)).toBeCloseTo(400, 2)
  })
})

describe('calcIVA', () => {
  it('returns 160 for subtotal=1000', () => {
    expect(calcIVA(1000)).toBeCloseTo(160, 2)
  })
})

describe('calcTotal', () => {
  it('returns 1160 for subtotal=1000', () => {
    expect(calcTotal(1000)).toBeCloseTo(1160, 2)
  })
})

describe('calcTotalCostoProyecto', () => {
  it('returns 300 for one item with costo=100, cantidad=3', () => {
    const items = [{ costo_proveedor: 100, cantidad: 3 }]
    expect(calcTotalCostoProyecto(items)).toBeCloseTo(300, 2)
  })
})

describe('calcUtilidad', () => {
  it('returns 400 for subtotal=1000, totalCosto=600 (IVA excluded)', () => {
    expect(calcUtilidad(1000, 600)).toBeCloseTo(400, 2)
  })
})

describe('payment calculations', () => {
  it('ANTICIPO_RATE === 0.70', () => {
    expect(ANTICIPO_RATE).toBe(0.70)
  })

  it('SALDO_RATE === 0.30', () => {
    expect(SALDO_RATE).toBe(0.30)
  })

  it('calcAnticipo(1000) === 700 (70%)', () => {
    expect(calcAnticipo(1000)).toBe(700)
  })

  it('calcAnticipo(0) === 0', () => {
    expect(calcAnticipo(0)).toBe(0)
  })

  it('calcSaldo(1000) === 300 (30%)', () => {
    expect(calcSaldo(1000)).toBe(300)
  })

  it('calcTotalPagadoCliente([{monto:500},{monto:200}]) === 700', () => {
    expect(calcTotalPagadoCliente([{ monto: 500 }, { monto: 200 }])).toBe(700)
  })

  it('calcTotalPagadoCliente([]) === 0', () => {
    expect(calcTotalPagadoCliente([])).toBe(0)
  })

  it('calcSaldoPendienteCliente(1000, 700) === 300', () => {
    expect(calcSaldoPendienteCliente(1000, 700)).toBe(300)
  })

  it('calcSaldoPendienteCliente(1000, 0) === 1000', () => {
    expect(calcSaldoPendienteCliente(1000, 0)).toBe(1000)
  })

  it('calcTotalPagadoProveedor([{monto:300},{monto:100}]) === 400', () => {
    expect(calcTotalPagadoProveedor([{ monto: 300 }, { monto: 100 }])).toBe(400)
  })

  it('calcTotalPagadoProveedor([]) === 0', () => {
    expect(calcTotalPagadoProveedor([])).toBe(0)
  })

  it('calcSaldoProveedor(500, 300) === 200', () => {
    expect(calcSaldoProveedor(500, 300)).toBe(200)
  })

  it('calcSaldoProveedor(500, 500) === 0', () => {
    expect(calcSaldoProveedor(500, 500)).toBe(0)
  })
})

describe('Constants', () => {
  it('PIPELINE_STAGES has exactly 6 stages in correct order', () => {
    expect(PIPELINE_STAGES).toHaveLength(6)
    expect(PIPELINE_STAGES[0]).toBe('Prospecto')
    expect(PIPELINE_STAGES[1]).toBe('Cotizado')
    expect(PIPELINE_STAGES[2]).toBe('Anticipo Recibido')
    expect(PIPELINE_STAGES[3]).toBe('En Producción')
    expect(PIPELINE_STAGES[4]).toBe('Entregado')
    expect(PIPELINE_STAGES[5]).toBe('Cerrado')
  })

  it('DEFAULT_MARGEN === 0.50', () => {
    expect(DEFAULT_MARGEN).toBe(0.50)
  })

  it('IVA_RATE === 0.16', () => {
    expect(IVA_RATE).toBe(0.16)
  })
})
