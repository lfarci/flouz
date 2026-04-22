import type { Transaction } from '@/types'

export type TransactionHashInput = Pick<Transaction, 'date' | 'amount' | 'counterparty' | 'bankCommunication'>

export function computeTransactionHash(transaction: TransactionHashInput): string {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(
    JSON.stringify([
      transaction.date,
      transaction.amount,
      transaction.counterparty,
      transaction.bankCommunication ?? null,
    ]),
  )
  return hasher.digest('hex')
}
