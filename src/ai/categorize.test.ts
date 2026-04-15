import { mock, beforeEach, describe, expect, it } from 'bun:test'
import type { Transaction, Category } from '@/types'
import { TransactionCategorizationResultSchema } from '@/ai/schemas'

const generateTextMock = mock(() => Promise.resolve({
  output: {
    categoryId: '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f',
    confidence: 0.8,
  },
}))

void mock.module('ai', () => ({
  generateText: generateTextMock,
  Output: { object: () => ({}) },
}))

void mock.module('@/ai/client', () => ({
  getModel: () => 'mock-model',
  resolveModelName: () => 'openai/gpt-4o-mini',
}))

import { categorizeTransaction } from '@/ai/categorize'

const VALID_CATEGORY_ID = '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f'

const fakeTransaction: Transaction = {
  id: 1,
  date: '2026-01-15',
  amount: -42.5,
  counterparty: 'ACME Shop',
  hash: 'abc123',
  currency: 'EUR',
  importedAt: new Date().toISOString(),
}

const fakeCategories: Category[] = [
  { id: VALID_CATEGORY_ID, name: 'Groceries', slug: 'groceries', parentId: null },
]

beforeEach(() => {
  generateTextMock.mockReset()
  generateTextMock.mockResolvedValue({
    output: { categoryId: VALID_CATEGORY_ID, confidence: 0.8 },
  })
})

describe('categorizeTransaction', () => {
  it('returns categoryId, confidence, and model on a valid AI response', async () => {
    const result = await categorizeTransaction(fakeTransaction, fakeCategories)

    expect(result.categoryId).toBe(VALID_CATEGORY_ID)
    expect(result.confidence).toBe(0.8)
    expect(typeof result.model).toBe('string')
  })

  it('throws when the returned categoryId is not in the provided categories list', async () => {
    generateTextMock.mockResolvedValue({
      output: { categoryId: 'aaaaaaaa-0000-0000-0000-000000000000', confidence: 0.8 },
    })

    await expect(
      categorizeTransaction(fakeTransaction, fakeCategories)
    ).rejects.toThrow('AI returned invalid categoryId: aaaaaaaa-0000-0000-0000-000000000000')
  })

  it('throws when generateText rejects (simulating an AI error)', async () => {
    generateTextMock.mockRejectedValue(new Error('AI service unavailable'))

    await expect(
      categorizeTransaction(fakeTransaction, fakeCategories)
    ).rejects.toThrow('AI service unavailable')
  })
})

describe('TransactionCategorizationResultSchema', () => {
  it('rejects confidence above 1', () => {
    const result = TransactionCategorizationResultSchema.safeParse({
      categoryId: VALID_CATEGORY_ID,
      confidence: 1.5,
    })

    expect(result.success).toBe(false)
  })

  it('rejects confidence below 0', () => {
    const result = TransactionCategorizationResultSchema.safeParse({
      categoryId: VALID_CATEGORY_ID,
      confidence: -0.1,
    })

    expect(result.success).toBe(false)
  })

  it('rejects an empty string categoryId', () => {
    const result = TransactionCategorizationResultSchema.safeParse({
      categoryId: '',
      confidence: 0.8,
    })

    expect(result.success).toBe(false)
  })

  it('accepts a category ID string and confidence in [0,1]', () => {
    const result = TransactionCategorizationResultSchema.safeParse({
      categoryId: VALID_CATEGORY_ID,
      confidence: 0.8,
    })

    expect(result.success).toBe(true)
  })
})
