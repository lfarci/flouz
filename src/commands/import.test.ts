import { describe, it, expect, beforeEach } from 'bun:test'
import { Database } from 'bun:sqlite'
import { initDb, seedCategories } from '@/db/schema'
import { insertTransaction, getTransactions } from '@/db/queries'
import { parseBankCsv } from '@/parsers/bank'

const FIXTURE = `${import.meta.dir}/../parsers/__fixtures__/minimal.bank.csv`

async function importAll(db: Database, sourceFile: string): Promise<{ imported: number; skipped: number }> {
  const content = await Bun.file(sourceFile).text()
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

  it('imports 5 transactions from fixture', async () => {
    const { imported } = await await importAll(db, FIXTURE)
    expect(imported).toBe(5)
    expect(getTransactions(db)).toHaveLength(5)
  })

  it('deduplicates on re-import', async () => {
    await importAll(db, FIXTURE)
    const { imported, skipped } = await await importAll(db, FIXTURE)
    expect(imported).toBe(0)
    expect(skipped).toBe(5)
  })

  it('sets correct date format (yyyy-MM-dd)', async () => {
    await importAll(db, FIXTURE)
    const txs = getTransactions(db)
    for (const tx of txs) {
      expect(tx.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('cleans counterparty prefixes', async () => {
    await importAll(db, FIXTURE)
    const txs = getTransactions(db)
    // Row 5: "PAIEMENT DEBITMASTERCARD VIA Apple Pay Coffee Place" → "Coffee Place"
    const coffeeRow = txs.find(t => t.counterparty === 'Coffee Place')
    expect(coffeeRow).toBeDefined()
  })

  it('sets source_file on imported rows', async () => {
    await importAll(db, FIXTURE)
    const txs = getTransactions(db)
    for (const tx of txs) {
      expect(tx.sourceFile).toBe(FIXTURE)
    }
  })
})
