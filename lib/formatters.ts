// lib/formatters.ts — Pure formatting functions for MXN currency and dates

/**
 * Format a number as Mexican Peso currency.
 * Uses Intl.NumberFormat with MXN locale.
 * Output always contains "1,234.56" style formatting.
 */
export function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format an ISO date string as DD/MMM/YYYY in Spanish.
 * Uses Date.UTC to avoid timezone off-by-one (Mexico City = UTC-6).
 *
 * Example: formatFecha('2026-03-04') → '04/mar/2026'
 *
 * Returns '—' for null or undefined inputs.
 */
export function formatFecha(date: string | null | undefined): string {
  if (date == null) return '—'

  // Parse the date parts directly to avoid timezone shifts
  const parts = date.split('-')
  if (parts.length !== 3) return '—'

  const [yearStr, monthStr, dayStr] = parts
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10) - 1 // months are 0-indexed in UTC
  const day = parseInt(dayStr, 10)

  const d = new Date(Date.UTC(year, month, day))

  const dayFormatted = d.getUTCDate().toString().padStart(2, '0')
  const monthFormatted = d.toLocaleDateString('es-MX', {
    month: 'short',
    timeZone: 'UTC',
  })
  const yearFormatted = d.getUTCFullYear()

  return `${dayFormatted}/${monthFormatted}/${yearFormatted}`
}

/**
 * Convert a decimal margen to a display percentage string.
 * Example: margenToPercent(0.50) → "50"
 */
export function margenToPercent(margen: number): string {
  return (margen * 100).toString()
}

/**
 * Convert a percentage string to a decimal margen.
 * Example: percentToMargen("50") → 0.50
 */
export function percentToMargen(percent: string): number {
  return parseFloat(percent) / 100
}
