import { z } from 'zod'

export const TransactionCategorizationResultSchema = z.object({
  categorySlug: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(200),
})

export type TransactionCategorizationResult = z.infer<typeof TransactionCategorizationResultSchema>
