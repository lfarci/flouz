import { describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { createCategoriesTable } from '@/db/categories/schema'
import { createTransactionsTable } from './schema'

function insertRawTransaction(db: Database, values: { date: string; amount: number; counterparty: string }): void {
  db.prepare(`
    INSERT INTO transactions (date, amount, counterparty, currency, imported_at)
    VALUES (?, ?, ?, 'EUR', '2026-02-01T10:00:00.000Z')
  `).run(values.date, values.amount, values.counterparty)
}

describe('createTransactionsTable', () => {
  it('creates transactions table', () => {
    const db = new Database(':memory:')
    createCategoriesTable(db)

    createTransactionsTable(db)

    const row = db.query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'"
    ).get()
    expect(row?.name).toBe('transactions')
  })

  it('is idempotent', () => {
    const db = new Database(':memory:')
    createCategoriesTable(db)

    expect(() => {
      createTransactionsTable(db)
      createTransactionsTable(db)
    }).not.toThrow()
  })

  it('enforces uniqueness on date amount and counterparty', () => {
    const db = new Database(':memory:')
    createCategoriesTable(db)
    createTransactionsTable(db)

    insertRawTransaction(db, { date: '2026-02-01', amount: -18.45, counterparty: 'City Market' })

    expect(() => {
      insertRawTransaction(db, { date: '2026-02-01', amount: -18.45, counterparty: 'City Market' })
    }).toThrow(/UNIQUE constraint failed/)
  })

  it('allows rows when one part of the duplicate detection key differs', () => {
    const db = new Database(':memory:')
    createCategoriesTable(db)
    createTransactionsTable(db)

    insertRawTransaction(db, { date: '2026-02-01', amount: -18.45, counterparty: 'City Market' })

    expect(() => {
      insertRawTransaction(db, { date: '2026-02-02', amount: -18.45, counterparty: 'City Market' })
      insertRawTransaction(db, { date: '2026-02-01', amount: -18.46, counterparty: 'City Market' })
      insertRawTransaction(db, { date: '2026-02-01', amount: -18.45, counterparty: 'City Market Annex' })
    }).not.toThrow()
  })
})