import { describe, expect, it } from 'bun:test'
import { formatBudgetTable } from './list'

describe('formatBudgetTable', () => {
  it('renders a table with fixed budget rows', () => {
    const rows = [
      { categoryName: 'Necessities', amount: '€2,000.00' },
      { categoryName: 'Savings', amount: '€500.00' },
    ]

    const result = formatBudgetTable(rows)

    expect(result.length).toBeGreaterThan(0)
    const output = result.join('\n')
    expect(output).toContain('Category')
    expect(output).toContain('Monthly (€)')
    expect(output).toContain('Necessities')
    expect(output).toContain('€2,000.00')
    expect(output).toContain('Savings')
    expect(output).toContain('€500.00')
  })

  it('renders a table with percentage budget rows showing resolved amount', () => {
    const rows = [
      { categoryName: 'Necessities', amount: '€2,100.00 (60% of €3,500)' },
    ]

    const result = formatBudgetTable(rows)

    const output = result.join('\n')
    expect(output).toContain('60%')
    expect(output).toContain('€2,100.00')
  })

  it('renders percentage budget with no income data', () => {
    const rows = [
      { categoryName: 'Savings', amount: '€0 (20% — no income data)' },
    ]

    const result = formatBudgetTable(rows)

    const output = result.join('\n')
    expect(output).toContain('no income data')
  })

  it('returns an array of strings', () => {
    const rows = [
      { categoryName: 'Discretionary', amount: '€800.00' },
    ]

    const result = formatBudgetTable(rows)

    expect(Array.isArray(result)).toBe(true)
    for (const line of result) {
      expect(typeof line).toBe('string')
    }
  })
})
