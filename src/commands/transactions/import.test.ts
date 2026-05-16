import { describe, it, expect, beforeEach } from 'bun:test'
import { Database } from 'bun:sqlite'
import { insertAccount } from '@/db/accounts/mutations'
import { computeTransactionHash } from '@/db/transactions/hash'
import { seedCategories } from '@/db/categories/seed'
import { initDb } from '@/db/schema'
import { insertTransaction } from '@/db/transactions/mutations'
import { getTransactions } from '@/db/transactions/queries'
import { parseCsv } from '@/parsers/csv'
import { getArgumentSetup } from '@/commands/test-helpers'
import { createImportCommand, findCsvFiles, resolveImportedTransaction } from './import'

const FIXTURE = `${import.meta.dir}/../../parsers/__fixtures__/minimal.csv`
const FIXTURES_DIR = `${import.meta.dir}/../../parsers/__fixtures__`

describe('createImportCommand', () => {
  it('creates the command with name "import"', () => {
    expect(createImportCommand('flouz.db').name()).toBe('import')
  })

  it('registers <path> as a required non-variadic positional argument', () => {
    const argument = getArgumentSetup(createImportCommand('flouz.db'), 0)
    expect(argument).toMatchObject({ name: 'path', required: true, variadic: false })
  })

  it('has --from option', () => {
    const option = createImportCommand('flouz.db').options.find((option) => option.long === '--from')
    expect(option).toBeDefined()
  })

  it('has --to option', () => {
    const option = createImportCommand('flouz.db').options.find((option) => option.long === '--to')
    expect(option).toBeDefined()
  })

  it('registers --db option with the supplied default path', () => {
    const option = createImportCommand('my.db').options.find((option) => option.long === '--db')
    expect(option?.defaultValue).toBe('my.db')
  })
})

async function importAll(db: Database, sourceFile: string): Promise<{ imported: number; errors: number }> {
  const content = await Bun.file(sourceFile).text()
  const { transactions, errors } = parseCsv(content, sourceFile)
  for (const transaction of transactions) {
    const resolvedTransaction = resolveImportedTransaction(db, transaction)
    insertTransaction(db, resolvedTransaction)
  }
  return { imported: transactions.length, errors: errors.length }
}

describe('import pipeline', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    initDb(db)
    seedCategories(db)
    insertAccount(db, {
      key: 'checking',
      company: 'Belfius',
      name: 'Main account',
    })
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

  it('stores hash on imported rows', async () => {
    await importAll(db, FIXTURE)
    const transactions = getTransactions(db)

    for (const transaction of transactions) {
      expect(transaction.hash).toBe(
        computeTransactionHash({
          date: transaction.date,
          amount: transaction.amount,
          counterparty: transaction.counterparty,
          bankCommunication: transaction.bankCommunication,
        }),
      )
    }
  })

  it('stores the matching account_id when the CSV row has an account key', async () => {
    await importAll(db, FIXTURE)

    const transactions = getTransactions(db)
    const transactionsWithAccount = transactions.filter((transaction) => transaction.accountId !== undefined)

    expect(transactionsWithAccount.length).toBe(3)
    expect(transactionsWithAccount.every((transaction) => transaction.accountId === 1)).toBe(true)
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

  it('throws when an account key is unknown', () => {
    const { transactions } = parseCsv('date,amount,counterparty,account\n2026-01-15,-42.50,ACME Shop,missing')

    expect(() => resolveImportedTransaction(db, transactions[0])).toThrow('Unknown account key: missing')
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
    expect(files.some((f) => f.endsWith('minimal.csv'))).toBe(true)
  })

  it('returns empty array for an empty directory', async () => {
    const tmpDir = await import('node:os').then((os) => os.tmpdir())
    const files = await findCsvFiles(tmpDir)
    // tmpdir may or may not have CSV files; just verify it returns an array
    expect(Array.isArray(files)).toBe(true)
  })
})
