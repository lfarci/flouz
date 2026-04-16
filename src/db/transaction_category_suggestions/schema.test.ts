import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { initDb } from '@/db/schema'
import { seedCategories } from '@/db/categories/seed'
import { insertTransaction } from '@/db/transactions/mutations'
import type { NewTransaction } from '@/types'

const VALID_CATEGORY_ID = '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f'
const NONEXISTENT_CATEGORY_ID = 'aaaaaaaa-0000-0000-0000-000000000000'

const baseTransaction: NewTransaction = {
  date: '2026-01-15',
  amount: -10,
  counterparty: 'ACME Shop',
  currency: 'EUR',
  importedAt: new Date().toISOString(),
}

function insertSuggestion(
  db: Database,
  transactionId: number,
  categoryId: string,
  confidence: number
): void {
  db.prepare(`
    INSERT INTO transaction_category_suggestions
      (transaction_id, category_id, confidence, model, suggested_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(transactionId, categoryId, confidence, 'test-model', new Date().toISOString())
}

let db: Database

beforeEach(() => {
  db = new Database(':memory:')
  initDb(db)
  seedCategories(db)
})

describe('transaction_category_suggestions table creation', () => {
  it('creates the table after initDb', () => {
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transaction_category_suggestions'"
    ).get() as { name: string } | null

    expect(row).not.toBeNull()
    expect(row?.name).toBe('transaction_category_suggestions')
  })
})

describe('transaction_category_suggestions lifecycle columns', () => {
  it('defaults status to pending on insert', () => {
    insertTransaction(db, baseTransaction)
    const { id } = db.prepare('SELECT id FROM transactions LIMIT 1').get() as { id: number }
    insertSuggestion(db, id, VALID_CATEGORY_ID, 0.5)

    const row = db.prepare(
      'SELECT status, reviewed_at, applied_at FROM transaction_category_suggestions WHERE transaction_id = ?'
    ).get(id) as { status: string; reviewed_at: string | null; applied_at: string | null } | null

    expect(row).not.toBeNull()
    expect(row?.status).toBe('pending')
    expect(row?.reviewed_at).toBeNull()
    expect(row?.applied_at).toBeNull()
  })

  it('rejects an invalid status value', () => {
    insertTransaction(db, baseTransaction)
    const { id } = db.prepare('SELECT id FROM transactions LIMIT 1').get() as { id: number }
    insertSuggestion(db, id, VALID_CATEGORY_ID, 0.5)

    expect(() =>
      db.prepare(
        "UPDATE transaction_category_suggestions SET status = 'invalid' WHERE transaction_id = ?"
      ).run(id)
    ).toThrow()
  })

  it('allows all valid status values', () => {
    for (const status of ['pending', 'approved', 'applied'] as const) {
      insertTransaction(db, { ...baseTransaction, counterparty: `Shop ${status}` })
      const { id } = db.prepare('SELECT id FROM transactions ORDER BY id DESC LIMIT 1').get() as { id: number }
      insertSuggestion(db, id, VALID_CATEGORY_ID, 0.5)

      expect(() =>
        db.prepare(
          'UPDATE transaction_category_suggestions SET status = ? WHERE transaction_id = ?'
        ).run(status, id)
      ).not.toThrow()
    }
  })
})

describe('transaction_category_suggestions foreign key constraints', () => {
  it('throws when transaction_id does not reference an existing transaction', () => {
    expect(() => insertSuggestion(db, 99999, VALID_CATEGORY_ID, 0.5)).toThrow()
  })

  it('throws when category_id does not reference an existing category', () => {
    insertTransaction(db, baseTransaction)
    const row = db.prepare('SELECT id FROM transactions LIMIT 1').get() as { id: number }

    expect(() => insertSuggestion(db, row.id, NONEXISTENT_CATEGORY_ID, 0.5)).toThrow()
  })
})

describe('transaction_category_suggestions CHECK constraint on confidence', () => {
  it('throws when confidence is above 1', () => {
    insertTransaction(db, baseTransaction)
    const row = db.prepare('SELECT id FROM transactions LIMIT 1').get() as { id: number }

    expect(() => insertSuggestion(db, row.id, VALID_CATEGORY_ID, 1.5)).toThrow()
  })

  it('throws when confidence is below 0', () => {
    insertTransaction(db, baseTransaction)
    const row = db.prepare('SELECT id FROM transactions LIMIT 1').get() as { id: number }

    expect(() => insertSuggestion(db, row.id, VALID_CATEGORY_ID, -0.1)).toThrow()
  })
})

describe('transaction_category_suggestions valid insert', () => {
  it('inserts a row successfully when confidence is 0.5', () => {
    insertTransaction(db, baseTransaction)
    const row = db.prepare('SELECT id FROM transactions LIMIT 1').get() as { id: number }

    expect(() => insertSuggestion(db, row.id, VALID_CATEGORY_ID, 0.5)).not.toThrow()

    const inserted = db.prepare(
      'SELECT * FROM transaction_category_suggestions WHERE transaction_id = ?'
    ).get(row.id) as { confidence: number } | null

    expect(inserted).not.toBeNull()
    expect(inserted?.confidence).toBe(0.5)
  })
})
