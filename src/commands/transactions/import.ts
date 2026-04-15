import { Command } from 'commander'
import { intro, outro, progress, spinner, cancel, log } from '@clack/prompts'
import { type Database } from 'bun:sqlite'
import { resolve, extname, join, basename } from 'node:path'
import { stat, readdir } from 'node:fs/promises'
import { getAccountByKey } from '@/db/accounts/queries'
import { normalizeAccountKey } from '@/db/accounts/mutations'
import { openDatabase } from '@/db/schema'
import { insertTransaction } from '@/db/transactions/mutations'
import { parseCsv, type ParseError } from '@/parsers/csv'
import type { ImportedTransaction, NewTransaction } from '@/types'

interface ParsedFile {
  file: string
  transactions: ReturnType<typeof parseCsv>['transactions']
  errors: ParseError[]
}

interface InsertResult {
  totalImported: number
  allErrors: (ParseError & { file: string })[]
}

export function resolveImportedTransaction(
  db: Database,
  transaction: ImportedTransaction
): NewTransaction {
  const accountId = resolveAccountId(db, transaction.accountKey)
  return {
    date: transaction.date,
    amount: transaction.amount,
    counterparty: transaction.counterparty,
    counterpartyIban: transaction.counterpartyIban,
    currency: transaction.currency,
    accountId,
    categoryId: transaction.categoryId,
    note: transaction.note,
    sourceFile: transaction.sourceFile,
    importedAt: transaction.importedAt,
  }
}

export async function findCsvFiles(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true })
  return entries
    .filter(entry => entry.isFile() && extname(entry.name).toLowerCase() === '.csv')
    .map(entry => join(dirPath, entry.name))
}

async function resolveCsvFiles(path: string): Promise<string[] | null> {
  const info = await stat(path).catch(() => null)
  if (!info) return null
  if (info.isDirectory()) return await findCsvFiles(path)
  return [resolve(path)]
}

async function parseAllFiles(files: string[]): Promise<ParsedFile[]> {
  const label = files.length === 1 ? `Reading ${basename(files[0])}` : `Reading ${files.length} files`
  const fileSpinner = spinner()
  fileSpinner.start(label)
  const parsed: ParsedFile[] = []
  for (const file of files) {
    if (files.length > 1) fileSpinner.message(`Reading ${basename(file)}`)
    const content = await Bun.file(file).text()
    const { transactions, errors } = parseCsv(content, file)
    parsed.push({ file, transactions, errors })
  }
  const totalRows = parsed.reduce((sum, { transactions }) => sum + transactions.length, 0)
  const fileLabel = files.length === 1 ? basename(files[0]) : `${files.length} files`
  fileSpinner.stop(`Importing ${fileLabel} (${totalRows} rows)`)
  return parsed
}

async function insertAllTransactions(db: Database, parsed: ParsedFile[]): Promise<InsertResult> {
  const totalRows = parsed.reduce((sum, { transactions }) => sum + transactions.length, 0)
  const insertProgress = progress({ max: Math.max(1, totalRows), style: 'heavy' })
  insertProgress.start(`0 / ${totalRows}`)
  let totalImported = 0
  const allErrors: (ParseError & { file: string })[] = []
  try {
    for (const { file, transactions, errors } of parsed) {
      db.transaction(() => {
        for (const transaction of transactions) {
          const resolvedTransaction = resolveImportedTransaction(db, transaction)
          insertTransaction(db, resolvedTransaction)
        }
      })()
      totalImported += transactions.length
      insertProgress.advance(transactions.length, `${basename(file)} — ${totalImported} / ${totalRows}`)
      await Bun.sleep(0)
      allErrors.push(...errors.map(parseError => ({ ...parseError, file })))
    }
  } catch (error) {
    insertProgress.error('Failed')
    throw error
  }
  insertProgress.stop(`${totalImported} / ${totalRows}`)
  return { totalImported, allErrors }
}

function resolveAccountId(db: Database, accountKey: string | undefined): number | undefined {
  if (accountKey === undefined) return undefined

  const normalizedKey = normalizeAccountKey(accountKey)
  if (normalizedKey.length === 0) return undefined

  const account = getAccountByKey(db, normalizedKey)
  if (account !== undefined) return account.id

  throw new Error(
    `Unknown account key: ${normalizedKey}. Create it first with \`flouz accounts add\`.`
  )
}

function reportResults(totalImported: number, allErrors: (ParseError & { file: string })[]): void {
  for (const { file, row, message } of allErrors) {
    log.warn(`${file} line ${row}: ${message}`)
  }
  const errorSuffix = allErrors.length > 0 ? `, ${allErrors.length} invalid row(s) skipped` : ''
  outro(`✓ ${totalImported} imported${errorSuffix}`)
}

async function importAction(path: string, options: { db: string }): Promise<void> {
  intro('flouz transactions import')

  const files = await resolveCsvFiles(path)
  if (!files) {
    log.error(`Cannot access path: ${path}`)
    process.exit(1)
  }

  if (files.length === 0) {
    log.warn(`No CSV files found in: ${path}`)
    process.exit(0)
  }

  const dbPath = resolve(options.db)
  const isNew = !(await Bun.file(dbPath).exists())
  if (isNew) log.info(`Creating new database at ${dbPath}`)
  const database = openDatabase(dbPath)

  const onCancel = () => {
    database.close()
    cancel('Import cancelled.')
    process.exit(1)
  }
  process.once('SIGINT', onCancel)

  try {
    const parsed = await parseAllFiles(files)
    const { totalImported, allErrors } = await insertAllTransactions(database, parsed)
    process.removeListener('SIGINT', onCancel)
    database.close()
    reportResults(totalImported, allErrors)
  } catch (error) {
    process.removeListener('SIGINT', onCancel)
    log.error(error instanceof Error ? error.message : String(error))
    database.close()
    process.exit(1)
  }
}

export function createImportCommand(defaultDb: string): Command {
  return new Command('import')
    .description('Import transactions from a CSV file or directory of CSV files')
    .argument('<path>', 'path to CSV file or directory')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(importAction)
}
