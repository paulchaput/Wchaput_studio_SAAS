import { describe, it, expect } from 'vitest'
import type { OcLineItem, OcProjectData } from './OrdenCompraTemplate'

describe('OcLineItem — data shape (OC-02)', () => {
  it('OcLineItem has costoProveedor and totalCosto fields', () => {
    const item: OcLineItem = {
      descripcion: 'Panel de madera',
      referencia: 'REF-001',
      dimensiones: '120x60cm',
      cantidad: 4,
      costoProveedor: 1500,
      totalCosto: 6000,
    }
    expect(item).toHaveProperty('costoProveedor')
    expect(item).toHaveProperty('totalCosto')
    expect(item).not.toHaveProperty('margen')
    expect(item.totalCosto).toBe(6000)
  })

  it('OcProjectData assembles correctly', () => {
    const data: OcProjectData = {
      projectId: 'proj-1',
      projectNombre: 'Sala VIP',
      supplier: { nombre: 'Innovika', contacto: 'Gerente', email: 'info@innovika.com', telefono: '555-0000' },
      fecha: '2026-03-01',
      lineItems: [
        { descripcion: 'Panel', referencia: null, dimensiones: null, cantidad: 2, costoProveedor: 1000, totalCosto: 2000 },
      ],
      granTotalCosto: 2000,
    }
    expect(data.lineItems[0].costoProveedor).toBe(1000)
    expect(data.granTotalCosto).toBe(2000)
  })
})
