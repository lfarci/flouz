import { Command } from 'commander'
import { intro, outro, progress, spinner, cancel, log } from '@clack/prompts'
import { Database } from 'bun:sqlite'
import { resolve, extname, join, basename } from 'node:path'
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

export async function createImportCommand(): Promise<Command> {
  const defaultDb = await resolveDbPath()
  return new Command('import')
    .description('Import transactions from a CSV file or directory of CSV files')
    .argument('<path>', 'path to CSV file or directory')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(async (path: string, options: { db: string }) => {
      intro('flouz import')

      // Register SIGINT handler immediately — covers all phases including gaps between spinner/progress
      let db: Database | undefined
      const onCancel = () => {
        db?.close()
        cancel('Import cancelled.')
        process.exit(1)
      }
      process.once('SIGINT', onCancel)

      const info = await stat(path).catch(() => null)
      if (!info) {
        process.removeListener('SIGINT', onCancel)
        log.error(`Cannot access path: ${path}`)
        process.exit(1)
      }

      let files: string[]
      if (info.isDirectory()) {
        files = await findCsvFiles(path)
        if (files.length === 0) {
          process.removeListener('SIGINT', onCancel)
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

      db = new Database(dbPath)
      initDb(db)
      seedCategories(db)

      // Phase 1: parse all files (spinner — gives feedback while reading disk)
      const s = spinner()
      s.start(files.length === 1 ? `Reading ${basename(files[0])}` : `Reading ${files.length} files`)
      const parsed: Array<{ file: string; transactions: ReturnType<typeof parseCsv>['transactions']; errors: ParseError[] }> = []
      for (const file of files) {
        if (files.length > 1) s.message(`Reading ${basename(file)}`)
        const content = await Bun.file(file).text()
        const { transactions, errors } = parseCsv(content, file)
        parsed.push({ file, transactions, errors })
      }
      const totalRows = parsed.reduce((sum, { transactions }) => sum + transactions.length, 0)
      const fileLabel = files.length === 1 ? basename(files[0]) : `${files.length} files`
      s.stop(`Importing ${fileLabel} (${totalRows} rows)`)

      // Phase 2: insert with a single progress bar (total is now known)
      // Inserts are synchronous (bun:sqlite), so we yield every YIELD_EVERY
      // rows to let the progress animation render and SIGINT handlers fire.
      const YIELD_EVERY = 25
      const p = progress({ max: Math.max(1, totalRows), style: 'heavy' })
      p.start(`0 / ${totalRows}`)

      let totalImported = 0
      const allParseErrors: Array<ParseError & { file: string }> = []

      try {
        for (const { file, transactions, errors } of parsed) {
          for (const tx of transactions) {
            insertTransaction(db, tx)
            totalImported++
            p.advance(1, `${basename(file)} — ${totalImported} / ${totalRows}`)
            if (totalImported % YIELD_EVERY === 0) await Bun.sleep(0)
          }
          allParseErrors.push(...errors.map(e => ({ ...e, file })))
        }
      } catch (error) {
        process.removeListener('SIGINT', onCancel)
        p.error('Failed')
        log.error(error instanceof Error ? error.message : String(error))
        db.close()
        process.exit(1)
      }

      process.removeListener('SIGINT', onCancel)
      db.close()
      p.stop(`${totalImported} / ${totalRows}`)

      for (const { file, row, message } of allParseErrors) {
        log.warn(`${file} line ${row}: ${message}`)
      }

      const errorSuffix = allParseErrors.length > 0 ? `, ${allParseErrors.length} invalid row(s) skipped` : ''
      outro(`✓ ${totalImported} imported${errorSuffix}`)
    })
}
