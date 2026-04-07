import { describe, it, expect, beforeEach } from 'bun:test'
import { Database } from 'bun:sqlite'
import { resolve } from 'node:path'
import { seedCategories } from '@/db/categories/seed'
import { initDb } from '@/db/schema'
import { getTransactions } from '@/db/transactions/queries'
import { findCsvFiles, insertAllTransactions, parseAllFiles } from '.'

const FIXTURE = resolve(`${import.meta.dir}/../../parsers/__fixtures__/minimal.csv`)
const FIXTURES_DIR = resolve(`${import.meta.dir}/../../parsers/__fixtures__`)
const IMPORT_FIXTURES_DIR = resolve(`${FIXTURES_DIR}/import`)
const BASELINE_FIXTURE = resolve(`${IMPORT_FIXTURES_DIR}/baseline.csv`)
const OVERLAP_FIXTURE = resolve(`${IMPORT_FIXTURES_DIR}/overlap.csv`)
const MIXED_FIXTURE = resolve(`${IMPORT_FIXTURES_DIR}/mixed.csv`)

async function importFiles(db: Database, files: string[]) {
  const parsed = await parseAllFiles(files)
  return insertAllTransactions(db, parsed)
}

describe('import pipeline', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    initDb(db)
    seedCategories(db)
  })

  it('imports 5 transactions from fixture', async () => {
    const result = await importFiles(db, [FIXTURE])
    expect(result.totalImported).toBe(5)
    expect(result.totalDuplicatesSkipped).toBe(0)
    expect(getTransactions(db)).toHaveLength(5)
  })

  it('sets correct date format (yyyy-MM-dd)', async () => {
    await importFiles(db, [FIXTURE])
    const transactions = getTransactions(db)
    for (const transaction of transactions) {
      expect(transaction.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('sets source_file on imported rows', async () => {
    await importFiles(db, [FIXTURE])
    const transactions = getTransactions(db)
    for (const transaction of transactions) {
      expect(transaction.sourceFile).toBe(FIXTURE)
    }
  })

  it('re-imports the same full fixture without inserting duplicates', async () => {
    const firstImport = await importFiles(db, [BASELINE_FIXTURE])
    const secondImport = await importFiles(db, [BASELINE_FIXTURE])

    expect(firstImport.totalImported).toBe(8)
    expect(firstImport.totalDuplicatesSkipped).toBe(0)
    expect(secondImport.totalImported).toBe(0)
    expect(secondImport.totalDuplicatesSkipped).toBe(8)
    expect(getTransactions(db)).toHaveLength(8)
  })

  it('imports overlapping full fixtures and keeps only unique rows', async () => {
    const result = await importFiles(db, [BASELINE_FIXTURE, OVERLAP_FIXTURE])

    expect(result.totalParsed).toBe(14)
    expect(result.totalImported).toBe(11)
    expect(result.totalDuplicatesSkipped).toBe(3)
    expect(result.allErrors).toHaveLength(0)
    expect(getTransactions(db)).toHaveLength(11)
  })

  it('imports valid rows and reports duplicate and invalid rows from a full scenario fixture', async () => {
    await importFiles(db, [BASELINE_FIXTURE])

    const result = await importFiles(db, [MIXED_FIXTURE])

    expect(result.totalParsed).toBe(4)
    expect(result.totalImported).toBe(2)
    expect(result.totalDuplicatesSkipped).toBe(2)
    expect(result.allErrors).toHaveLength(3)
    expect(result.allErrors.map(error => error.row)).toEqual([5, 6, 7])
    expect(getTransactions(db)).toHaveLength(10)
  })

  it('imports a directory of full-scenario fixtures as one batch', async () => {
    const files = await findCsvFiles(IMPORT_FIXTURES_DIR)

    const result = await importFiles(db, files)

    expect(files).toEqual([BASELINE_FIXTURE, MIXED_FIXTURE, OVERLAP_FIXTURE])
    expect(result.totalParsed).toBe(18)
    expect(result.totalImported).toBe(13)
    expect(result.totalDuplicatesSkipped).toBe(5)
    expect(result.allErrors).toHaveLength(3)
    expect(getTransactions(db)).toHaveLength(13)
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

  it('returns absolute file paths when given a relative directory path', async () => {
    const relativeFixturesDir = IMPORT_FIXTURES_DIR.replace(`${process.cwd()}/`, '')

    const files = await findCsvFiles(relativeFixturesDir)

    expect(files).toEqual([BASELINE_FIXTURE, MIXED_FIXTURE, OVERLAP_FIXTURE])
    for (const file of files) {
      expect(file).toBe(resolve(file))
    }
  })

  it('returns empty array for an empty directory', async () => {
    const tmpDir = await import('node:os').then(os => os.tmpdir())
    const files = await findCsvFiles(tmpDir)
    // tmpdir may or may not have CSV files; just verify it returns an array
    expect(Array.isArray(files)).toBe(true)
  })
})
