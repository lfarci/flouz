import { describe, expect, it } from 'bun:test'
import { validateMonth, currentMonth, parseAmount } from './month'

describe('validateMonth', () => {
  it('accepts valid YYYY-MM format', () => {
    expect(validateMonth('2026-05')).toBe(true)
    expect(validateMonth('2026-12')).toBe(true)
    expect(validateMonth('2025-01')).toBe(true)
  })

  it('rejects invalid formats', () => {
    expect(validateMonth('2026-13')).toBe(false)
    expect(validateMonth('2026-00')).toBe(false)
    expect(validateMonth('202605')).toBe(false)
    expect(validateMonth('2026-5')).toBe(false)
    expect(validateMonth('May 2026')).toBe(false)
  })
})

describe('currentMonth', () => {
  it('returns a string matching YYYY-MM format', () => {
    const result = currentMonth()
    expect(result).toMatch(/^\d{4}-(?:0[1-9]|1[0-2])$/)
  })
})

describe('parseAmount', () => {
  it('parses a valid positive number', () => {
    expect(parseAmount('2000')).toBe(2000)
    expect(parseAmount('800.50')).toBe(800.5)
  })

  it('throws for zero', () => {
    expect(() => parseAmount('0')).toThrow('Invalid amount')
  })

  it('throws for negative numbers', () => {
    expect(() => parseAmount('-100')).toThrow('Invalid amount')
  })

  it('throws for non-numeric strings', () => {
    expect(() => parseAmount('abc')).toThrow('Invalid amount')
  })

  it('throws for partially numeric strings', () => {
    expect(() => parseAmount('2000abc')).toThrow('Invalid amount')
    expect(() => parseAmount('3500eur')).toThrow('Invalid amount')
  })
})
