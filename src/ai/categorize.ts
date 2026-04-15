// eslint-disable-next-line sonarjs/deprecation -- generateObject Zod overload is deprecated in AI SDK; migration is tracked separately
import { generateObject } from 'ai'
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

  // eslint-disable-next-line sonarjs/deprecation -- see import comment above
  const result = await generateObject({
    model,
    schema: TransactionCategorizationResultSchema,
    prompt,
  })

  const validCategoryIds = new Set(categories.map(category => category.id))
  if (!validCategoryIds.has(result.object.categoryId)) {
    throw new Error(`AI returned invalid categoryId: ${result.object.categoryId}`)
  }

  return {
    categoryId: result.object.categoryId,
    confidence: result.object.confidence,
    model: await resolveModelName(),
  }
}
