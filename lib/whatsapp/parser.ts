import Anthropic from '@anthropic-ai/sdk'
import type { ParsedMessage, Intent } from './types'

const client = new Anthropic()

const SYSTEM_PROMPT = `Eres el asistente de W Chaput Studio. Analizas mensajes en lenguaje natural y extraes la intención y entidades.

Responde SIEMPRE con JSON válido con esta estructura exacta:
{
  "intent": "<intent>",
  "entities": { ... },
  "confidence": 0.0-1.0
}

Intenciones disponibles:
- "registrar_pago_cliente": cliente paga al estudio
  entities: { proyecto: string, monto: number, tipo: "anticipo"|"finiquito"|"otro" }
- "registrar_pago_proveedor": estudio paga a proveedor
  entities: { proyecto: string, proveedor: string, monto: number }
- "consultar_saldo": pregunta por saldo/deuda/balance
  entities: { proyecto: string|null, proveedor: string|null }
- "actualizar_estatus": cambiar estado de proyecto
  entities: { proyecto: string, estatus: string }
- "unknown": no entendí

Ejemplos:
"García pagó $50,000 de anticipo" → registrar_pago_cliente, proyecto:"García", monto:50000, tipo:"anticipo"
"Pagamos $30,000 a Madecor en García" → registrar_pago_proveedor, proyecto:"García", proveedor:"Madecor", monto:30000
"¿Cuánto le debemos a Innovika?" → consultar_saldo, proveedor:"Innovika"
"García ya está en producción" → actualizar_estatus, proyecto:"García", estatus:"En Producción"

Solo responde JSON, sin texto adicional.`

export async function parseMessage(message: string): Promise<ParsedMessage> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: message }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  try {
    const parsed = JSON.parse(clean)
    return {
      intent: (parsed.intent as Intent) ?? 'unknown',
      entities: parsed.entities ?? {},
      confidence: parsed.confidence ?? 0,
      rawResponse: raw,
    }
  } catch {
    return { intent: 'unknown', entities: {}, confidence: 0, rawResponse: clean }
  }
}
