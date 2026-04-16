import { type Database } from 'bun:sqlite'
import type { SuggestionFilters } from '@/types'
import { getApprovedSuggestionTransactionIds } from './queries'
import { markApprovedSuggestionApplied } from './mutations'

export interface ApplyResult {
  applied: number
  skipped: number
  firstError?: string
}

export function applyApprovedCategorySuggestions(
  db: Database,
  filters: SuggestionFilters = {}
): ApplyResult {
  const transactionIds = getApprovedSuggestionTransactionIds(db, filters)

  let applied = 0
  let skipped = 0
  let firstError: string | undefined

  const run = db.transaction(() => {
    for (const transactionId of transactionIds) {
      try {
        const suggestion = db.prepare(`
          SELECT category_id FROM transaction_category_suggestions
          WHERE transaction_id = ? AND status = 'approved'
        `).get(transactionId) as { category_id: string } | null

        if (suggestion === null) {
          skipped++
          continue
        }

        const result = db.prepare(`
          UPDATE transactions SET category_id = ?
          WHERE id = ? AND category_id IS NULL
        `).run(suggestion.category_id, transactionId)

        if (result.changes === 0) {
          skipped++
          continue
        }

        markApprovedSuggestionApplied(db, transactionId)
        applied++
      } catch (error) {
        skipped++
        firstError ??= error instanceof Error ? error.message : String(error)
      }
    }
  })

  run()

  return { applied, skipped, firstError }
}
