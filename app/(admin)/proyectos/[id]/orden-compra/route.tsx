import { renderToStream } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { OrdenCompraTemplate } from '@/lib/pdf/OrdenCompraTemplate'
import { getProjectLineItemsBySupplier } from '@/lib/queries/projects'

interface RouteContext {
  params: Promise<{ id: string }>
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('No autorizado', { status: 401 })

  // Admin-only role check (OC-03)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return new Response('Acceso denegado', { status: 403 })
  }

  // Validate supplier_id query param (Pitfall 6)
  const supplierId = new URL(request.url).searchParams.get('supplier_id')
  if (!supplierId || !UUID_REGEX.test(supplierId)) {
    return new Response('supplier_id requerido y debe ser UUID válido', { status: 400 })
  }

  const ocData = await getProjectLineItemsBySupplier(id, supplierId)
  if (!ocData) return new Response('Datos no encontrados', { status: 404 })
  if (ocData.lineItems.length === 0) {
    return new Response('Este proveedor no tiene partidas en este proyecto', { status: 404 })
  }

  const stream = await renderToStream(<OrdenCompraTemplate data={ocData} />)

  const supplierSlug = ocData.supplier.nombre.toLowerCase().replace(/\s+/g, '-')
  const filename = `oc-${supplierSlug}-${id}.pdf`

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
