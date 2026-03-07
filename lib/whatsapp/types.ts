export type Intent =
  | 'registrar_pago_cliente'
  | 'registrar_pago_proveedor'
  | 'consultar_saldo'
  | 'actualizar_estatus'
  | 'unknown'

export interface ParsedMessage {
  intent: Intent
  entities: Record<string, string | number | null>
  confidence: number
  rawResponse: string
}
