import { cancel, log } from '@clack/prompts'
import { type Database } from 'bun:sqlite'
import { Command } from 'commander'
import { isBrokenPipeError, writeStdout } from '@/cli/stdout'
import { formatAmount } from '@/cli/format'
import { resolve } from 'node:path'
import { getCategories } from '@/db/categories/queries'
import { openDatabase } from '@/db/schema'
import { getTransactions } from '@/db/transactions/queries'
import { parseLimit } from './parse-options'
import { buildCsv, buildJson, formatTransactionTable } from './format'
import type { ListRow } from './format'
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

async function ensureDatabaseExists(dbPath: string): Promise<void> {
  if (await Bun.file(dbPath).exists()) return
  throw new Error(
    `No database found at ${dbPath}. Run \`flouz transactions import\` first or check your configuration with \`flouz config get\`.`
  )
}

export function findCategoryId(categories: Category[], categorySlug: string): string {
  const category = categories.find(candidate => candidate.slug === categorySlug)
  if (category !== undefined) return category.id
  const known = categories.map(candidate => candidate.slug).join(', ')
  throw new Error(`Unknown category slug: ${categorySlug}. Known slugs: ${known}`)
}

function resolveCategoryId(db: Database, categorySlug: string | undefined): string | undefined {
  if (categorySlug === undefined) return undefined
  return findCategoryId(getCategories(db), categorySlug)
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

function loadListData(db: Database, options: ListOptions): ListData {
  const categoryId = resolveCategoryId(db, options.category)
  const filters = toTransactionFilters(options, categoryId)
  return { transactions: getTransactions(db, filters) }
}

function createCategorySlugById(db: Database): Map<string, string> {
  const categories = getCategories(db)
  return new Map(categories.map(category => [category.id, category.slug]))
}

function resolveCategorySlug(
  categoryId: string | undefined,
  categorySlugById: Map<string, string>
): string {
  if (categoryId === undefined) return '—'
  return categorySlugById.get(categoryId) ?? categoryId
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

export function parseOutputFormat(value: string): OutputFormat {
  if (value === 'table' || value === 'csv' || value === 'json') return value
  throw new Error(`Invalid output format: ${value}. Use table, csv, or json.`)
}

function buildOutput(rows: ListRow[], outputFormat: OutputFormat): string {
  if (outputFormat === 'csv') return buildCsv(rows)
  if (outputFormat === 'json') return buildJson(rows)
  return formatTransactionTable(rows).join('\n')
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

    await writeStdout(`${buildOutput(rows, options.output)}\n`)
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
