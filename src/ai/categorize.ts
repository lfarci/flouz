import { generateText, Output } from 'ai'
import type { Database } from 'bun:sqlite'
import type { CategorizationExample, Category, Transaction } from '@/types'
import { getCounterpartyCategoryConsensus } from '@/db/transaction_category_suggestions/queries'
import { getModel, resolveModelName } from './client'
import { buildTransactionCategorizationPrompt } from './prompts'
import { TransactionCategorizationResultSchema } from './schemas'

export const MIN_FAST_PATH_APPROVALS = 3

export interface CategorizationResult {
  categoryId: string
  confidence: number
  model: string
  reasoning: string
}

function buildFastPathResult(categoryId: string): CategorizationResult {
  return {
    categoryId,
    confidence: 1.0,
    model: 'fast-path',
    reasoning: 'Counterparty consensus from approved suggestions.',
  }
}

export async function categorizeTransaction(
  transaction: Transaction,
  categories: Category[],
  examples: CategorizationExample[] = [],
  db?: Database,
): Promise<CategorizationResult> {
  if (db !== undefined) {
    const consensus = getCounterpartyCategoryConsensus(db, transaction.counterparty, MIN_FAST_PATH_APPROVALS)
    if (consensus !== null) {
      return buildFastPathResult(consensus.categoryId)
    }
  }

  const prompt = buildTransactionCategorizationPrompt(transaction, categories, examples)
  const model = await getModel()

  const result = await generateText({
    model,
    output: Output.object({ schema: TransactionCategorizationResultSchema }),
    prompt,
  })

  const categoryIdBySlug = new Map(categories.map((category) => [category.slug, category.id]))
  const categoryId = categoryIdBySlug.get(result.output.categorySlug)
  if (categoryId === undefined) {
    throw new Error(`AI returned invalid categorySlug: ${result.output.categorySlug}`)
  }

  return {
    categoryId,
    confidence: result.output.confidence,
    model: await resolveModelName(),
    reasoning: result.output.reasoning,
  }
}
