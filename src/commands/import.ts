import { Command } from 'commander'
import { intro, outro, spinner, log } from '@clack/prompts'
import { Database } from 'bun:sqlite'
import { resolve } from 'node:path'
import { initDb, seedCategories } from '@/db/schema'
import { insertTransaction } from '@/db/queries'
import { parseBankCsv } from '@/parsers/bank'
import { resolveDbPath } from '@/config'

export async function createImportCommand(): Promise<Command> {
  const defaultDb = await resolveDbPath()
  return new Command('import')
    .description('Import transactions from a bank CSV file')
    .argument('<file>', 'path to CSV file')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
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

      const dbPath = resolve(options.db)
      const isNewDb = !(await Bun.file(dbPath).exists())
      if (isNewDb) {
        log.info(`Creating new database at ${dbPath}`)
      }

      const db = new Database(dbPath)
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
