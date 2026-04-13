import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { getCategories } from '@/db/categories/queries'
import { seedCategories } from '@/db/categories/seed'
import { initDb } from '@/db/schema'
import { insertTransaction } from '@/db/transactions/mutations'
import { buildSummaryLines, findCategoryId, formatTransactionTable } from '.'

describe('findCategoryId', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    initDb(db)
    seedCategories(db)
  })

  it('returns the matching category id for a slug', () => {
    const categories = getCategories(db)

    const categoryId = findCategoryId(categories, 'groceries')

    expect(categoryId).toBeDefined()
    expect(categories.some(category => category.id === categoryId)).toBe(true)
  })

  it('throws when the category slug is unknown', () => {
    const categories = getCategories(db)

    expect(() => findCategoryId(categories, 'missing')).toThrow('Unknown category slug: missing')
  })
})

describe('formatTransactionTable', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    initDb(db)
    seedCategories(db)
  })

  it('formats a boxed table with aligned columns', () => {
    insertTransaction(db, {
      date: '2026-01-15',
      amount: -42.5,
      counterparty: 'ACME Shop and Bakery',
      currency: 'EUR',
      categoryId: 'groceries-category-id',
      importedAt: new Date().toISOString(),
    })

    const lines = formatTransactionTable([
      {
        date: '2026-01-15',
        amount: -42.5,
        counterparty: 'ACME Shop and Bakery',
        hash: 'transaction-hash',
        currency: 'EUR',
        categoryId: 'groceries-category-id',
        importedAt: new Date().toISOString(),
      },
    ])

    expect(lines[0]).toMatch(/^╭/)
    expect(lines[1]).toContain('Date')
    expect(lines[2]).toMatch(/^├/)
    expect(lines[3]).toContain('2026-01-15')
    expect(lines[3]).toContain('-42.50')
    expect(lines[3]).toContain('ACME Shop and Bakery')
    expect(lines[3]).toContain('groceries-category-id')
    expect(lines[4]).toMatch(/^╰/)
  })
})

describe('buildSummaryLines', () => {
  it('includes uncategorized count when present', () => {
    expect(buildSummaryLines(3, 2)).toEqual(['3 transactions', '2 uncategorized'])
  })

  it('omits uncategorized count when zero', () => {
    expect(buildSummaryLines(3, 0)).toEqual(['3 transactions'])
  })
})