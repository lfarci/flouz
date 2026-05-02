export interface Category {
  id: string
  name: string
  slug: string
  parentId: string | null
}

export interface Account {
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
  date: string // yyyy-MM-dd
  amount: number // signed float, Euros
  counterparty: string
  hash: string
  counterpartyIban?: string
  currency: string // default 'EUR'
  accountId?: number
  categoryId?: string
  bankCommunication?: string
  sourceFile?: string
  importedAt: string // ISO timestamp
  comment?: string
}

export type NewTransaction = Omit<Transaction, 'id' | 'hash' | 'comment'>

export type ImportedTransaction = Omit<NewTransaction, 'accountId'> & {
  accountKey?: string
}

export interface TransactionFilters {
  from?: string
  to?: string
  categoryIds?: string[]
  search?: string
  limit?: number
  uncategorized?: boolean
}

export type TransactionCategorySuggestionStatus = 'pending' | 'approved' | 'applied'

export interface TransactionCategorySuggestion {
  transactionId: number
  categoryId: string
  confidence: number
  model: string
  suggestedAt: string
  status: TransactionCategorySuggestionStatus
  reviewedAt?: string
  appliedAt?: string
  reasoning?: string
}

export type NewTransactionCategorySuggestion = Omit<
  TransactionCategorySuggestion,
  'suggestedAt' | 'status' | 'reviewedAt' | 'appliedAt'
>

export interface CategorizeTransactionsFilters {
  from?: string
  to?: string
  search?: string
  limit?: number
  override?: boolean
}

export interface SuggestionFilters {
  from?: string
  to?: string
  search?: string
  limit?: number
  status?: TransactionCategorySuggestionStatus
}

export interface SuggestionWithContext {
  transactionId: number
  transactionDate: string
  counterparty: string
  amount: number
  categoryId: string
  categoryName: string
  confidence: number
  status: TransactionCategorySuggestionStatus
  suggestedAt: string
  reviewedAt?: string
  appliedAt?: string
  reasoning?: string
}

export interface CategorizationExample {
  counterparty: string
  amount: number
  date: string
  categoryId: string
  categoryName: string
  categorySlug: string
}

export interface CounterpartyCategoryConsensus {
  categoryId: string
  categoryName: string
  count: number
}
