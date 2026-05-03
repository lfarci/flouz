import { describe, it, expect, afterEach } from 'bun:test'
import pc from 'picocolors'
import {
  colorAmount,
  colorConfidence,
  formatStatus,
  ICON_ACTIVE,
  ICON_PENDING,
  ICON_SUCCESS,
  ICON_REJECTED,
} from '@/cli/theme'

describe('theme', () => {
  const originalNoColor = process.env.NO_COLOR

  afterEach(() => {
    process.env.NO_COLOR = originalNoColor
  })

  describe('colorAmount', () => {
    it('returns green-wrapped text for positive amounts', () => {
      const result = colorAmount(100, '100')
      const expected = pc.green('100')
      expect(result).toBe(expected)
    })

    it('returns green-wrapped text for zero', () => {
      const result = colorAmount(0, '0')
      const expected = pc.green('0')
      expect(result).toBe(expected)
    })

    it('returns red-wrapped text for negative amounts', () => {
      const result = colorAmount(-50, '-50')
      const expected = pc.red('-50')
      expect(result).toBe(expected)
    })

    it('returns plain text when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1'
      const result = colorAmount(100, '100')
      expect(result).toBe('100')
    })

    it('returns plain text when NO_COLOR is empty string', () => {
      process.env.NO_COLOR = ''
      const result = colorAmount(100, '100')
      expect(result).toBe('100')
    })
  })

  describe('colorConfidence', () => {
    it('returns green-wrapped text for confidence >= 0.75', () => {
      const result = colorConfidence(0.75, '75%')
      const expected = pc.green('75%')
      expect(result).toBe(expected)
    })

    it('returns green-wrapped text for confidence > 0.75', () => {
      const result = colorConfidence(0.9, '90%')
      const expected = pc.green('90%')
      expect(result).toBe(expected)
    })

    it('returns dim-wrapped text for confidence between 0.50 and 0.74', () => {
      const result = colorConfidence(0.6, '60%')
      const expected = pc.dim('60%')
      expect(result).toBe(expected)
    })

    it('returns dim-wrapped text for confidence at 0.50', () => {
      const result = colorConfidence(0.5, '50%')
      const expected = pc.dim('50%')
      expect(result).toBe(expected)
    })

    it('returns yellow-wrapped text for confidence < 0.50', () => {
      const result = colorConfidence(0.25, '25%')
      const expected = pc.yellow('25%')
      expect(result).toBe(expected)
    })

    it('returns plain text when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1'
      const result = colorConfidence(0.9, '90%')
      expect(result).toBe('90%')
    })
  })

  describe('formatStatus', () => {
    it('returns dim pending icon and text for pending status', () => {
      const result = formatStatus('pending')
      const expected = `${pc.dim(ICON_PENDING)} ${pc.dim('pending')}`
      expect(result).toBe(expected)
    })

    it('returns green approved icon and text for approved status', () => {
      const result = formatStatus('approved')
      const expected = `${pc.green(ICON_ACTIVE)} ${pc.green('approved')}`
      expect(result).toBe(expected)
    })

    it('returns blue applied icon and text for applied status', () => {
      const result = formatStatus('applied')
      const expected = `${pc.blue(ICON_SUCCESS)} ${pc.blue('applied')}`
      expect(result).toBe(expected)
    })

    it('returns red rejected icon and text for rejected status', () => {
      const result = formatStatus('rejected')
      const expected = `${pc.red(ICON_REJECTED)} ${pc.red('rejected')}`
      expect(result).toBe(expected)
    })

    it('returns plain text with icon when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1'
      const result = formatStatus('approved')
      expect(result).toBe(`${ICON_ACTIVE} approved`)
    })
  })
})
