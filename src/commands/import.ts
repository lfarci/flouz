import { Command } from 'commander'
import { intro, outro, progress, tasks, log } from '@clack/prompts'
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

type FileResult = {
  imported: number
  parseErrors: Array<ParseError & { file: string }>
}

async function processFile(
  db: Database,
  filePath: string,
  onProgress?: (current: number, total: number) => void,
): Promise<FileResult> {
  const content = await Bun.file(filePath).text()
  const { transactions, errors } = parseCsv(content, filePath)

  for (let i = 0; i < transactions.length; i++) {
    insertTransaction(db, transactions[i])
    onProgress?.(i + 1, transactions.length)
  }

  return {
    imported: transactions.length,
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

      const info = await stat(path).catch(() => null)
      if (!info) {
        log.error(`Cannot access path: ${path}`)
        process.exit(1)
      }

      let files: string[]
      if (info.isDirectory()) {
        files = await findCsvFiles(path)
        if (files.length === 0) {
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
      const allParseErrors: Array<ParseError & { file: string }> = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const label = files.length > 1 ? `[${i + 1}/${files.length}] ${basename(file)}` : basename(file)
        let p: ReturnType<typeof progress> | undefined
        try {
          const { imported, parseErrors } = await processFile(db, file, (current, total) => {
            if (!p) {
              p = progress({ max: total, style: 'heavy' })
              p.start(label)
            }
            p.advance(1, `${current} / ${total} rows`)
          })
          p ? p.stop(`${imported} rows imported`) : log.step(`${label}: 0 rows`)
          totalImported += imported
          allParseErrors.push(...parseErrors)
        } catch (error) {
          p ? p.error('Failed') : log.error('Failed')
          log.error(error instanceof Error ? error.message : String(error))
          db.close()
          process.exit(1)
        }
      }

      db.close()

      for (const { file, row, message } of allParseErrors) {
        log.warn(`${file} line ${row}: ${message}`)
      }

      const errorSuffix = allParseErrors.length > 0 ? `, ${allParseErrors.length} invalid row(s) skipped` : ''
      outro(`✓ ${totalImported} imported${errorSuffix}`)
    })
}
