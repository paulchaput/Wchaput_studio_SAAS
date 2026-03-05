import { describe, it, expect } from 'vitest'
import { CHECKLIST_SEED, calcPhaseProgress } from '@/lib/checklist-tasks'
import type { ChecklistTask } from '@/lib/types'

describe('CHECKLIST_SEED', () => {
  it('Test 1 (CHEC-01): has exactly 30 entries', () => {
    expect(CHECKLIST_SEED.length).toBe(30)
  })

  it('Test 2 (CHEC-01): has 7 Comercial tasks', () => {
    expect(CHECKLIST_SEED.filter(t => t.fase === 'Comercial').length).toBe(7)
  })

  it('Test 3 (CHEC-01): has 6 Diseño y Especificaciones tasks', () => {
    expect(CHECKLIST_SEED.filter(t => t.fase === 'Diseño y Especificaciones').length).toBe(6)
  })

  it('Test 4 (CHEC-01): has 9 Producción tasks', () => {
    expect(CHECKLIST_SEED.filter(t => t.fase === 'Producción').length).toBe(9)
  })

  it('Test 5 (CHEC-01): has 8 Entrega y Cierre tasks', () => {
    expect(CHECKLIST_SEED.filter(t => t.fase === 'Entrega y Cierre').length).toBe(8)
  })

  it('Test 6 (CHEC-01): every entry has a non-empty fase and nombre', () => {
    for (const task of CHECKLIST_SEED) {
      expect(task.fase).toBeTruthy()
      expect(task.nombre).toBeTruthy()
    }
  })
})

describe('calcPhaseProgress', () => {
  it('Test 7 (CHEC-04): returns correct completed and total counts', () => {
    const tasks: ChecklistTask[] = [
      { id: '1', fase: 'Comercial', nombre: 'A', assignee: null, due_date: null, status: 'Completado', sort_order: 0 },
      { id: '2', fase: 'Comercial', nombre: 'B', assignee: null, due_date: null, status: 'Pendiente', sort_order: 1 },
      { id: '3', fase: 'Comercial', nombre: 'C', assignee: null, due_date: null, status: 'En Proceso', sort_order: 2 },
    ]
    const result = calcPhaseProgress(tasks)
    expect(result.completed).toBe(1)
    expect(result.total).toBe(3)
  })

  it('Test 8 (CHEC-04): treats N/A as completed', () => {
    const tasks: ChecklistTask[] = [
      { id: '1', fase: 'Comercial', nombre: 'A', assignee: null, due_date: null, status: 'Completado', sort_order: 0 },
      { id: '2', fase: 'Comercial', nombre: 'B', assignee: null, due_date: null, status: 'N/A', sort_order: 1 },
      { id: '3', fase: 'Comercial', nombre: 'C', assignee: null, due_date: null, status: 'Pendiente', sort_order: 2 },
    ]
    const result = calcPhaseProgress(tasks)
    expect(result.completed).toBe(2)
    expect(result.total).toBe(3)
  })
})
