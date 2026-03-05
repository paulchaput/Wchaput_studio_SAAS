import { createClient } from '@/lib/supabase/server'
import type { PaymentClient, PaymentSupplier } from '@/lib/types'

export async function getClientPayments(projectId: string): Promise<PaymentClient[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments_client')
    .select('id, project_id, tipo, monto, fecha, notas, created_at')
    .eq('project_id', projectId)
    .order('fecha', { ascending: false })
  if (error) throw error
  return (data ?? []).map(p => ({ ...p, monto: Number(p.monto) }))
}

export async function getSupplierPayments(projectId: string): Promise<PaymentSupplier[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments_supplier')
    .select('id, project_id, supplier_id, monto, fecha, notas, created_at')
    .eq('project_id', projectId)
    .order('fecha', { ascending: false })
  if (error) throw error
  return (data ?? []).map(p => ({ ...p, monto: Number(p.monto) }))
}
