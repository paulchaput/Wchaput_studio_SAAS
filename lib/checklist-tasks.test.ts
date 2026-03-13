import { describe, it, expect } from 'vitest'
import { CHECKLIST_SEED, calcPhaseProgress } from '@/lib/checklist-tasks'
import type { ChecklistTask } from '@/lib/types'

describe('CHECKLIST_SEED', () => {
  it('has exactly 9 entries', () => {
    expect(CHECKLIST_SEED.length).toBe(9)
  })

  it('has 3 Cotización tasks', () => {
    expect(CHECKLIST_SEED.filter(t => t.fase === 'Cotización').length).toBe(3)
  })

  it('has 3 Producción tasks', () => {
    expect(CHECKLIST_SEED.filter(t => t.fase === 'Producción').length).toBe(3)
  })

  it('has 3 Entrega tasks', () => {
    expect(CHECKLIST_SEED.filter(t => t.fase === 'Entrega').length).toBe(3)
  })

  it('every entry has a non-empty fase and nombre', () => {
    for (const task of CHECKLIST_SEED) {
      expect(task.fase).toBeTruthy()
      expect(task.nombre).toBeTruthy()
    }
  })
})

describe('calcPhaseProgress', () => {
  it('returns 0/0 for empty array', () => {
    expect(calcPhaseProgress([])).toEqual({ completed: 0, total: 0 })
  })

  it('counts only Completado as completed', () => {
    const tasks: ChecklistTask[] = [
      { id: '1', fase: 'Cotización', nombre: 'A', status: 'Completado', completed_at: null, sort_order: 1 },
      { id: '2', fase: 'Cotización', nombre: 'B', status: 'Pendiente', completed_at: null, sort_order: 2 },
    ]
    expect(calcPhaseProgress(tasks)).toEqual({ completed: 1, total: 2 })
  })
})
