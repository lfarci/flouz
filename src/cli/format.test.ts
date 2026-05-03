import { describe, it, expect } from 'bun:test'
import { formatAmount, formatConfidence, truncateWithEllipsis, formatEuro, formatEuroDecimal } from '@/cli/format'

describe('formatAmount', () => {
  it('returns +42.50 for positive numbers', () => {
    expect(formatAmount(42.5)).toBe('+42.50')
  })

  it('returns -42.50 for negative numbers', () => {
    expect(formatAmount(-42.5)).toBe('-42.50')
  })

  it('returns +0.00 for zero', () => {
    expect(formatAmount(0)).toBe('+0.00')
  })
})

describe('formatConfidence', () => {
  it('returns 95% for 0.95', () => {
    expect(formatConfidence(0.95)).toBe('95%')
  })

  it('returns 0% for 0', () => {
    expect(formatConfidence(0)).toBe('0%')
  })

  it('returns 100% for 1.0', () => {
    expect(formatConfidence(1.0)).toBe('100%')
  })
})

describe('truncateWithEllipsis', () => {
  it('returns original text when it fits', () => {
    expect(truncateWithEllipsis('hello', 10)).toBe('hello')
  })

  it('returns truncated text with ellipsis when exceeds maxLength', () => {
    expect(truncateWithEllipsis('hello world', 8)).toBe('hello w…')
  })

  it('handles empty strings and returns as-is', () => {
    expect(truncateWithEllipsis('', 10)).toBe('')
  })

  it('returns text as-is when maxLength < 2', () => {
    expect(truncateWithEllipsis('hello', 1)).toBe('hello')
  })

  it('returns text as-is when exactly at maxLength', () => {
    expect(truncateWithEllipsis('hello', 5)).toBe('hello')
  })

  it('truncates and adds ellipsis when text is one char longer than maxLength', () => {
    expect(truncateWithEllipsis('abcdef', 5)).toBe('abcd…')
  })
})

describe('formatEuro', () => {
  it('formats a whole number with two decimals and thousands separator', () => {
    expect(formatEuro(1000)).toBe('€1,000.00')
  })

  it('formats a decimal amount', () => {
    expect(formatEuro(42.5)).toBe('€42.50')
  })

  it('formats zero', () => {
    expect(formatEuro(0)).toBe('€0.00')
  })

  it('formats negative amounts', () => {
    expect(formatEuro(-500)).toBe('€-500.00')
  })
})

describe('formatEuroDecimal', () => {
  it('formats a positive amount with two decimals', () => {
    expect(formatEuroDecimal(42.5)).toBe('€42.50')
  })

  it('formats a negative amount as absolute value', () => {
    expect(formatEuroDecimal(-100.99)).toBe('€100.99')
  })
})
