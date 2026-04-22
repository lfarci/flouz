import { cancel, intro, isCancel, log, note, outro, select, text } from '@clack/prompts'
import { type Database } from 'bun:sqlite'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { formatAmount } from '@/cli/format'
import { openDatabase } from '@/db/schema'
import { getTransactionById, getTransactions } from '@/db/transactions/queries'
import { updateComment } from '@/db/transactions/mutations'
import type { Transaction, TransactionFilters } from '@/types'
import { toBaseFilters } from '@/commands/transactions/parse-options'

interface CommentOptions {
  from?: string
  to?: string
  search?: string
  limit?: string
  db: string
}

type CommentDecision = 'set' | 'clear' | 'skip' | 'quit'

interface CommentSummary {
  updated: number
  cleared: number
  skipped: number
}

function toTransactionFilters(options: CommentOptions): TransactionFilters {
  return { ...toBaseFilters(options) }
}

function loadById(db: Database, id: number): Transaction[] {
  const transaction = getTransactionById(db, id)
  if (transaction === undefined) return []
  return [transaction]
}

function loadByFilters(db: Database, options: CommentOptions): Transaction[] {
  return getTransactions(db, toTransactionFilters(options))
}

function loadTransactions(db: Database, id: number | undefined, options: CommentOptions): Transaction[] {
  if (id !== undefined) return loadById(db, id)
  return loadByFilters(db, options)
}

function formatTransactionNote(transaction: Transaction, index: number, total: number): string {
  const lines = [
    `[${index}/${total}]  ${transaction.date}  ${formatAmount(transaction.amount)} EUR`,
    `Counterparty : ${transaction.counterparty}`,
  ]
  if (transaction.bankCommunication !== undefined) lines.push(`Bank note    : ${transaction.bankCommunication}`)
  if (transaction.comment !== undefined) lines.push(`Comment      : ${transaction.comment}`)
  return lines.join('\n')
}

function decisionOptionsFor(hasComment: boolean) {
  const options = [
    { value: 'set' as CommentDecision, label: hasComment ? 'Update comment' : 'Add comment' },
    { value: 'skip' as CommentDecision, label: 'Skip' },
    { value: 'quit' as CommentDecision, label: 'Quit' },
  ]
  if (hasComment) options.splice(1, 0, { value: 'clear' as CommentDecision, label: 'Clear comment' })
  return options
}

async function promptDecision(transaction: Transaction, index: number, total: number): Promise<CommentDecision> {
  note(formatTransactionNote(transaction, index, total), 'Transaction')

  const decision = await select({
    message: 'What do you want to do?',
    options: decisionOptionsFor(transaction.comment !== undefined),
  })

  if (isCancel(decision)) return 'quit'
  return decision
}

async function promptComment(current: string | undefined): Promise<string | symbol> {
  return await text({
    message: 'Enter comment:',
    initialValue: current ?? '',
    placeholder: 'Leave blank to skip',
  })
}

async function applyDecision(
  db: Database,
  decision: CommentDecision,
  transaction: Transaction,
): Promise<CommentDecision> {
  if (transaction.id === undefined) return 'skip'

  if (decision === 'clear') {
    updateComment(db, transaction.id, undefined)
    log.success('Comment cleared')
    return 'clear'
  }

  if (decision === 'set') {
    const input = await promptComment(transaction.comment)
    if (isCancel(input)) return 'quit'
    const trimmed = input.toString().trim()
    if (trimmed === '') return 'skip'
    updateComment(db, transaction.id, trimmed)
    log.success('Comment saved')
    return 'set'
  }

  return decision
}

async function annotateTransactions(db: Database, transactions: Transaction[]): Promise<CommentSummary> {
  const summary: CommentSummary = { updated: 0, cleared: 0, skipped: 0 }

  for (let i = 0; i < transactions.length; i++) {
    const decision = await promptDecision(transactions[i], i + 1, transactions.length)
    if (decision === 'quit') break

    const outcome = await applyDecision(db, decision, transactions[i])
    if (outcome === 'quit') break
    if (outcome === 'set') summary.updated++
    if (outcome === 'clear') summary.cleared++
    if (outcome === 'skip') summary.skipped++
  }

  return summary
}

function formatSummary(summary: CommentSummary, total: number): string {
  const acted = summary.updated + summary.cleared
  return `Reviewed ${acted + summary.skipped}/${total} — ${summary.updated} updated, ${summary.cleared} cleared, ${summary.skipped} skipped`
}

async function commentAction(idArg: string | undefined, options: CommentOptions): Promise<void> {
  intro('Transaction Comments')

  let database: Database | undefined
  const onCancel = () => {
    database?.close()
    cancel('Cancelled.')
    process.exit(1)
  }
  process.once('SIGINT', onCancel)

  try {
    const dbPath = resolve(options.db)
    database = openDatabase(dbPath)

    const id = idArg !== undefined ? Number.parseInt(idArg, 10) : undefined
    if (idArg !== undefined && (Number.isNaN(id!) || id! <= 0)) {
      process.removeListener('SIGINT', onCancel)
      database.close()
      log.error(`Invalid transaction ID: ${idArg}`)
      process.exit(1)
      return
    }

    const transactions = loadTransactions(database, id, options)

    if (transactions.length === 0) {
      process.removeListener('SIGINT', onCancel)
      database.close()
      log.info(id !== undefined ? `No transaction found with ID ${id}.` : 'No transactions match the given filters.')
      outro('Done')
      return
    }

    log.info(`Found ${transactions.length} transaction${transactions.length === 1 ? '' : 's'}.`)

    const summary = await annotateTransactions(database, transactions)

    process.removeListener('SIGINT', onCancel)
    database.close()
    outro(formatSummary(summary, transactions.length))
  } catch (error) {
    process.removeListener('SIGINT', onCancel)
    database?.close()
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

export function createCommentCommand(defaultDb: string): Command {
  return new Command('comment')
    .description('Interactively add or edit comments on transactions before categorization')
    .argument('[id]', 'transaction ID to comment on directly')
    .option('-f, --from <date>', 'filter from date (YYYY-MM-DD)')
    .option('-t, --to <date>', 'filter to date (YYYY-MM-DD)')
    .option('-s, --search <text>', 'search counterparty')
    .option('-l, --limit <n>', 'max transactions to review')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(commentAction)
}
