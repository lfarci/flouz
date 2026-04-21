import { cancel, intro, isCancel, log, note, outro, select } from '@clack/prompts'
import { type Database } from 'bun:sqlite'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { getCategories } from '@/db/categories/queries'
import { openDatabase } from '@/db/schema'
import {
  approveTransactionCategorySuggestion,
  deleteTransactionCategorySuggestion,
  overrideTransactionCategorySuggestion,
} from '@/db/transaction_category_suggestions/mutations'
import { getTransactionCategorySuggestions } from '@/db/transaction_category_suggestions/queries'
import { toBaseFilters } from '@/commands/transactions/parse-options'
import { formatAmount } from '@/cli/format'
import type { Category, SuggestionFilters, SuggestionWithContext } from '@/types'

interface ReviewOptions {
  from?: string
  to?: string
  search?: string
  limit?: string
  db: string
}

type ReviewDecision = 'approve' | 'fix' | 'reject' | 'skip' | 'quit'

type ReviewSummary = {
  approved: number
  fixed: number
  rejected: number
  skipped: number
}

function toSuggestionFilters(options: ReviewOptions): SuggestionFilters {
  return { ...toBaseFilters(options), status: 'pending' }
}

function formatSuggestionNote(suggestion: SuggestionWithContext, index: number, total: number): string {
  const confidence = `${Math.round(suggestion.confidence * 100)}%`
  const lines = [
    `[${index}/${total}]  ${suggestion.transactionDate}  ${formatAmount(suggestion.amount)} EUR`,
    `Counterparty : ${suggestion.counterparty}`,
    `Suggestion   : ${suggestion.categoryName} (${confidence})`,
  ]
  if (suggestion.reasoning !== undefined) lines.push(`Reasoning    : ${suggestion.reasoning}`)
  return lines.join('\n')
}

async function promptDecision(
  suggestion: SuggestionWithContext,
  index: number,
  total: number,
): Promise<ReviewDecision> {
  note(formatSuggestionNote(suggestion, index, total), 'Transaction')

  const decision = await select({
    message: 'What do you want to do?',
    options: [
      { value: 'approve' as ReviewDecision, label: 'Approve' },
      { value: 'fix' as ReviewDecision, label: 'Fix category' },
      { value: 'reject' as ReviewDecision, label: 'Reject' },
      { value: 'skip' as ReviewDecision, label: 'Skip' },
      { value: 'quit' as ReviewDecision, label: 'Quit review' },
    ],
  })

  if (isCancel(decision)) return 'quit'
  return decision as ReviewDecision
}

async function applyDecision(
  db: Database,
  decision: ReviewDecision,
  suggestion: SuggestionWithContext,
  categories: Category[],
): Promise<ReviewDecision> {
  if (decision === 'approve') {
    approveTransactionCategorySuggestion(db, suggestion.transactionId)
    log.success('Approved')
    return 'approve'
  }
  if (decision === 'reject') {
    deleteTransactionCategorySuggestion(db, suggestion.transactionId)
    log.success('Rejected')
    return 'reject'
  }
  if (decision === 'fix') {
    const categoryId = await select({
      message: 'Choose the correct category:',
      options: categories.map((category) => ({ value: category.id, label: category.name, hint: category.slug })),
    })
    if (isCancel(categoryId)) return 'quit'
    overrideTransactionCategorySuggestion(db, suggestion.transactionId, categoryId as string)
    approveTransactionCategorySuggestion(db, suggestion.transactionId)
    log.success('Fixed and approved')
    return 'fix'
  }
  return decision
}

async function reviewSuggestions(db: Database, suggestions: SuggestionWithContext[]): Promise<ReviewSummary> {
  const categories = getCategories(db)
  const summary: ReviewSummary = { approved: 0, fixed: 0, rejected: 0, skipped: 0 }

  for (let i = 0; i < suggestions.length; i++) {
    const decision = await promptDecision(suggestions[i], i + 1, suggestions.length)
    if (decision === 'quit') break

    const outcome = await applyDecision(db, decision, suggestions[i], categories)
    if (outcome === 'quit') break
    if (outcome === 'approve') summary.approved++
    if (outcome === 'fix') summary.fixed++
    if (outcome === 'reject') summary.rejected++
    if (outcome === 'skip') summary.skipped++
  }

  return summary
}

function formatSummary(summary: ReviewSummary, total: number): string {
  const reviewed = summary.approved + summary.fixed + summary.rejected
  return `Reviewed ${reviewed}/${total} — ${summary.approved} approved, ${summary.fixed} fixed, ${summary.rejected} rejected, ${summary.skipped} skipped`
}

async function reviewAction(options: ReviewOptions): Promise<void> {
  intro('Suggestion Review')

  let database: Database | undefined
  const onCancel = () => {
    database?.close()
    cancel('Review cancelled.')
    process.exit(1)
  }
  process.once('SIGINT', onCancel)

  try {
    const dbPath = resolve(options.db)
    database = openDatabase(dbPath)

    const filters = toSuggestionFilters(options)
    const suggestions = getTransactionCategorySuggestions(database, filters)

    if (suggestions.length === 0) {
      process.removeListener('SIGINT', onCancel)
      database.close()
      log.info('No pending suggestions match the given filters.')
      outro('Done')
      return
    }

    log.info(`Found ${suggestions.length} pending suggestion${suggestions.length === 1 ? '' : 's'}.`)

    const summary = await reviewSuggestions(database, suggestions)

    process.removeListener('SIGINT', onCancel)
    database.close()
    outro(formatSummary(summary, suggestions.length))
  } catch (error) {
    process.removeListener('SIGINT', onCancel)
    database?.close()
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

export function createReviewCommand(defaultDb: string): Command {
  return new Command('review')
    .description('Interactively review pending transaction category suggestions one by one')
    .option('-f, --from <date>', 'filter from date (YYYY-MM-DD)')
    .option('-t, --to <date>', 'filter to date (YYYY-MM-DD)')
    .option('-s, --search <text>', 'search counterparty')
    .option('-l, --limit <n>', 'max suggestions to review')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(reviewAction)
}
