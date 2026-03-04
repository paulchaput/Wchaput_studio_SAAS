import { createClient } from '@/lib/supabase/server'

export async function getSuppliers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, nombre')
    .order('nombre')

  if (error) throw error
  return data ?? []
}
