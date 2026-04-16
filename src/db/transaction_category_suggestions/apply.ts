import { type Database } from 'bun:sqlite'
import type { SuggestionFilters } from '@/types'
import { getApprovedSuggestionCategoryId, getApprovedSuggestionTransactionIds } from './queries'
import { markApprovedSuggestionApplied } from './mutations'
import { applyTransactionCategory } from '@/db/transactions/mutations'

export interface ApplyResult {
  selected: number
  applied: number
  skipped: number
  firstError?: string
}

export function applyApprovedCategorySuggestions(
  db: Database,
  filters: SuggestionFilters = {}
): ApplyResult {
  const transactionIds = getApprovedSuggestionTransactionIds(db, filters)
  const selected = transactionIds.length

  let applied = 0
  let skipped = 0
  let firstError: string | undefined

  const run = db.transaction(() => {
    for (const transactionId of transactionIds) {
      try {
        const categoryId = getApprovedSuggestionCategoryId(db, transactionId)

        if (categoryId === null) {
          skipped++
          continue
        }

        const changes = applyTransactionCategory(db, transactionId, categoryId)

        if (changes === 0) {
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

  return { selected, applied, skipped, firstError }
}
