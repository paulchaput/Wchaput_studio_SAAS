import type { ChecklistTask } from '@/lib/types'

export const CHECKLIST_PHASES = [
  'Cotización',
  'Producción',
  'Entrega',
] as const

export type ChecklistFase = typeof CHECKLIST_PHASES[number]

export const CHECKLIST_SEED: Array<{ fase: ChecklistFase; nombre: string }> = [
  // Cotización (3)
  { fase: 'Cotización', nombre: 'Cotización enviada' },
  { fase: 'Cotización', nombre: 'Anticipo recibido' },
  { fase: 'Cotización', nombre: 'Orden de compra a proveedores' },
  // Producción (3)
  { fase: 'Producción', nombre: 'Materiales recibidos' },
  { fase: 'Producción', nombre: 'En producción' },
  { fase: 'Producción', nombre: 'Control de calidad aprobado' },
  // Entrega (3)
  { fase: 'Entrega', nombre: 'Entregado / Instalado' },
  { fase: 'Entrega', nombre: 'Finiquito recibido' },
  { fase: 'Entrega', nombre: 'Expediente cerrado' },
]

export function calcPhaseProgress(tasks: ChecklistTask[]): { completed: number; total: number } {
  return {
    completed: tasks.filter(t => t.status === 'Completado').length,
    total: tasks.length,
  }
}
