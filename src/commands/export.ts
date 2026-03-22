import { Command } from 'commander'
import { Database } from 'bun:sqlite'
import { resolve } from 'path'
import { writeFileSync } from 'fs'
import { initDb, seedCategories } from '@/db/schema'
import { getTransactions, getCategories } from '@/db/queries'
import { resolveDbPath } from '@/config'

export async function createExportCommand(): Promise<Command> {
  const defaultDb = await resolveDbPath()
  return new Command('export')
    .description('Export transactions to CSV')
    .option('-o, --output <file>', 'output file path (default: stdout)')
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

      const transactions = getTransactions(db)
      const categories = getCategories(db)
      const categoryById = new Map(categories.map(c => [c.id, c]))

      db.close()

      const header = 'date,amount,counterparty,category,note'
      const rows = transactions.map(tx => {
        const category = tx.categoryId ? (categoryById.get(tx.categoryId)?.slug ?? '') : ''
        // Escape fields that may contain commas by quoting them
        const escape = (v: string) => v.includes(',') ? `"${v.replace(/"/g, '""')}"` : v
        return [
          tx.date,
          tx.amount.toFixed(2),
          escape(tx.counterparty),
          escape(category),
          escape(tx.note ?? ''),
        ].join(',')
      })

      const csv = [header, ...rows].join('\n')

      if (options.output) {
        writeFileSync(resolve(options.output), csv, 'utf-8')
        console.log(`Exported ${transactions.length} transactions to ${options.output}`)
      } else {
        process.stdout.write(csv + '\n')
      }
    })
}
