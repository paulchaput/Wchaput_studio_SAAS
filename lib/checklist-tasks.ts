import type { ChecklistTask } from '@/lib/types'

export const CHECKLIST_PHASES = [
  'Comercial',
  'Diseño y Especificaciones',
  'Producción',
  'Entrega y Cierre',
] as const

export type ChecklistFase = typeof CHECKLIST_PHASES[number]

export const CHECKLIST_SEED: Array<{ fase: ChecklistFase; nombre: string }> = [
  // Comercial (7)
  { fase: 'Comercial', nombre: 'Reunión inicial con cliente' },
  { fase: 'Comercial', nombre: 'Levantamiento de necesidades' },
  { fase: 'Comercial', nombre: 'Cotización enviada' },
  { fase: 'Comercial', nombre: 'Anticipo recibido' },
  { fase: 'Comercial', nombre: 'Contrato firmado' },
  { fase: 'Comercial', nombre: 'Fecha de entrega confirmada' },
  { fase: 'Comercial', nombre: 'Expediente del cliente abierto' },
  // Diseño y Especificaciones (6)
  { fase: 'Diseño y Especificaciones', nombre: 'Planos o renders aprobados por cliente' },
  { fase: 'Diseño y Especificaciones', nombre: 'Materiales y acabados definidos' },
  { fase: 'Diseño y Especificaciones', nombre: 'Órdenes de compra enviadas a proveedores' },
  { fase: 'Diseño y Especificaciones', nombre: 'Recepción de materiales confirmada' },
  { fase: 'Diseño y Especificaciones', nombre: 'Control de calidad en materiales' },
  { fase: 'Diseño y Especificaciones', nombre: 'Especificaciones técnicas entregadas a producción' },
  // Producción (9)
  { fase: 'Producción', nombre: 'Corte de materiales' },
  { fase: 'Producción', nombre: 'Armado de estructura' },
  { fase: 'Producción', nombre: 'Aplicación de acabados' },
  { fase: 'Producción', nombre: 'Control de calidad intermedio' },
  { fase: 'Producción', nombre: 'Tapizado o revestimiento' },
  { fase: 'Producción', nombre: 'Ensamblaje final' },
  { fase: 'Producción', nombre: 'Revisión dimensional' },
  { fase: 'Producción', nombre: 'Fotografías del producto terminado' },
  { fase: 'Producción', nombre: 'Aprobación interna antes de entrega' },
  // Entrega y Cierre (8)
  { fase: 'Entrega y Cierre', nombre: 'Logística de entrega coordinada' },
  { fase: 'Entrega y Cierre', nombre: 'Instalación en sitio' },
  { fase: 'Entrega y Cierre', nombre: 'Revisión final con cliente' },
  { fase: 'Entrega y Cierre', nombre: 'Finiquito recibido' },
  { fase: 'Entrega y Cierre', nombre: 'Factura / comprobante emitido' },
  { fase: 'Entrega y Cierre', nombre: 'Pagos a proveedores liquidados' },
  { fase: 'Entrega y Cierre', nombre: 'Expediente cerrado en sistema' },
  { fase: 'Entrega y Cierre', nombre: 'Retroalimentación del cliente obtenida' },
]

export function calcPhaseProgress(tasks: ChecklistTask[]): { completed: number; total: number } {
  return {
    completed: tasks.filter(t => t.status === 'Completado' || t.status === 'N/A').length,
    total: tasks.length,
  }
}
