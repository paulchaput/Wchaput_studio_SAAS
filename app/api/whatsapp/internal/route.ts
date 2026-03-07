// app/api/whatsapp/internal/route.ts — Internal endpoint for the Baileys WhatsApp bot
//
// Uses Claude tool_use: Claude reads the message, decides what action to take,
// executes it against Supabase, and formulates a natural response.

import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/service'
import {
  handleCrearProyecto,
  handleRegistrarPagoCliente,
  handleRegistrarPagoProveedor,
  handleConsultarSaldo,
  handleActualizarEstatus,
} from '@/lib/whatsapp/actions'

const anthropic = new Anthropic()

// How many past messages to send to Claude per request (token budget)
const CONTEXT_WINDOW = 100

const SYSTEM_PROMPT = `Eres el asistente de W Chaput Studio, un estudio de diseño de interiores mexicano.
Ayudas al equipo a registrar pagos y consultar información de proyectos desde WhatsApp.

Contexto importante:
- Los proyectos se nombran con el apellido del cliente. Ejemplo: "García", "Ortiz", "Madrigal".
- "García pagó $50,000 de anticipo" significa: el proyecto "García" recibió un pago de anticipo de $50,000 del cliente.
- "Pagamos $30,000 a Madecor en García" significa: se pagó $30,000 al proveedor "Madecor" dentro del proyecto "García".
- Cuando el mensaje dice "[Apellido] pagó $X", el apellido ES el nombre del proyecto, no el nombre de quien paga.
- Los montos pueden venir con o sin signo de pesos y con o sin comas (50,000 = 50000).

Usa la herramienta correcta directamente con la información del mensaje. No pidas confirmación si ya tienes todos los datos necesarios.
Responde de forma concisa en español.`

const tools: Anthropic.Tool[] = [
  {
    name: 'crear_proyecto',
    description: 'Crea un nuevo proyecto en el sistema',
    input_schema: {
      type: 'object' as const,
      properties: {
        nombre: { type: 'string', description: 'Nombre del proyecto (generalmente el apellido del cliente)' },
        cliente_nombre: { type: 'string', description: 'Nombre completo del cliente (opcional, si no se da se usa el nombre del proyecto)' },
      },
      required: ['nombre'],
    },
  },
  {
    name: 'registrar_pago_cliente',
    description: 'Registra un pago recibido de un cliente para un proyecto (anticipo, finiquito u otro)',
    input_schema: {
      type: 'object' as const,
      properties: {
        proyecto: { type: 'string', description: 'Nombre del proyecto' },
        monto: { type: 'number', description: 'Monto en pesos MXN (solo número)' },
        tipo: { type: 'string', enum: ['anticipo', 'finiquito', 'otro'] },
      },
      required: ['proyecto', 'monto', 'tipo'],
    },
  },
  {
    name: 'registrar_pago_proveedor',
    description: 'Registra un pago realizado a un proveedor para un proyecto',
    input_schema: {
      type: 'object' as const,
      properties: {
        proyecto: { type: 'string', description: 'Nombre del proyecto' },
        proveedor: { type: 'string', description: 'Nombre del proveedor' },
        monto: { type: 'number', description: 'Monto en pesos MXN' },
      },
      required: ['proyecto', 'proveedor', 'monto'],
    },
  },
  {
    name: 'consultar_saldo',
    description: 'Consulta pagos cobrados al cliente y pagados a proveedores de un proyecto, o el total pagado a un proveedor',
    input_schema: {
      type: 'object' as const,
      properties: {
        proyecto: { type: 'string', description: 'Nombre del proyecto (opcional)' },
        proveedor: { type: 'string', description: 'Nombre del proveedor (opcional)' },
      },
    },
  },
  {
    name: 'actualizar_estatus',
    description: 'Actualiza el estatus de un proyecto. Opciones: Prospecto, Cotizado, Anticipo Recibido, En Producción, Entregado, Cerrado',
    input_schema: {
      type: 'object' as const,
      properties: {
        proyecto: { type: 'string', description: 'Nombre del proyecto' },
        estatus: { type: 'string', description: 'Nuevo estatus del proyecto' },
      },
      required: ['proyecto', 'estatus'],
    },
  },
]

type Entities = Record<string, string | number | null>

async function executeTool(name: string, input: Entities): Promise<string> {
  switch (name) {
    case 'crear_proyecto':
      return (await handleCrearProyecto(input)).message
    case 'registrar_pago_cliente':
      return (await handleRegistrarPagoCliente(input)).message
    case 'registrar_pago_proveedor':
      return (await handleRegistrarPagoProveedor(input)).message
    case 'consultar_saldo':
      return (await handleConsultarSaldo(input)).message
    case 'actualizar_estatus':
      return (await handleActualizarEstatus(input)).message
    default:
      return 'Herramienta no reconocida'
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = request.headers.get('Authorization') ?? ''
  const apiKey = process.env.WHATSAPP_BOT_API_KEY
  if (!apiKey || auth !== `Bearer ${apiKey}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { message?: string; from?: string; groupJid?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { message, groupJid = 'default' } = body
  if (!message?.trim()) {
    return Response.json({ error: 'No message provided' }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()
    const [{ data: projects }, { data: suppliers }] = await Promise.all([
      supabase.from('projects').select('nombre').order('nombre'),
      supabase.from('suppliers').select('nombre').order('nombre'),
    ])

    const contextLine = [
      projects?.length
        ? `Proyectos existentes: ${projects.map(p => p.nombre).join(', ')}`
        : 'No hay proyectos registrados aún.',
      suppliers?.length
        ? `Proveedores existentes: ${suppliers.map(s => s.nombre).join(', ')}`
        : 'No hay proveedores registrados aún.',
    ].join('\n')

    // Load conversation history from Supabase
    const { data: pastMessages } = await supabase
      .from('bot_messages')
      .select('role, content')
      .eq('group_jid', groupJid)
      .order('created_at', { ascending: true })

    // Save the new user message
    await supabase.from('bot_messages').insert({
      group_jid: groupJid,
      role: 'user',
      content: `${contextLine}\n\nMensaje: ${message.trim()}`,
    })

    // Build messages array: all history + current message (capped to CONTEXT_WINDOW)
    const allMessages: Anthropic.MessageParam[] = [
      ...(pastMessages ?? []).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: `${contextLine}\n\nMensaje: ${message.trim()}` },
    ]
    const userMessages = allMessages.slice(-CONTEXT_WINDOW)

    // First call: Claude decides which tool to use
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages: userMessages,
    })

    // No tool needed — Claude responds directly
    if (response.stop_reason !== 'tool_use') {
      const text = response.content.find(b => b.type === 'text')
      const reply = text?.text ?? '❓ No entendí el mensaje.'
      await supabase.from('bot_messages').insert({ group_jid: groupJid, role: 'assistant', content: reply })
      return Response.json({ reply })
    }

    // Execute each tool Claude requested
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue
      console.log(`[Internal] Tool: ${block.name} | input: ${JSON.stringify(block.input)}`)
      const result = await executeTool(block.name, block.input as Entities)
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
    }

    // Second call: Claude formulates the final natural response
    const finalResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      tools,
      messages: [
        ...userMessages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ],
    })

    const finalText = finalResponse.content.find(b => b.type === 'text')
    const reply = finalText?.text ?? '✅ Listo.'
    await supabase.from('bot_messages').insert({ group_jid: groupJid, role: 'assistant', content: reply })
    return Response.json({ reply })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Internal] Error:', error)
    return Response.json({ reply: `❌ Error: ${msg}` })
  }
}
