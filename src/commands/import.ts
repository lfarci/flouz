import { Command } from 'commander'
import { intro, outro, spinner, log } from '@clack/prompts'
import { Database } from 'bun:sqlite'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { initDb, seedCategories } from '../db/schema'
import { insertTransaction } from '../db/queries'
import { parse, detectFormat } from '../parsers/registry'

export function createImportCommand(): Command {
  return new Command('import')
    .description('Import transactions from a bank CSV file')
    .argument('<file>', 'path to CSV file')
    .option('-d, --db <path>', 'SQLite database path', process.env.DB_PATH ?? './flouz.db')
    .action(async (file: string, options: { db: string }) => {
      intro('flouz import')

      const filePath = resolve(file)
      const dbPath = resolve(options.db)

      // Read CSV
      const s = spinner()
      s.start('Reading file…')
      let content: string
      try {
        content = readFileSync(filePath, 'latin1') // Belgian bank exports use Latin-1
      } catch {
        s.stop('Failed to read file')
        log.error(`Cannot read file: ${filePath}`)
        process.exit(1)
      }
      s.stop('File read')

      // Open DB
      const db = new Database(dbPath)
      initDb(db)
      seedCategories(db)

      // Parse
      s.start('Parsing transactions…')
      const format = detectFormat(content)
      const transactions = parse(content, format, file)
      s.stop(`Parsed ${transactions.length} transactions`)

      // Insert
      s.start('Importing…')
      let imported = 0
      let skipped = 0
      for (const tx of transactions) {
        const changes = insertTransaction(db, tx)
        if (changes > 0) imported++
        else skipped++
      }
      s.stop('Done')

      db.close()

      outro(`✓ ${imported} imported, ${skipped} skipped (duplicates)`)
    })
}
