import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { getCategories } from '@/db/categories/queries'
import { seedCategories } from '@/db/categories/seed'
import { initDb } from '@/db/schema'
import { insertTransaction } from '@/db/transactions/mutations'
import { buildCsv, escapeCsvField, loadExportRows } from '.'

describe('export pipeline', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    initDb(db)
    seedCategories(db)
  })

  it('loads export rows with category slugs', () => {
    const groceriesCategory = getCategories(db).find(category => category.slug === 'groceries')
    expect(groceriesCategory).toBeDefined()

    insertTransaction(db, {
      date: '2026-01-15',
      amount: -10,
      counterparty: 'Test Shop',
      currency: 'EUR',
      categoryId: groceriesCategory?.id,
      importedAt: new Date().toISOString(),
    })

    const rows = loadExportRows(db)

    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      date: '2026-01-15',
      amount: '-10.00',
      counterparty: 'Test Shop',
      category: 'groceries',
      note: '',
    })
  })

  it('builds CSV with escaped values', () => {
    insertTransaction(db, {
      date: '2026-01-15',
      amount: -42.5,
      counterparty: 'Shop, "Ltd"',
      currency: 'EUR',
      note: 'Monthly, refill',
      importedAt: new Date().toISOString(),
    })

    const csv = buildCsv(loadExportRows(db))

    expect(csv).toBe([
      'date,amount,counterparty,category,note',
      '2026-01-15,-42.50,"Shop, ""Ltd""",,"Monthly, refill"',
    ].join('\n'))
  })

  it('returns the header when there are no transactions', () => {
    expect(buildCsv([])).toBe('date,amount,counterparty,category,note')
  })
})

describe('escapeCsvField', () => {
  it('quotes fields containing commas, quotes, or newlines', () => {
    expect(escapeCsvField('Shop, Ltd')).toBe('"Shop, Ltd"')
    expect(escapeCsvField('Shop "Ltd"')).toBe('"Shop ""Ltd"""')
    expect(escapeCsvField('Line 1\nLine 2')).toBe('"Line 1\nLine 2"')
  })

  it('leaves plain values unchanged', () => {
    expect(escapeCsvField('Normal Shop')).toBe('Normal Shop')
  })
})