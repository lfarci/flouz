import type { BudgetType, Category } from '@/types'
import { parseAmount } from './month'

export interface ParsedBudgetValue {
  amount: number
  type: BudgetType
}

const STRICT_NUMERIC = /^\d+(\.\d+)?$/

export function parseBudgetValue(value: string): ParsedBudgetValue {
  const trimmed = value.trim()
  if (trimmed.endsWith('%')) {
    const rawPercentage = trimmed.slice(0, -1).trim()
    if (!STRICT_NUMERIC.test(rawPercentage)) {
      throw new Error(`Invalid percentage: "${trimmed}". Must be between 1% and 100%.`)
    }
    const percentage = Number.parseFloat(rawPercentage)
    if (percentage <= 0 || percentage > 100) {
      throw new Error(`Invalid percentage: "${trimmed}". Must be between 1% and 100%.`)
    }
    return { amount: percentage, type: 'percent' }
  }
  return { amount: parseAmount(trimmed), type: 'fixed' }
}

export function findTopLevelCategory(categories: Category[], slug: string): Category {
  const category = categories.find((candidate) => candidate.slug === slug)
  if (category === undefined) {
    throw new Error(`Category not found: "${slug}"`)
  }
  if (category.parentId !== null) {
    throw new Error('Budgets can only be set on top-level categories')
  }
  return category
}

export function getTopLevelBudgetCategories(categories: Category[]): Category[] {
  return categories.filter((category) => category.parentId === null && category.slug !== 'income')
}

export function formatBudgetConfirmation(name: string, parsed: ParsedBudgetValue, month: string): string {
  if (parsed.type === 'percent') {
    return `${name} → ${parsed.amount}% of income / month (${month})`
  }
  return `${name} → €${parsed.amount.toFixed(2)} / month (${month})`
}
