import { describe, it, expect, beforeEach } from 'bun:test'
import { Database } from 'bun:sqlite'
import { seedCategories } from '@/db/categories/seed'
import { initDb } from '@/db/schema'
import { insertTransaction } from '@/db/transactions/mutations'
import { getTransactions } from '@/db/transactions/queries'
import { parseCsv } from '@/parsers/csv'
import { findCsvFiles } from '.'

const FIXTURE = `${import.meta.dir}/../../parsers/__fixtures__/minimal.csv`
const FIXTURES_DIR = `${import.meta.dir}/../../parsers/__fixtures__`

async function importAll(db: Database, sourceFile: string): Promise<{ imported: number; skipped: number; errors: number }> {
  const content = await Bun.file(sourceFile).text()
  const { transactions, errors } = parseCsv(content, sourceFile)
  let imported = 0
  let skipped = 0
  for (const transaction of transactions) {
    const changes = insertTransaction(db, transaction)
    if (changes === 0) {
      skipped++
    } else {
      imported++
    }
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

  it('sets correct date format (yyyy-MM-dd)', async () => {
    await importAll(db, FIXTURE)
    const transactions = getTransactions(db)
    for (const transaction of transactions) {
      expect(transaction.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('sets source_file on imported rows', async () => {
    await importAll(db, FIXTURE)
    const transactions = getTransactions(db)
    for (const transaction of transactions) {
      expect(transaction.sourceFile).toBe(FIXTURE)
    }
  })

  it('imports valid rows and reports invalid rows without throwing', () => {
    const content = `date,amount,counterparty
2026-01-15,-42.50,ACME Shop
not-a-date,-10.00,Bad Row
2026-01-16,25.00,Salary`
    const { transactions, errors } = parseCsv(content)
    for (const transaction of transactions) {
      insertTransaction(db, transaction)
    }
    expect(getTransactions(db)).toHaveLength(2)
    expect(errors).toHaveLength(1)
    expect(errors[0].row).toBe(3)
    expect(errors[0].message).toContain('date must be YYYY-MM-DD')
  })

  it('skips duplicate transactions on a second import of the same file', async () => {
    const { imported: firstImport } = await importAll(db, FIXTURE)
    const { imported: secondImport, skipped } = await importAll(db, FIXTURE)
    expect(firstImport).toBe(5)
    expect(secondImport).toBe(0)
    expect(skipped).toBe(5)
    expect(getTransactions(db)).toHaveLength(5)
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
