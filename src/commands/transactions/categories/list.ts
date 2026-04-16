import { log } from '@clack/prompts'
import { type Database } from 'bun:sqlite'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { getCategories } from '@/db/categories/queries'
import { openDatabase } from '@/db/schema'
import { renderCliTable } from '@/cli/table'
import { isBrokenPipeError, writeStdout } from '@/cli/stdout'
import type { Category } from '@/types'

interface ListCategoriesOptions {
  tree: boolean
  db: string
}

function formatCategoriesTable(categories: Category[]): string[] {
  return renderCliTable({
    columns: [
      { header: 'Slug', width: 32, minWidth: 16, wrapWord: true },
      { header: 'Name', width: 32, minWidth: 16, wrapWord: true },
      { header: 'ID', width: 36, minWidth: 36, truncate: 36 },
    ],
    rows: categories.map(category => [category.slug, category.name, category.id]),
  })
}

interface TreeEntry { label: string; slug: string }

function buildChildrenMap(categories: Category[]): Map<string | null, Category[]> {
  const childrenById = new Map<string | null, Category[]>()
  for (const category of categories) {
    const siblings = childrenById.get(category.parentId) ?? []
    siblings.push(category)
    childrenById.set(category.parentId, siblings)
  }
  return childrenById
}

function formatCategoriesTree(categories: Category[]): string {
  const childrenById = buildChildrenMap(categories)
  const entries: TreeEntry[] = []

  function renderNode(category: Category, prefix: string, isLast: boolean): void {
    const connector = isLast ? '└── ' : '├── '
    entries.push({ label: `${prefix}${connector}${category.name}`, slug: category.slug })
    const children = childrenById.get(category.id) ?? []
    const childPrefix = prefix + (isLast ? '    ' : '│   ')
    for (let i = 0; i < children.length; i++) {
      renderNode(children[i], childPrefix, i === children.length - 1)
    }
  }

  const roots = childrenById.get(null) ?? []
  for (let i = 0; i < roots.length; i++) {
    renderNode(roots[i], '', i === roots.length - 1)
  }

  const maxLabelLength = Math.max(...entries.map(entry => entry.label.length))
  return entries.map(entry => `${entry.label.padEnd(maxLabelLength)}  ${entry.slug}`).join('\n')
}

async function listCategoriesAction(options: ListCategoriesOptions): Promise<void> {
  let database: Database | undefined

  try {
    const dbPath = resolve(options.db)
    database = openDatabase(dbPath)

    const categories = getCategories(database)
    database.close()

    if (categories.length === 0) {
      log.info('No categories found.')
      return
    }

    if (options.tree) {
      await writeStdout(`${formatCategoriesTree(categories)}\n`)
    } else {
      const lines = formatCategoriesTable(categories)
      await writeStdout(`${lines.join('\n')}\n`)
    }
  } catch (error) {
    database?.close()
    if (isBrokenPipeError(error)) {
      process.exit(0)
    }
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

export function createListCategoriesCommand(defaultDb: string): Command {
  return new Command('list')
    .description('List available transaction categories')
    .option('--tree', 'show categories as a hierarchy tree', false)
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(listCategoriesAction)
}
