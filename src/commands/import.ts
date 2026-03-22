import { Command } from 'commander'
import { intro, outro, spinner, log } from '@clack/prompts'
import { Database } from 'bun:sqlite'
import { initDb, seedCategories } from '@/db/schema'
import { insertTransaction } from '@/db/queries'
import { parseBankCsv } from '@/parsers/bank'

export function createImportCommand(): Command {
  return new Command('import')
    .description('Import transactions from a bank CSV file')
    .argument('<file>', 'path to CSV file')
    .option('-d, --db <path>', 'SQLite database path', Bun.env.DB_PATH ?? './flouz.db')
    .action(async (file: string, options: { db: string }) => {
      intro('flouz import')

      const s = spinner()
      s.start('Importing…')

      let content: string
      try {
        content = await Bun.file(file).text()
      } catch {
        s.stop('Failed')
        log.error(`Cannot read file: ${file}`)
        process.exit(1)
      }

      const db = new Database(options.db)
      initDb(db)
      seedCategories(db)

      const transactions = parseBankCsv(content, file)
      let imported = 0
      let skipped = 0
      for (const tx of transactions) {
        const changes = insertTransaction(db, tx)
        if (changes > 0) imported++
        else skipped++
      }

      db.close()
      s.stop('Done')
      outro(`✓ ${imported} imported, ${skipped} skipped (duplicates)`)
    })
}
