export interface Category {
  id: string
  name: string
  slug: string
  parentId: string | null
}

export type Account = {
  id: number
  key: string
  company: string
  name: string
  description?: string
  iban?: string
}

export type NewAccount = Omit<Account, 'id'>

export interface Transaction {
  id?: number
  date: string               // yyyy-MM-dd
  amount: number             // signed float, Euros
  counterparty: string
  hash: string
  counterpartyIban?: string
  currency: string           // default 'EUR'
  accountId?: number
  categoryId?: string
  note?: string
  sourceFile?: string
  importedAt: string         // ISO timestamp
}

export type NewTransaction = Omit<Transaction, 'id' | 'hash'>

export type ImportedTransaction = Omit<NewTransaction, 'accountId'> & {
  accountKey?: string
}

export interface TransactionFilters {
  from?: string
  to?: string
  categoryId?: string
  search?: string
  limit?: number
  uncategorized?: boolean
}

export type TransactionCategorySuggestion = {
  transactionId: number
  categoryId: string
  confidence: number
  model: string
  suggestedAt: string
}

export type NewTransactionCategorySuggestion = Omit<TransactionCategorySuggestion, 'suggestedAt'>

export type CategorizeTransactionsFilters = {
  from?: string
  to?: string
  search?: string
  limit?: number
}
