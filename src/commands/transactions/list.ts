import { cancel, intro, log, outro } from '@clack/prompts'
import { Database } from 'bun:sqlite'
import { Command } from 'commander'
import { basename, resolve } from 'node:path'
import { renderCliTable } from '@/cli/table'
import { getCategories } from '@/db/categories/queries'
import { openDatabase } from '@/db/schema'
import { getTransactions, getUncategorized } from '@/db/transactions/queries'
import type { Category, Transaction, TransactionFilters } from '@/types'

type ListOptions = {
  from?: string
  to?: string
  category?: string
  search?: string
  limit?: string
  db: string
}

type ListData = {
  transactions: Transaction[]
  uncategorizedCount: number
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
  }
}

function parseLimit(limit: string | undefined): number | undefined {
  if (limit === undefined) return undefined
  return Number.parseInt(limit, 10)
}

function loadListData(db: Database, options: ListOptions): ListData {
  const categoryId = resolveCategoryId(db, options.category)
  const filters = toTransactionFilters(options, categoryId)
  return {
    transactions: getTransactions(db, filters),
    uncategorizedCount: getUncategorized(db).length,
  }
}

export function formatTransactionTable(transactions: Transaction[]): string[] {
  return renderCliTable({
    columns: [
      { header: 'Date', width: 10, minWidth: 10, truncate: 10 },
      { header: 'Amount', width: 12, minWidth: 10, alignment: 'right', truncate: 12 },
      { header: 'Counterparty', width: 28, minWidth: 16, truncate: 28 },
      { header: 'Category', width: 24, minWidth: 12, truncate: 24 },
    ],
    rows: transactions.map(transaction => [
      transaction.date,
      formatAmount(transaction.amount),
      transaction.counterparty,
      transaction.categoryId ?? '—',
    ]),
  })
}

function formatAmount(amount: number): string {
  const sign = amount >= 0 ? '+' : ''
  return `${sign}${amount.toFixed(2)}`
}

export function buildSummaryLines(transactionCount: number, uncategorizedCount: number): string[] {
  const lines = [`${transactionCount} transactions`]
  if (uncategorizedCount === 0) return lines
  return [...lines, `${uncategorizedCount} uncategorized`]
}

function reportResults(data: ListData): void {
  if (data.transactions.length === 0) {
    log.info('No transactions found.')
    return
  }

  log.message(formatTransactionTable(data.transactions), { spacing: 0, withGuide: false })

  for (const line of buildSummaryLines(data.transactions.length, data.uncategorizedCount)) {
    log.info(line)
  }
}

async function listAction(options: ListOptions): Promise<void> {
  intro('flouz transactions list')

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
    database.close()
    process.removeListener('SIGINT', onCancel)
    reportResults(data)
    outro(`Read from ${basename(dbPath)}`)
  } catch (error) {
    process.removeListener('SIGINT', onCancel)
    database?.close()
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
    .option('-l, --limit <n>', 'max results', '50')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(listAction)
}