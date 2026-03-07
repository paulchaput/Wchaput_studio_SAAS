// app/api/whatsapp/webhook/route.ts — Twilio WhatsApp webhook handler
//
// Setup required:
//   ANTHROPIC_API_KEY        — Anthropic API key for Claude Haiku
//   TWILIO_AUTH_TOKEN        — From Twilio Console (used for signature validation)
//   TWILIO_WEBHOOK_URL       — Full public URL, e.g. https://tu-app.vercel.app/api/whatsapp/webhook
//   WHATSAPP_AUTHORIZED_NUMBERS — Comma-separated: whatsapp:+521234567890,whatsapp:+529876543210
//   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key (bypasses RLS for bot writes)
//
// Twilio sandbox config:
//   Messaging → WhatsApp → Sandbox → Webhook URL: <TWILIO_WEBHOOK_URL>
//   HTTP Method: POST

import { createHmac } from 'crypto'
import { parseMessage } from '@/lib/whatsapp/parser'
import {
  handleRegistrarPagoCliente,
  handleRegistrarPagoProveedor,
  handleConsultarSaldo,
  handleActualizarEstatus,
} from '@/lib/whatsapp/actions'
import type { ParsedMessage } from '@/lib/whatsapp/types'

// ─── Twilio signature validation ─────────────────────────────────────────────

function validateTwilioSignature(
  signature: string,
  body: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const webhookUrl = process.env.TWILIO_WEBHOOK_URL

  if (!authToken || !webhookUrl) {
    console.warn('[WhatsApp] Missing TWILIO_AUTH_TOKEN or TWILIO_WEBHOOK_URL — skipping signature check')
    return true // Allow in dev if env vars not set
  }

  const sortedParams = Object.keys(body)
    .sort()
    .map((k) => k + body[k])
    .join('')

  const expected = createHmac('sha1', authToken)
    .update(webhookUrl + sortedParams)
    .digest('base64')

  return signature === expected
}

// ─── TwiML response helper ────────────────────────────────────────────────────

function twimlResponse(text: string): Response {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`
  return new Response(xml, {
    headers: { 'Content-Type': 'text/xml' },
  })
}

// ─── Intent dispatcher ────────────────────────────────────────────────────────

async function handleIntent(parsed: ParsedMessage): Promise<{ message: string }> {
  switch (parsed.intent) {
    case 'registrar_pago_cliente':
      return handleRegistrarPagoCliente(parsed.entities)
    case 'registrar_pago_proveedor':
      return handleRegistrarPagoProveedor(parsed.entities)
    case 'consultar_saldo':
      return handleConsultarSaldo(parsed.entities)
    case 'actualizar_estatus':
      return handleActualizarEstatus(parsed.entities)
    default:
      return {
        message:
          '❓ No entendí el mensaje. Ejemplos:\n' +
          '• "García pagó $50,000 de anticipo"\n' +
          '• "Pagamos $30,000 a Madecor en García"\n' +
          '• "¿Cuánto le debemos a Madecor en García?"\n' +
          '• "García ya está en producción"',
      }
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  try {
    // 1. Parse form body (Twilio sends application/x-www-form-urlencoded)
    const formData = await request.formData()
    const body: Record<string, string> = {}
    formData.forEach((value, key) => {
      if (typeof value === 'string') body[key] = value
    })

    // 2. Validate Twilio signature
    const signature = request.headers.get('X-Twilio-Signature') ?? ''
    if (!validateTwilioSignature(signature, body)) {
      return new Response('Forbidden', { status: 403 })
    }

    // 3. Check authorized numbers
    const from = body.From ?? ''
    const authorizedRaw = process.env.WHATSAPP_AUTHORIZED_NUMBERS ?? ''
    if (authorizedRaw) {
      const authorized = authorizedRaw.split(',').map((n) => n.trim())
      if (!authorized.includes(from)) {
        console.warn(`[WhatsApp] Unauthorized sender: ${from}`)
        return twimlResponse('No estás autorizado para usar este bot.')
      }
    }

    // 4. Get message text
    const messageText = (body.Body ?? '').trim()
    if (!messageText) {
      return new Response('OK', { status: 200 })
    }

    console.log(`[WhatsApp] Message from ${from}: "${messageText}"`)

    // 5. Parse intent with Claude Haiku
    const parsed = await parseMessage(messageText)
    console.log(`[WhatsApp] Parsed intent: ${parsed.intent} (confidence: ${parsed.confidence})`)

    // 6. Execute action
    const result = await handleIntent(parsed)

    // 7. Reply via TwiML
    return twimlResponse(result.message)
  } catch (error) {
    console.error('[WhatsApp] Unhandled error:', error)
    return twimlResponse('❌ Ocurrió un error inesperado. Intenta de nuevo.')
  }
}
