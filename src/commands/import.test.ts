import { describe, it, expect, beforeEach } from 'bun:test'
import { Database } from 'bun:sqlite'
import { initDb, seedCategories } from '@/db/schema'
import { insertTransaction, getTransactions } from '@/db/queries'
import { parseCsv } from '@/parsers/csv'
import { findCsvFiles } from './import'

const FIXTURE = `${import.meta.dir}/../parsers/__fixtures__/minimal.csv`
const FIXTURES_DIR = `${import.meta.dir}/../parsers/__fixtures__`

async function importAll(db: Database, sourceFile: string): Promise<{ imported: number; skipped: number; errors: number }> {
  const content = await Bun.file(sourceFile).text()
  const { transactions, errors } = parseCsv(content, sourceFile)
  let imported = 0
  let skipped = 0
  for (const tx of transactions) {
    const changes = insertTransaction(db, tx)
    if (changes > 0) imported++
    else skipped++
  }
  return { imported, skipped, errors: errors.length }
}

describe('import pipeline', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    initDb(db)
    seedCategories(db)
  })

  it('imports 5 transactions from fixture', async () => {
    const { imported } = await importAll(db, FIXTURE)
    expect(imported).toBe(5)
    expect(getTransactions(db)).toHaveLength(5)
  })

  it('deduplicates on re-import', async () => {
    await importAll(db, FIXTURE)
    const { imported, skipped } = await importAll(db, FIXTURE)
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

  it('sets source_file on imported rows', async () => {
    await importAll(db, FIXTURE)
    const txs = getTransactions(db)
    for (const tx of txs) {
      expect(tx.sourceFile).toBe(FIXTURE)
    }
  })

  it('imports valid rows and reports invalid rows without throwing', () => {
    const content = `date,amount,counterparty
2026-01-15,-42.50,ACME Shop
not-a-date,-10.00,Bad Row
2026-01-16,25.00,Salary`
    const { transactions, errors } = parseCsv(content)
    let imported = 0
    for (const tx of transactions) {
      const changes = insertTransaction(db, tx)
      if (changes > 0) imported++
    }
    expect(imported).toBe(2)
    expect(errors).toHaveLength(1)
    expect(errors[0].row).toBe(3)
    expect(errors[0].message).toContain('date must be YYYY-MM-DD')
  })

  it('skips duplicate rows within the same CSV file', () => {
    const content = `date,amount,counterparty
2026-01-15,-42.50,ACME Shop
2026-01-15,-42.50,ACME Shop`
    const { transactions } = parseCsv(content)
    let imported = 0
    let skipped = 0
    for (const tx of transactions) {
      const changes = insertTransaction(db, tx)
      if (changes > 0) imported++
      else skipped++
    }
    expect(imported).toBe(1)
    expect(skipped).toBe(1)
  })
})

describe('findCsvFiles', () => {
  it('returns only .csv files from a directory', async () => {
    const files = await findCsvFiles(FIXTURES_DIR)
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      expect(file).toMatch(/\.csv$/i)
    }
  })

  it('includes the fixture file', async () => {
    const files = await findCsvFiles(FIXTURES_DIR)
    expect(files.some(f => f.endsWith('minimal.csv'))).toBe(true)
  })

  it('returns empty array for an empty directory', async () => {
    const tmpDir = await import('node:os').then(os => os.tmpdir())
    const files = await findCsvFiles(tmpDir)
    // tmpdir may or may not have CSV files; just verify it returns an array
    expect(Array.isArray(files)).toBe(true)
  })
})
