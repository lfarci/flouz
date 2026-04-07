import { Command } from 'commander'
import { intro, outro, progress, spinner, cancel, log } from '@clack/prompts'
import { Database } from 'bun:sqlite'
import { resolve, extname, join, basename } from 'node:path'
import { stat, readdir } from 'node:fs/promises'
import { openDatabase } from '@/db/schema'
import { insertTransaction } from '@/db/transactions/mutations'
import { parseCsv, type ParseError } from '@/parsers/csv'
import { resolveDbPath } from '@/config'

type ParsedFile = {
  file: string
  transactions: ReturnType<typeof parseCsv>['transactions']
  errors: ParseError[]
}

type InsertResult = {
  totalImported: number
  allErrors: Array<ParseError & { file: string }>
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
  if (info.isDirectory()) return findCsvFiles(path)
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
  const allErrors: Array<ParseError & { file: string }> = []
  try {
    for (const { file, transactions, errors } of parsed) {
      db.transaction(() => {
        for (const transaction of transactions) {
          insertTransaction(db, transaction)
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

function reportResults(totalImported: number, allErrors: Array<ParseError & { file: string }>): void {
  for (const { file, row, message } of allErrors) {
    log.warn(`${file} line ${row}: ${message}`)
  }
  const errorSuffix = allErrors.length > 0 ? `, ${allErrors.length} invalid row(s) skipped` : ''
  outro(`✓ ${totalImported} imported${errorSuffix}`)
}

async function importAction(path: string, options: { db: string }): Promise<void> {
  intro('flouz import')

  let database: Database | undefined
  const onCancel = () => {
    database?.close()
    cancel('Import cancelled.')
    process.exit(1)
  }
  process.once('SIGINT', onCancel)

  const files = await resolveCsvFiles(path)
  if (!files) {
    process.removeListener('SIGINT', onCancel)
    log.error(`Cannot access path: ${path}`)
    process.exit(1)
  }

  if (files.length === 0) {
    process.removeListener('SIGINT', onCancel)
    log.warn(`No CSV files found in: ${path}`)
    process.exit(0)
  }

  const dbPath = resolve(options.db)
  const isNew = !(await Bun.file(dbPath).exists())
  if (isNew) log.info(`Creating new database at ${dbPath}`)
  database = openDatabase(dbPath)

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

export async function createImportCommand(): Promise<Command> {
  const defaultDb = await resolveDbPath()
  return new Command('import')
    .description('Import transactions from a CSV file or directory of CSV files')
    .argument('<path>', 'path to CSV file or directory')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(importAction)
}
