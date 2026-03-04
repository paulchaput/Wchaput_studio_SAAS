import { describe, it, expect } from 'vitest'
import {
  formatMXN,
  formatFecha,
  margenToPercent,
  percentToMargen,
} from './formatters'

describe('formatMXN', () => {
  it('contains "1,234.56" for 1234.56', () => {
    expect(formatMXN(1234.56)).toContain('1,234.56')
  })

  it('contains "0.00" for 0', () => {
    expect(formatMXN(0)).toContain('0.00')
  })

  it('contains "145,000.00" for 145000', () => {
    expect(formatMXN(145000)).toContain('145,000.00')
  })
})

describe('formatFecha', () => {
  it('contains "04" and "mar" for 2026-03-04 (no off-by-one)', () => {
    const result = formatFecha('2026-03-04')
    expect(result).toContain('04')
    expect(result).toContain('mar')
  })

  it('returns "—" for null', () => {
    expect(formatFecha(null)).toBe('—')
  })

  it('returns "—" for undefined', () => {
    expect(formatFecha(undefined)).toBe('—')
  })
})

describe('margenToPercent', () => {
  it('returns "50" for 0.50', () => {
    expect(margenToPercent(0.50)).toBe('50')
  })
})

describe('percentToMargen', () => {
  it('returns 0.50 for "50"', () => {
    expect(percentToMargen('50')).toBe(0.50)
  })
})
