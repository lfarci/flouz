import { Command } from 'commander'
import { intro, outro, spinner, cancel, log } from '@clack/prompts'
import { Database } from 'bun:sqlite'
import { basename, resolve } from 'node:path'
import { resolveDbPath } from '@/config'
import { getCategories } from '@/db/categories/queries'
import { openDatabase } from '@/db/schema'
import { getTransactions } from '@/db/transactions/queries'
import type { Transaction } from '@/types'

type ExportOptions = {
  db: string
  output?: string
}

type ExportRow = {
  date: string
  amount: string
  counterparty: string
  category: string
  note: string
}

async function ensureDatabaseExists(dbPath: string): Promise<void> {
  if (await Bun.file(dbPath).exists()) return
  throw new Error(
    `No database found at ${dbPath}. Run \`flouz import\` first or check your configuration with \`flouz config get\`.`
  )
}

function createCategorySlugById(db: Database): Map<string, string> {
  const categories = getCategories(db)
  return new Map(categories.map(category => [category.id, category.slug]))
}

export function loadExportRows(db: Database): ExportRow[] {
  const categorySlugById = createCategorySlugById(db)
  return getTransactions(db).map(transaction => toExportRow(transaction, categorySlugById))
}

function toExportRow(transaction: Transaction, categorySlugById: Map<string, string>): ExportRow {
  return {
    date: transaction.date,
    amount: transaction.amount.toFixed(2),
    counterparty: transaction.counterparty,
    category: resolveCategorySlug(transaction.categoryId, categorySlugById),
    note: transaction.note ?? '',
  }
}

function resolveCategorySlug(categoryId: string | undefined, categorySlugById: Map<string, string>): string {
  if (categoryId === undefined) return ''
  return categorySlugById.get(categoryId) ?? ''
}

export function buildCsv(rows: ExportRow[]): string {
  const header = 'date,amount,counterparty,category,note'
  const dataRows = rows.map(buildCsvRow)
  return [header, ...dataRows].join('\n')
}

function buildCsvRow(row: ExportRow): string {
  return [row.date, row.amount, row.counterparty, row.category, row.note].map(escapeCsvField).join(',')
}

export function escapeCsvField(value: string): string {
  if (!/[",\n]/.test(value)) return value
  return `"${value.replaceAll('"', '""')}"`
}

function loadRowsWithProgress(db: Database, shouldReportProgress: boolean): ExportRow[] {
  if (!shouldReportProgress) return loadExportRows(db)
  const exportSpinner = spinner()
  exportSpinner.start('Loading transactions')
  const rows = loadExportRows(db)
  exportSpinner.stop(`Loaded ${rows.length} transactions`)
  return rows
}

async function writeCsvOutput(csv: string, outputPath: string | undefined): Promise<string | undefined> {
  if (outputPath === undefined) {
    process.stdout.write(`${csv}\n`)
    return undefined
  }

  const resolvedOutputPath = resolve(outputPath)
  const writeSpinner = spinner()
  writeSpinner.start(`Writing ${basename(resolvedOutputPath)}`)
  await Bun.write(resolvedOutputPath, `${csv}\n`)
  writeSpinner.stop(`Wrote ${basename(resolvedOutputPath)}`)
  return resolvedOutputPath
}

function reportResults(exportedCount: number, outputPath: string | undefined): void {
  if (outputPath === undefined) return
  outro(`Exported ${exportedCount} transactions to ${outputPath}`)
}

async function exportAction(options: ExportOptions): Promise<void> {
  const shouldReportProgress = options.output !== undefined
  if (shouldReportProgress) intro('flouz export')

  let database: Database | undefined
  const onCancel = () => {
    database?.close()
    cancel('Export cancelled.')
    process.exit(1)
  }
  process.once('SIGINT', onCancel)

  try {
    const dbPath = resolve(options.db)
    await ensureDatabaseExists(dbPath)
    database = openDatabase(dbPath)
    const rows = loadRowsWithProgress(database, shouldReportProgress)
    const csv = buildCsv(rows)
    const outputPath = await writeCsvOutput(csv, options.output)
    reportResults(rows.length, outputPath)
    database.close()
    process.removeListener('SIGINT', onCancel)
  } catch (error) {
    process.removeListener('SIGINT', onCancel)
    database?.close()
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

export async function createExportCommand(): Promise<Command> {
  const defaultDb = await resolveDbPath()
  return new Command('export')
    .description('Export transactions to CSV')
    .option('-o, --output <file>', 'output file path (default: stdout)')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(exportAction)
}