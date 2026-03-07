import { createServiceClient } from '@/lib/supabase/service'
import { PIPELINE_STAGES } from '@/lib/calculations'
import { formatMXN } from '@/lib/formatters'

type Entities = Record<string, string | number | null>

// Find project by partial name match
async function findProject(supabase: Awaited<ReturnType<typeof createServiceClient>>, nombre: string) {
  const { data } = await supabase
    .from('projects')
    .select('id, nombre, cliente_nombre')
    .ilike('nombre', `%${nombre}%`)
    .limit(3)
  return data ?? []
}

// Find supplier by partial name match
async function findSupplier(supabase: Awaited<ReturnType<typeof createServiceClient>>, nombre: string) {
  const { data } = await supabase
    .from('suppliers')
    .select('id, nombre')
    .ilike('nombre', `%${nombre}%`)
    .limit(3)
  return data ?? []
}

export async function handleCrearProyecto(entities: Entities): Promise<{ message: string }> {
  const supabase = createServiceClient()
  const nombre = String(entities.nombre ?? '')
  const clienteNombre = String(entities.cliente_nombre ?? nombre)

  if (!nombre) return { message: '❌ Necesito el nombre del proyecto.' }

  const { error } = await supabase.from('projects').insert({
    nombre,
    cliente_nombre: clienteNombre,
    status: 'Prospecto',
  })

  if (error) return { message: `❌ Error al crear el proyecto: ${error.message}` }

  return { message: `✅ Proyecto "${nombre}" creado con estatus Prospecto.` }
}

export async function handleRegistrarPagoCliente(entities: Entities): Promise<{ message: string }> {
  const supabase = createServiceClient()
  const proyectoNombre = String(entities.proyecto ?? '')
  const monto = Number(entities.monto ?? 0)
  const tipo = String(entities.tipo ?? 'otro')

  if (!proyectoNombre || monto <= 0)
    return { message: '❌ Necesito el nombre del proyecto y el monto.' }

  const proyectos = await findProject(supabase, proyectoNombre)
  if (proyectos.length === 0)
    return { message: `❌ No encontré ningún proyecto con el nombre "${proyectoNombre}".` }
  if (proyectos.length > 1)
    return { message: `❓ Encontré varios proyectos:\n${proyectos.map(p => `• ${p.nombre}`).join('\n')}\n\nSé más específico.` }

  const proyecto = proyectos[0]
  const fecha = new Date().toISOString().split('T')[0]

  const { error } = await supabase.from('payments_client').insert({
    project_id: proyecto.id,
    tipo,
    monto,
    fecha,
    notas: 'Registrado vía WhatsApp',
  })

  if (error) return { message: `❌ Error al registrar: ${error.message}` }

  return {
    message: `✅ Pago registrado\n📁 Proyecto: ${proyecto.nombre}\n💰 Monto: ${formatMXN(monto)}\n🏷️ Tipo: ${tipo}\n📅 Fecha: ${fecha}`,
  }
}

export async function handleRegistrarPagoProveedor(entities: Entities): Promise<{ message: string }> {
  const supabase = createServiceClient()
  const proyectoNombre = String(entities.proyecto ?? '')
  const proveedorNombre = String(entities.proveedor ?? '')
  const monto = Number(entities.monto ?? 0)

  if (!proyectoNombre || !proveedorNombre || monto <= 0)
    return { message: '❌ Necesito el proyecto, proveedor y monto.' }

  const [proyectos, proveedores] = await Promise.all([
    findProject(supabase, proyectoNombre),
    findSupplier(supabase, proveedorNombre),
  ])

  if (proyectos.length === 0) return { message: `❌ No encontré el proyecto "${proyectoNombre}".` }
  if (proyectos.length > 1) return { message: `❓ Varios proyectos:\n${proyectos.map(p => `• ${p.nombre}`).join('\n')}` }
  if (proveedores.length === 0) return { message: `❌ No encontré el proveedor "${proveedorNombre}".` }
  if (proveedores.length > 1) return { message: `❓ Varios proveedores:\n${proveedores.map(p => `• ${p.nombre}`).join('\n')}` }

  const fecha = new Date().toISOString().split('T')[0]

  const { error } = await supabase.from('payments_supplier').insert({
    project_id: proyectos[0].id,
    supplier_id: proveedores[0].id,
    monto,
    fecha,
    notas: 'Registrado vía WhatsApp',
  })

  if (error) return { message: `❌ Error: ${error.message}` }

  return {
    message: `✅ Pago a proveedor registrado\n📁 Proyecto: ${proyectos[0].nombre}\n🏭 Proveedor: ${proveedores[0].nombre}\n💰 Monto: ${formatMXN(monto)}\n📅 Fecha: ${fecha}`,
  }
}

