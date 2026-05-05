import { type Database } from 'bun:sqlite'
import { log } from '@clack/prompts'
import type { Category } from '@/types'
import { upsertBudget } from '@/db/budgets/mutations'
import {
  type ParsedBudgetValue,
  parseBudgetValue,
  getTopLevelBudgetCategories,
  formatBudgetConfirmation,
} from './budget-value'

export const DEFAULT_NECESSITIES = '50%'
export const DEFAULT_DISCRETIONARY = '30%'
export const DEFAULT_SAVINGS = '20%'

export interface DefaultAllocationOptions {
  necessities: string
  discretionary: string
  savings: string
}

function resolveDefaultValueForSlug(slug: string, options: DefaultAllocationOptions): string {
  if (slug === 'necessities') return options.necessities
  if (slug === 'discretionary') return options.discretionary
  if (slug === 'savings') return options.savings
  throw new Error(`No default configured for category: "${slug}"`)
}

const REQUIRED_DEFAULT_SLUGS = ['necessities', 'discretionary', 'savings'] as const

export function buildDefaultAllocation(
  categories: Category[],
  options: DefaultAllocationOptions,
): { category: Category; parsed: ParsedBudgetValue }[] {
  const targetSlugs = new Set<string>(REQUIRED_DEFAULT_SLUGS)
  const targets = getTopLevelBudgetCategories(categories).filter((category) => targetSlugs.has(category.slug))
  const foundSlugs = new Set(targets.map((category) => category.slug))
  const missingSlugs = REQUIRED_DEFAULT_SLUGS.filter((slug) => !foundSlugs.has(slug))
  if (missingSlugs.length > 0) {
    throw new Error(`Missing required categories for --defaults: ${missingSlugs.join(', ')}`)
  }
  return targets.map((category) => ({
    category,
    parsed: parseBudgetValue(resolveDefaultValueForSlug(category.slug, options)),
  }))
}

export function applyDefaultAllocation(
  database: Database,
  categories: Category[],
  month: string,
  options: DefaultAllocationOptions,
): void {
  const allocation = buildDefaultAllocation(categories, options)
  const upsertAll = database.transaction(() => {
    for (const { category, parsed } of allocation) {
      upsertBudget(database, {
        categoryId: category.id,
        amount: parsed.amount,
        type: parsed.type,
        month,
        createdAt: new Date().toISOString(),
      })
    }
  })
  upsertAll()
  for (const { category, parsed } of allocation) {
    log.success(formatBudgetConfirmation(category.name, parsed, month))
  }
}
