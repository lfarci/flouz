import { Database } from 'bun:sqlite'
import type { NewTransactionCategorySuggestion } from '@/types'

export function upsertTransactionCategorySuggestion(
  db: Database,
  suggestion: NewTransactionCategorySuggestion
): void {
  const suggestedAt = new Date().toISOString()

  db.prepare(`
    INSERT INTO transaction_category_suggestions
      (transaction_id, category_id, confidence, model, suggested_at)
    VALUES
      ($transactionId, $categoryId, $confidence, $model, $suggestedAt)
    ON CONFLICT(transaction_id) DO UPDATE SET
      category_id  = excluded.category_id,
      confidence   = excluded.confidence,
      model        = excluded.model,
      suggested_at = excluded.suggested_at
  `).run({
    $transactionId: suggestion.transactionId,
    $categoryId: suggestion.categoryId,
    $confidence: suggestion.confidence,
    $model: suggestion.model,
    $suggestedAt: suggestedAt,
  })
}
