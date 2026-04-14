import { Database } from 'bun:sqlite'

export function getSuggestedTransactionIds(db: Database): number[] {
  const rows = db.prepare(
    'SELECT transaction_id FROM transaction_category_suggestions'
  ).all() as { transaction_id: number }[]

  return rows.map(row => row.transaction_id)
}
