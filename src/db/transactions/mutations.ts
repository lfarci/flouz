import { Database } from 'bun:sqlite'
import type { Transaction } from '@/types'

export type TransactionHashInput = Pick<Transaction, 'date' | 'amount' | 'counterparty' | 'note'>

export function computeTransactionHash(transaction: TransactionHashInput): string {
  // Deduplication key: date + amount + counterparty + note (JSON-encoded to avoid delimiter collisions)
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(JSON.stringify([transaction.date, transaction.amount, transaction.counterparty, transaction.note ?? null]))
  return hasher.digest('hex')
}

export function insertTransaction(db: Database, transaction: Omit<Transaction, 'id'>): number {
  const hash = computeTransactionHash(transaction)
  const isDuplicate = db.prepare('SELECT 1 FROM transactions WHERE hash = ? AND is_duplicate = 0').get(hash) ? 1 : 0
  db.prepare(`
    INSERT INTO transactions
      (hash, is_duplicate, date, amount, counterparty, counterparty_iban, currency, account, source_ref,
       category_id, ai_category_id, ai_confidence, ai_reasoning, note, source_file, imported_at)
    VALUES
      ($hash, $isDuplicate, $date, $amount, $counterparty, $counterpartyIban, $currency, $account, $sourceRef,
       $categoryId, $aiCategoryId, $aiConfidence, $aiReasoning, $note, $sourceFile, $importedAt)
  `).run({
    $hash: hash,
    $isDuplicate: isDuplicate,
    $date: transaction.date,
    $amount: transaction.amount,
    $counterparty: transaction.counterparty,
    $counterpartyIban: transaction.counterpartyIban ?? null,
    $currency: transaction.currency,
    $account: transaction.account ?? null,
    $sourceRef: transaction.sourceRef ?? null,
    $categoryId: transaction.categoryId ?? null,
    $aiCategoryId: transaction.aiCategoryId ?? null,
    $aiConfidence: transaction.aiConfidence ?? null,
    $aiReasoning: transaction.aiReasoning ?? null,
    $note: transaction.note ?? null,
    $sourceFile: transaction.sourceFile ?? null,
    $importedAt: transaction.importedAt,
  })

  // Returns 1 for a fresh insert and 0 for a duplicate — mirrors result.changes semantics
  return isDuplicate === 0 ? 1 : 0
}

export function updateCategory(db: Database, id: number, categoryId: string): void {
  db.prepare('UPDATE transactions SET category_id = ? WHERE id = ?').run(categoryId, id)
}
