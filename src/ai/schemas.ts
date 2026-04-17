import { z } from 'zod'

export const TransactionCategorizationResultSchema = z.object({
  // Use z.string() instead of z.string().uuid() because the category IDs in the
  // data file are hand-crafted and do not all conform to RFC 4122 variant bits.
  // UUID membership is validated separately against the known categories list.
  categoryId: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(200).optional(),
})

export type TransactionCategorizationResult = z.infer<typeof TransactionCategorizationResultSchema>
