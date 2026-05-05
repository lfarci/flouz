import { isCancel, log, select, text } from '@clack/prompts'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { openDatabase } from '@/db/schema'
import { getCategories } from '@/db/categories/queries'
import { upsertBudget } from '@/db/budgets/mutations'
import type { Category } from '@/types'
import { currentMonth, validateMonth } from './month'
import {
  type ParsedBudgetValue,
  parseBudgetValue,
  findTopLevelCategory,
  getTopLevelBudgetCategories,
  formatBudgetConfirmation,
} from './budget-value'
import {
  DEFAULT_NECESSITIES,
  DEFAULT_DISCRETIONARY,
  DEFAULT_SAVINGS,
  type DefaultAllocationOptions,
  applyDefaultAllocation,
} from './budget-defaults'

interface SetBudgetOptions {
  month?: string
  db: string
  defaults?: boolean
  necessities: string
  discretionary: string
  savings: string
}

type SetBudgetMode = 'direct' | 'defaults' | 'custom-allocation'

const ALLOCATION_OPTION_NAMES = ['necessities', 'discretionary', 'savings'] as const

type AllocationOptionName = (typeof ALLOCATION_OPTION_NAMES)[number]

async function promptCategorySelection(categories: Category[]): Promise<Category | symbol> {
  return await select({
    message: 'Select a category',
    options: getTopLevelBudgetCategories(categories).map((category) => ({
      value: category,
      label: category.name,
    })),
  })
}

function validateAmountInput(value: string | undefined): string | undefined {
  if (!value) return 'Amount is required'
  try {
    parseBudgetValue(value)
    return undefined
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid amount'
  }
}

async function promptBudgetAmount(): Promise<string | symbol> {
  return await text({
    message: 'Budget amount (e.g. 500 or 30%)',
    placeholder: '0',
    validate: validateAmountInput,
  })
}

function exitWithValidationError(message: string): never {
  log.error(message)
  process.exit(1)
}

function wasAllocationOptionProvided(command: Command, optionName: AllocationOptionName): boolean {
  const source = command.getOptionValueSource(optionName)
  return source !== undefined && source !== 'default'
}

function hasAllocationOverrides(command: Command): boolean {
  return ALLOCATION_OPTION_NAMES.some((optionName) => wasAllocationOptionProvided(command, optionName))
}

function resolveBudgetMode(
  categorySlug: string | undefined,
  amountValue: string | undefined,
  options: SetBudgetOptions,
  command: Command,
): SetBudgetMode {
  const hasPositionalArguments = categorySlug !== undefined || amountValue !== undefined
  const hasCustomAllocationOverrides = hasAllocationOverrides(command)

  if (options.defaults) {
    if (hasPositionalArguments) {
      exitWithValidationError('--defaults cannot be combined with positional [category] or [amount] arguments.')
    }
    if (hasCustomAllocationOverrides) {
      exitWithValidationError('--defaults cannot be combined with --necessities, --discretionary, or --savings.')
    }
    return 'defaults'
  }

  if (hasCustomAllocationOverrides) {
    if (hasPositionalArguments) {
      exitWithValidationError(
        '--necessities, --discretionary, and --savings cannot be combined with positional [category] or [amount] arguments.',
      )
    }
    return 'custom-allocation'
  }

  return 'direct'
}

function resolveAllocationOptions(options: SetBudgetOptions): DefaultAllocationOptions {
  return {
    necessities: options.necessities,
    discretionary: options.discretionary,
    savings: options.savings,
  }
}

async function resolveCategory(categories: Category[], slug: string | undefined): Promise<Category | null> {
  if (slug !== undefined) return findTopLevelCategory(categories, slug)

  const selection = await promptCategorySelection(categories)
  if (isCancel(selection)) {
    log.warn('Cancelled.')
    return null
  }
  return selection
}

async function resolveParsedAmount(amountValue: string | undefined): Promise<ParsedBudgetValue | null> {
  if (amountValue !== undefined) return parseBudgetValue(amountValue)

  const response = await promptBudgetAmount()
  if (isCancel(response)) {
    log.warn('Cancelled.')
    return null
  }
  return parseBudgetValue(response)
}

async function setAction(
  categorySlug: string | undefined,
  amountValue: string | undefined,
  options: SetBudgetOptions,
  command: Command,
): Promise<void> {
  const month = options.month ?? currentMonth()
  if (!validateMonth(month)) {
    log.error(`Invalid month format: "${month}". Use YYYY-MM.`)
    process.exit(1)
  }

  const mode = resolveBudgetMode(categorySlug, amountValue, options, command)

  const database = openDatabase(resolve(options.db))
  try {
    const categories = getCategories(database)

    if (mode !== 'direct') {
      applyDefaultAllocation(database, categories, month, resolveAllocationOptions(options))
      return
    }

    const category = await resolveCategory(categories, categorySlug)
    if (category === null) return

    const parsed = await resolveParsedAmount(amountValue)
    if (parsed === null) return

    upsertBudget(database, {
      categoryId: category.id,
      amount: parsed.amount,
      type: parsed.type,
      month,
      createdAt: new Date().toISOString(),
    })
    log.success(formatBudgetConfirmation(category.name, parsed, month))
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error))
    database.close()
    process.exit(1)
  } finally {
    database.close()
  }
}

export function createSetBudgetCommand(defaultDb: string): Command {
  return new Command('set')
    .description('Set a monthly budget for a top-level category')
    .argument('[category]', 'category slug (e.g. necessities, discretionary, savings) — prompts if omitted')
    .argument('[amount]', 'budget amount in EUR (e.g. 2000) or percentage of income (e.g. 60%) — prompts if omitted')
    .option('-m, --month <YYYY-MM>', 'target month (defaults to current)')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .option('--defaults', 'apply a default allocation across necessities, discretionary, and savings')
    .option('--necessities <value>', 'necessities allocation for --defaults (e.g. 30%)', DEFAULT_NECESSITIES)
    .option('--discretionary <value>', 'discretionary allocation for --defaults (e.g. 30%)', DEFAULT_DISCRETIONARY)
    .option('--savings <value>', 'savings allocation for --defaults (e.g. 20%)', DEFAULT_SAVINGS)
    .action(setAction)
}
