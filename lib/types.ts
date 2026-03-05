// lib/types.ts — Database types aligned to Phase 1 schema

export type UserRole = 'admin' | 'accountant'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  created_at: string
}

export interface Project {
  id: string
  nombre: string
  cliente_nombre: string
  numero_cotizacion: string | null
  fecha_cotizacion: string | null  // ISO date string
  salesperson: string | null
  fecha_entrega_estimada: string | null  // ISO date string
  status: 'Prospecto' | 'Cotizado' | 'Anticipo Recibido' | 'En Producción' | 'Entregado' | 'Cerrado'
  notas: string | null
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  nombre: string
  contacto: string | null
  email: string | null
  telefono: string | null
  notas: string | null
  created_at: string
}

export interface LineItem {
  id: string
  project_id: string
  descripcion: string
  referencia: string | null
  dimensiones: string | null
  cantidad: number
  proveedor_id: string | null
  costo_proveedor: number   // NUMERIC(12,2) — ADMIN ONLY
  margen: number            // NUMERIC(5,4) — ADMIN ONLY, e.g. 0.50 = 50%
  created_at: string
}

export interface PaymentClient {
  id: string
  project_id: string
  tipo: 'anticipo' | 'finiquito' | 'otro'
  monto: number  // NUMERIC(12,2)
  fecha: string  // ISO date string
  notas: string | null
  created_at: string
}

export interface PaymentSupplier {
  id: string
  project_id: string
  supplier_id: string | null
  monto: number  // NUMERIC(12,2)
  fecha: string  // ISO date string
  notas: string | null
  created_at: string
}

export type ChecklistStatus = 'Pendiente' | 'En Proceso' | 'Completado' | 'Bloqueado' | 'N/A'
// ChecklistFase is also exported from lib/checklist-tasks.ts — use whichever is more convenient

export interface ChecklistTask {
  id: string
  project_id?: string
  fase: 'Comercial' | 'Diseño y Especificaciones' | 'Producción' | 'Entrega y Cierre'
  nombre: string
  assignee: string | null
  due_date: string | null   // ISO date string e.g. "2026-04-15"
  status: ChecklistStatus
  sort_order: number
}