export async function handleConsultarSaldo(entities: Entities): Promise<{ message: string }> {
  const supabase = createServiceClient()
  const proyectoNombre = entities.proyecto ? String(entities.proyecto) : null
  const proveedorNombre = entities.proveedor ? String(entities.proveedor) : null

  if (proveedorNombre) {
    const proveedores = await findSupplier(supabase, proveedorNombre)
    if (proveedores.length === 0) return { message: `❌ No encontré el proveedor "${proveedorNombre}".` }
    const prov = proveedores[0]

    const { data: payments } = await supabase
      .from('payments_supplier')
      .select('monto')
      .eq('supplier_id', prov.id)

    const totalPagado = (payments ?? []).reduce((s, p) => s + Number(p.monto), 0)
    return { message: `🏭 ${prov.nombre}\n💸 Total pagado: ${formatMXN(totalPagado)}` }
  }

  if (proyectoNombre) {
    const proyectos = await findProject(supabase, proyectoNombre)
    if (proyectos.length === 0) return { message: `❌ No encontré el proyecto "${proyectoNombre}".` }
    if (proyectos.length > 1) return { message: `❓ Varios proyectos:\n${proyectos.map(p => `• ${p.nombre}`).join('\n')}` }
    const proyecto = proyectos[0]

    const [{ data: pagosCliente }, { data: pagosProveedor }] = await Promise.all([
      supabase.from('payments_client').select('monto').eq('project_id', proyecto.id),
      supabase.from('payments_supplier').select('monto').eq('project_id', proyecto.id),
    ])

    const cobrado = (pagosCliente ?? []).reduce((s, p) => s + Number(p.monto), 0)
    const pagado = (pagosProveedor ?? []).reduce((s, p) => s + Number(p.monto), 0)

    return {
      message: `📁 ${proyecto.nombre}\n💚 Cobrado al cliente: ${formatMXN(cobrado)}\n💸 Pagado a proveedores: ${formatMXN(pagado)}`,
    }
  }

  return { message: '❓ ¿De qué proyecto o proveedor quieres el saldo?' }
}

export async function handleActualizarEstatus(entities: Entities): Promise<{ message: string }> {
  const supabase = createServiceClient()
  const proyectoNombre = String(entities.proyecto ?? '')
  const estatusRaw = String(entities.estatus ?? '')

  if (!proyectoNombre || !estatusRaw)
    return { message: '❌ Necesito el proyecto y el nuevo estatus.' }

  const estatus = (PIPELINE_STAGES as readonly string[]).find(
    s => s.toLowerCase().includes(estatusRaw.toLowerCase())
  )
  if (!estatus)
    return { message: `❌ Estatus inválido. Opciones:\n${PIPELINE_STAGES.join(', ')}` }

  const proyectos = await findProject(supabase, proyectoNombre)
  if (proyectos.length === 0) return { message: `❌ No encontré el proyecto "${proyectoNombre}".` }
  if (proyectos.length > 1) return { message: `❓ Varios proyectos:\n${proyectos.map(p => `• ${p.nombre}`).join('\n')}` }

  const { error } = await supabase
    .from('projects')
    .update({ status: estatus })
    .eq('id', proyectos[0].id)

  if (error) return { message: `❌ Error: ${error.message}` }

  return { message: `✅ Estatus actualizado\n📁 ${proyectos[0].nombre}\n🔄 ${estatus}` }
}
