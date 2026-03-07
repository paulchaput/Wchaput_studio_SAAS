import { renderToStream } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { CotizacionTemplate } from '@/lib/pdf/CotizacionTemplate'
import { getProjectForQuote } from '@/lib/queries/projects'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('No autorizado', { status: 401 })

  const project = await getProjectForQuote(id)
  if (!project) return new Response('Proyecto no encontrado', { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = await renderToStream(<CotizacionTemplate project={project} /> as any)

  const filename = project.numero_cotizacion
    ? `cotizacion-${project.numero_cotizacion}.pdf`
    : `cotizacion-${id}.pdf`

  const preview = new URL(request.url).searchParams.get('preview') === '1'
  const disposition = preview ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': disposition,
    },
  })
}
