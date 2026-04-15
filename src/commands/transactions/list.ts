import { cancel, log } from '@clack/prompts'
import { type Database } from 'bun:sqlite'
import { Command } from 'commander'
import { isBrokenPipeError, writeStdout } from '@/cli/stdout'
import { resolve } from 'node:path'
import { renderCliTable } from '@/cli/table'
import { getCategories } from '@/db/categories/queries'
import { openDatabase } from '@/db/schema'
import { getTransactions } from '@/db/transactions/queries'
import type { Category, Transaction, TransactionFilters } from '@/types'

type OutputFormat = 'table' | 'csv' | 'json'

interface ListOptions {
  from?: string
  to?: string
  category?: string
  search?: string
  limit?: string
  output: OutputFormat
  db: string
  uncategorized?: boolean
}

interface ListData {
  transactions: Transaction[]
}

interface ListRow {
  date: string
  amount: string
  counterparty: string
  note: string
  category: string
}

async function ensureDatabaseExists(dbPath: string): Promise<void> {
  if (await Bun.file(dbPath).exists()) return
  throw new Error(
    `No database found at ${dbPath}. Run \`flouz transactions import\` first or check your configuration with \`flouz config get\`.`
  )
}

function resolveCategoryId(db: Database, categorySlug: string | undefined): string | undefined {
  if (categorySlug === undefined) return undefined

  const categories = getCategories(db)
  return findCategoryId(categories, categorySlug)
}

export function findCategoryId(categories: Category[], categorySlug: string): string {
  const category = categories.find(candidate => candidate.slug === categorySlug)
  if (category !== undefined) return category.id
  throw new Error(`Unknown category slug: ${categorySlug}`)
}

function toTransactionFilters(options: ListOptions, categoryId: string | undefined): TransactionFilters {
  return {
    from: options.from,
    to: options.to,
    categoryId,
    search: options.search,
    limit: parseLimit(options.limit),
    uncategorized: options.uncategorized,
  }
}

function parseLimit(limit: string | undefined): number | undefined {
  if (limit === undefined) return undefined

  const parsedLimit = Number.parseInt(limit, 10)
  if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
    throw new Error(`Invalid limit: ${limit}. Use a positive integer.`)
  }

  return parsedLimit
}

function loadListData(db: Database, options: ListOptions): ListData {
  const categoryId = resolveCategoryId(db, options.category)
  const filters = toTransactionFilters(options, categoryId)
  return {
    transactions: getTransactions(db, filters),
  }
}

function createCategorySlugById(db: Database): Map<string, string> {
  const categories = getCategories(db)
  return new Map(categories.map(category => [category.id, category.slug]))
}

function toListRows(transactions: Transaction[], categorySlugById: Map<string, string>): ListRow[] {
  return transactions.map(transaction => ({
    date: transaction.date,
    amount: formatAmount(transaction.amount),
    counterparty: transaction.counterparty,
    note: transaction.note ?? '',
    category: resolveCategorySlug(transaction.categoryId, categorySlugById),
  }))
}

function resolveCategorySlug(
  categoryId: string | undefined,
  categorySlugById: Map<string, string>
): string {
  if (categoryId === undefined) return '—'
  return categorySlugById.get(categoryId) ?? categoryId
}

export function formatTransactionTable(rows: ListRow[]): string[] {
  return renderCliTable({
    columns: [
      { header: 'Date', width: 10, minWidth: 10, truncate: 10 },
      { header: 'Amount', width: 12, minWidth: 10, alignment: 'right', truncate: 12 },
      { header: 'Counterparty', width: 30, minWidth: 16, wrapWord: true },
      { header: 'Note', width: 30, minWidth: 14, wrapWord: true },
      { header: 'Category', width: 18, minWidth: 10, wrapWord: true },
    ],
    rows: rows.map(row => [row.date, row.amount, row.counterparty, row.note, row.category]),
  })
}

function formatAmount(amount: number): string {
  const sign = amount >= 0 ? '+' : ''
  return `${sign}${amount.toFixed(2)}`
}

export function parseOutputFormat(value: string): OutputFormat {
  if (value === 'table' || value === 'csv' || value === 'json') return value
  throw new Error(`Invalid output format: ${value}. Use table, csv, or json.`)
}

export function buildCsv(rows: ListRow[]): string {
  const header = 'date,amount,counterparty,note,category'
  const dataRows = rows.map(row =>
    [row.date, row.amount, row.counterparty, row.note, row.category].map(escapeCsvField).join(',')
  )
  return [header, ...dataRows].join('\n')
}

export function escapeCsvField(value: string): string {
  if (!/[",\n]/.test(value)) return value
  return `"${value.replaceAll('"', '""')}"`
}

export function buildJson(rows: ListRow[]): string {
  return JSON.stringify(rows, undefined, 2)
}

function buildOutput(rows: ListRow[], outputFormat: OutputFormat): string {
  if (outputFormat === 'csv') return buildCsv(rows)
  if (outputFormat === 'json') return buildJson(rows)
  return formatTransactionTable(rows).join('\n')
}

async function writeOutput(output: string): Promise<void> {
  await writeStdout(`${output}\n`)
}

async function listAction(options: ListOptions): Promise<void> {
  if (options.category && options.uncategorized) {
    log.error('Cannot use --category and --uncategorized together')
    process.exit(1)
  }

  let database: Database | undefined
  const onCancel = () => {
    database?.close()
    cancel('List cancelled.')
    process.exit(1)
  }
  process.once('SIGINT', onCancel)

  try {
    const dbPath = resolve(options.db)
    await ensureDatabaseExists(dbPath)
    database = openDatabase(dbPath)
    const data = loadListData(database, options)
    const categorySlugById = createCategorySlugById(database)
    const rows = toListRows(data.transactions, categorySlugById)
    database.close()
    process.removeListener('SIGINT', onCancel)
    if (rows.length === 0 && options.output === 'table') {
      log.info('No transactions found.')
      return
    }

    await writeOutput(buildOutput(rows, options.output))
  } catch (error) {
    process.removeListener('SIGINT', onCancel)
    database?.close()
    if (isBrokenPipeError(error)) {
      process.exit(0)
    }

    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

export function createListCommand(defaultDb: string): Command {
  return new Command('list')
    .description('List transactions')
    .option('-f, --from <date>', 'filter from date (yyyy-MM-dd)')
    .option('-t, --to <date>', 'filter to date (yyyy-MM-dd)')
    .option('-c, --category <slug>', 'filter by category slug')
    .option('-s, --search <text>', 'search counterparty')
    .option('-l, --limit <n>', 'max results')
    .option('--uncategorized', 'show only transactions without a manual category')
    .option('-o, --output <format>', 'output format (table, csv, json)', parseOutputFormat, 'table')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(listAction)
}