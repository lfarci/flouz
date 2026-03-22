import { describe, it, expect, beforeEach } from 'bun:test'
import { Database } from 'bun:sqlite'
import { join } from 'path'
import { readFileSync } from 'fs'
import { initDb, seedCategories } from '@/db/schema'
import { insertTransaction, getTransactions } from '@/db/queries'
import { parseBankCsv } from '@/parsers/bank'

const FIXTURE = join(import.meta.dir, '../parsers/__fixtures__/minimal.bank.csv')

function importAll(db: Database, sourceFile: string): { imported: number; skipped: number } {
  const content = readFileSync(sourceFile, 'latin1')
  const transactions = parseBankCsv(content, sourceFile)
  let imported = 0
  let skipped = 0
  for (const tx of transactions) {
    const changes = insertTransaction(db, tx)
    if (changes > 0) imported++
    else skipped++
  }
  return { imported, skipped }
}

describe('import pipeline', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    initDb(db)
    seedCategories(db)
  })

  it('imports 5 transactions from fixture', () => {
    const { imported } = importAll(db, FIXTURE)
    expect(imported).toBe(5)
    expect(getTransactions(db)).toHaveLength(5)
  })

  it('deduplicates on re-import', () => {
    importAll(db, FIXTURE)
    const { imported, skipped } = importAll(db, FIXTURE)
    expect(imported).toBe(0)
    expect(skipped).toBe(5)
  })

  it('sets correct date format (yyyy-MM-dd)', () => {
    importAll(db, FIXTURE)
    const txs = getTransactions(db)
    for (const tx of txs) {
      expect(tx.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('cleans counterparty prefixes', () => {
    importAll(db, FIXTURE)
    const txs = getTransactions(db)
    // Row 5: "PAIEMENT DEBITMASTERCARD VIA Apple Pay Coffee Place" → "Coffee Place"
    const coffeeRow = txs.find(t => t.counterparty === 'Coffee Place')
    expect(coffeeRow).toBeDefined()
  })

  it('sets source_file on imported rows', () => {
    importAll(db, FIXTURE)
    const txs = getTransactions(db)
    for (const tx of txs) {
      expect(tx.sourceFile).toBe(FIXTURE)
    }
  })
})
