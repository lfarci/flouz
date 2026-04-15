import { generateText, Output } from 'ai'
import type { Category, Transaction } from '@/types'
import { getModel, resolveModelName } from './client'
import { buildTransactionCategorizationPrompt } from './prompts'
import { TransactionCategorizationResultSchema } from './schemas'

interface CategorizationResult {
  categoryId: string
  confidence: number
  model: string
}

export async function categorizeTransaction(
  transaction: Transaction,
  categories: Category[]
): Promise<CategorizationResult> {
  const prompt = buildTransactionCategorizationPrompt(transaction, categories)
  const model = await getModel()

  const result = await generateText({
    model,
    output: Output.object({ schema: TransactionCategorizationResultSchema }),
    prompt,
  })

  const validCategoryIds = new Set(categories.map(category => category.id))
  if (!validCategoryIds.has(result.output.categoryId)) {
    throw new Error(`AI returned invalid categoryId: ${result.output.categoryId}`)
  }

  return {
    categoryId: result.output.categoryId,
    confidence: result.output.confidence,
    model: await resolveModelName(),
  }
}
