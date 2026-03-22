export interface Category {
  id: string
  name: string
  slug: string
  parentId: string | null
}

export interface Transaction {
  id?: number
  date: string               // yyyy-MM-dd
  amount: number             // signed float, Euros
  counterparty: string
  counterpartyIban?: string
  currency: string           // default 'EUR'
  account?: string
  sourceRef?: string
  categoryId?: string
  aiCategoryId?: string
  aiConfidence?: number
  aiReasoning?: string
  note?: string
  sourceFile?: string
  importedAt: string         // ISO timestamp
}

export interface TransactionFilters {
  from?: string
  to?: string
  categoryId?: string
  search?: string
  limit?: number
}
