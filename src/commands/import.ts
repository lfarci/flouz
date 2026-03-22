import { Command } from 'commander'
import { intro, outro, spinner, log } from '@clack/prompts'
import { Database } from 'bun:sqlite'
import { resolve, extname, join } from 'node:path'
import { stat, readdir } from 'node:fs/promises'
import { initDb, seedCategories } from '@/db/schema'
import { insertTransaction } from '@/db/queries'
import { parseCsv, type ParseError } from '@/parsers/csv'
import { resolveDbPath } from '@/config'

export async function findCsvFiles(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true })
  return entries
    .filter(e => e.isFile() && extname(e.name).toLowerCase() === '.csv')
    .map(e => join(dirPath, e.name))
}

type FileResult = {
  imported: number
  skipped: number
  parseErrors: Array<ParseError & { file: string }>
}

async function processFile(db: Database, filePath: string): Promise<FileResult> {
  const content = await Bun.file(filePath).text()
  const { transactions, errors } = parseCsv(content, filePath)

  let imported = 0
  let skipped = 0
  for (const tx of transactions) {
    const changes = insertTransaction(db, tx)
    if (changes > 0) imported++
    else skipped++
  }

  return {
    imported,
    skipped,
    parseErrors: errors.map(e => ({ ...e, file: filePath })),
  }
}

export async function createImportCommand(): Promise<Command> {
  const defaultDb = await resolveDbPath()
  return new Command('import')
    .description('Import transactions from a CSV file or directory of CSV files')
    .argument('<path>', 'path to CSV file or directory')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(async (path: string, options: { db: string }) => {
      intro('flouz import')

      const s = spinner()
      s.start('Importing…')

      const info = await stat(path).catch(() => null)
      if (!info) {
        s.stop('Failed')
        log.error(`Cannot access path: ${path}`)
        process.exit(1)
      }

      let files: string[]
      if (info.isDirectory()) {
        files = await findCsvFiles(path)
        if (files.length === 0) {
          s.stop('No CSV files found')
          log.warn(`No CSV files found in: ${path}`)
          process.exit(0)
        }
      } else {
        files = [resolve(path)]
      }

      const dbPath = resolve(options.db)
      const isNewDb = !(await Bun.file(dbPath).exists())
      if (isNewDb) {
        log.info(`Creating new database at ${dbPath}`)
      }

      const db = new Database(dbPath)
      initDb(db)
      seedCategories(db)

      let totalImported = 0
      let totalSkipped = 0
      const allParseErrors: Array<ParseError & { file: string }> = []

      for (const file of files) {
        try {
          const { imported, skipped, parseErrors } = await processFile(db, file)
          totalImported += imported
          totalSkipped += skipped
          allParseErrors.push(...parseErrors)
        } catch (error) {
          s.stop('Failed')
          log.error(`Error in ${file}: ${error instanceof Error ? error.message : String(error)}`)
          db.close()
          process.exit(1)
        }
      }

      db.close()
      s.stop('Done')

      for (const { file, row, message } of allParseErrors) {
        log.warn(`${file} line ${row}: ${message}`)
      }

      const errorSuffix = allParseErrors.length > 0 ? `, ${allParseErrors.length} invalid row(s) skipped` : ''
      outro(`✓ ${totalImported} imported, ${totalSkipped} skipped (duplicates)${errorSuffix}`)
    })
}
