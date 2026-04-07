import { Command } from 'commander'
import { Database } from 'bun:sqlite'
import { resolve } from 'path'
import { initDb, seedCategories } from '@/db/schema'
import { getTransactions, getUncategorized } from '@/db/transactions'
import { getCategories } from '@/db/categories'
import type { TransactionFilters } from '@/types'
import { resolveDbPath } from '@/config'

export async function createListCommand(): Promise<Command> {
  const defaultDb = await resolveDbPath()
  return new Command('list')
    .description('List transactions')
    .option('-f, --from <date>', 'filter from date (yyyy-MM-dd)')
    .option('-t, --to <date>', 'filter to date (yyyy-MM-dd)')
    .option('-c, --category <slug>', 'filter by category slug')
    .option('-s, --search <text>', 'search counterparty')
    .option('-l, --limit <n>', 'max results', '50')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(async (options) => {
      const dbPath = resolve(options.db)
      if (!(await Bun.file(dbPath).exists())) {
        console.error(`No database found at ${dbPath}. Run \`flouz import\` first or check your configuration with \`flouz config get\`.`)
        process.exit(1)
      }
      const db = new Database(dbPath)
      initDb(db)
      seedCategories(db)

      // Resolve category slug → id if provided
      let categoryId: string | undefined
      if (options.category) {
        const categories = getCategories(db)
        const match = categories.find(c => c.slug === options.category)
        if (!match) {
          console.error(`Unknown category slug: ${options.category}`)
          process.exit(1)
        }
        categoryId = match.id
      }

      const filters: TransactionFilters = {
        from: options.from,
        to: options.to,
        categoryId,
        search: options.search,
        limit: options.limit ? parseInt(options.limit, 10) : undefined,
      }

      const transactions = getTransactions(db, filters)
      const uncategorized = getUncategorized(db)

      db.close()

      if (transactions.length === 0) {
        console.log('No transactions found.')
        return
      }

      // Print table header
      const header = ['Date', 'Amount', 'Counterparty', 'Category'].map(h => h.padEnd(20)).join(' │ ')
      const divider = '─'.repeat(header.length)
      console.log(divider)
      console.log(header)
      console.log(divider)

      for (const tx of transactions) {
        const amount = (tx.amount >= 0 ? '+' : '') + tx.amount.toFixed(2)
        const row = [
          tx.date.padEnd(20),
          amount.padEnd(20),
          (tx.counterparty ?? '').substring(0, 18).padEnd(20),
          (tx.categoryId ?? '—').substring(0, 18).padEnd(20),
        ].join(' │ ')
        console.log(row)
      }

      console.log(divider)
      console.log(`${transactions.length} transactions`)
      if (uncategorized.length > 0) {
        console.log(`⚠ ${uncategorized.length} uncategorized`)
      }
    })
}
