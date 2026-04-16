import type { SuggestionFilters } from '@/types'

export function parseLimit(limit: string | undefined): number | undefined {
  if (limit === undefined) return undefined
  const parsed = Number.parseInt(limit, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid limit: ${limit}. Use a positive integer.`)
  }
  return parsed
}

interface BaseFilterOptions {
  from?: string
  to?: string
  search?: string
  limit?: string
}

export function toBaseFilters(options: BaseFilterOptions): Pick<SuggestionFilters, 'from' | 'to' | 'search' | 'limit'> {
  return {
    from: options.from,
    to: options.to,
    search: options.search,
    limit: parseLimit(options.limit),
  }
}
