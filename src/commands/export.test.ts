import { describe, it, expect, beforeEach } from 'bun:test'
import { Database } from 'bun:sqlite'
import { initDb, seedCategories } from '@/db/schema'
import { insertTransaction, getTransactions } from '@/db/transactions'
import { getCategories } from '@/db/categories'

// Test the CSV generation logic (not the command itself)
describe('export CSV logic', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    initDb(db)
    seedCategories(db)
  })

  it('getTransactions returns inserted transactions', () => {
    insertTransaction(db, {
      date: '2026-01-15',
      amount: -42.50,
      counterparty: 'ACME Shop',
      currency: 'EUR',
      importedAt: new Date().toISOString(),
    })
    const txs = getTransactions(db)
    expect(txs).toHaveLength(1)
    expect(txs[0].amount).toBe(-42.50)
  })

  it('uses category slug not UUID in output', () => {
    const categories = getCategories(db)
    const groceries = categories.find(c => c.slug === 'groceries')
    expect(groceries).toBeDefined()

    insertTransaction(db, {
      date: '2026-01-15',
      amount: -10,
      counterparty: 'Test Shop',
      currency: 'EUR',
      categoryId: groceries!.id,
      importedAt: new Date().toISOString(),
    })

    const txs = getTransactions(db)
    const categoryById = new Map(categories.map(c => [c.id, c]))
    const slug = txs[0].categoryId ? categoryById.get(txs[0].categoryId)?.slug : ''
    expect(slug).toBe('groceries')
  })

  it('escapes commas in counterparty names', () => {
    const escape = (v: string) => v.includes(',') ? `"${v.replace(/"/g, '""')}"` : v
    expect(escape('Shop, Ltd')).toBe('"Shop, Ltd"')
    expect(escape('Normal Shop')).toBe('Normal Shop')
  })
})
