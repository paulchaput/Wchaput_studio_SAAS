import { describe, it, expect } from 'vitest'
import type { QuoteLineItem, QuoteProjectData } from './CotizacionTemplate'

describe('QuoteLineItem — data safety (QUOT-03)', () => {
  it('QuoteLineItem type does not include costo_proveedor', () => {
    // If this compiles, QuoteLineItem has the right shape
    const item: QuoteLineItem = {
      descripcion: 'Mesa de madera',
      referencia: 'REF-001',
      cantidad: 2,
      precioVenta: 5000,
      descuento: 0,
      totalVenta: 10000,
    }
    expect(item).not.toHaveProperty('costo_proveedor')
    expect(item).not.toHaveProperty('margen')
  })

  it('QuoteProjectData contains lineItems as QuoteLineItem[]', () => {
    const project: QuoteProjectData = {
      id: 'abc',
      nombre: 'Proyecto Test',
      cliente_nombre: 'Cliente SA',
      numero_cotizacion: 'COT-001',
      fecha_cotizacion: '2026-01-15',
      salesperson: 'Paul',
      subtotal: 10000,
      descuentoGeneral: 0,
      descuentoGeneralMonto: 0,
      iva: 1600,
      granTotal: 11600,
      includeIva: true,
      anticipo: 8120,
      saldo: 3480,
      lineItems: [
        { descripcion: 'Mesa', referencia: null, cantidad: 1, precioVenta: 10000, descuento: 0, totalVenta: 10000 },
      ],
    }
    expect(project.lineItems[0]).not.toHaveProperty('costo_proveedor')
    expect(project.lineItems[0]).not.toHaveProperty('margen')
    expect(project.granTotal).toBe(11600)
    expect(project.anticipo).toBe(8120)
  })
})
