import { mock, afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import type { Transaction, Category } from '@/types'
import { TransactionCategorizationResultSchema } from '@/ai/schemas'
import { initDb } from '@/db/schema'
import { seedCategories } from '@/db/categories/seed'
import { insertTransaction } from '@/db/transactions/mutations'
import { approveTransactionCategorySuggestion, upsertTransactionCategorySuggestion } from '@/db/transaction_category_suggestions/mutations'

const chatMock = mock(() => 'mock-chat-model')
const createOpenAIMock = mock(() => ({ chat: chatMock }))

const generateTextMock = mock(() =>
  Promise.resolve({
    output: {
      categoryId: '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f',
      confidence: 0.8,
    },
  }),
)

void mock.module('ai', () => ({
  generateText: generateTextMock,
  Output: { object: () => ({}) },
}))

void mock.module('@ai-sdk/openai', () => ({
  createOpenAI: createOpenAIMock,
}))

import { categorizeTransaction, MIN_FAST_PATH_APPROVALS } from '@/ai/categorize'

const originalAiModel = Bun.env.AI_MODEL
const originalAiBaseUrl = Bun.env.AI_BASE_URL
const originalGithubToken = Bun.env.GITHUB_TOKEN

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
  {
    id: VALID_CATEGORY_ID,
    name: 'Groceries',
    slug: 'groceries',
    parentId: null,
  },
]

beforeEach(() => {
  chatMock.mockReset()
  chatMock.mockReturnValue('mock-chat-model')
  createOpenAIMock.mockReset()
  createOpenAIMock.mockReturnValue({ chat: chatMock })
  generateTextMock.mockReset()
  generateTextMock.mockResolvedValue({
    output: { categoryId: VALID_CATEGORY_ID, confidence: 0.8 },
  })
  delete Bun.env.AI_MODEL
  delete Bun.env.AI_BASE_URL
  Bun.env.GITHUB_TOKEN = 'ghp_test_token'
})

afterEach(() => {
  if (originalAiModel !== undefined) Bun.env.AI_MODEL = originalAiModel
  else delete Bun.env.AI_MODEL
  if (originalAiBaseUrl !== undefined) Bun.env.AI_BASE_URL = originalAiBaseUrl
  else delete Bun.env.AI_BASE_URL
  if (originalGithubToken !== undefined) Bun.env.GITHUB_TOKEN = originalGithubToken
  else delete Bun.env.GITHUB_TOKEN
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
      output: {
        categoryId: 'aaaaaaaa-0000-0000-0000-000000000000',
        confidence: 0.8,
      },
    })

    await expect(categorizeTransaction(fakeTransaction, fakeCategories)).rejects.toThrow(
      'AI returned invalid categoryId: aaaaaaaa-0000-0000-0000-000000000000',
    )
  })

  it('throws when generateText rejects (simulating an AI error)', async () => {
    generateTextMock.mockRejectedValue(new Error('AI service unavailable'))

    await expect(categorizeTransaction(fakeTransaction, fakeCategories)).rejects.toThrow('AI service unavailable')
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

describe('categorizeTransaction fast-path', () => {
  function buildDbWithConsensus(): Database {
    const db = new Database(':memory:')
    initDb(db)
    seedCategories(db)

    for (let i = 1; i <= MIN_FAST_PATH_APPROVALS; i++) {
      insertTransaction(db, {
        date: `2026-01-0${i}`,
        amount: -10,
        counterparty: 'ACME Shop',
        currency: 'EUR',
        importedAt: new Date().toISOString(),
      })
      const row = db.prepare('SELECT id FROM transactions ORDER BY id DESC LIMIT 1').get() as { id: number }
      upsertTransactionCategorySuggestion(db, {
        transactionId: row.id,
        categoryId: VALID_CATEGORY_ID,
        confidence: 0.9,
        model: 'test-model',
      })
      approveTransactionCategorySuggestion(db, row.id)
    }

    return db
  }

  function buildEmptyDb(): Database {
    const db = new Database(':memory:')
    initDb(db)
    seedCategories(db)
    return db
  }

  it('returns fast-path result with model = fast-path when consensus exists', async () => {
    const db = buildDbWithConsensus()
    const result = await categorizeTransaction(fakeTransaction, fakeCategories, [], db)

    expect(result.model).toBe('fast-path')
    expect(result.confidence).toBe(1.0)
    expect(result.categoryId).toBe(VALID_CATEGORY_ID)
  })

  it('does not call generateText when consensus exists', async () => {
    const db = buildDbWithConsensus()
    await categorizeTransaction(fakeTransaction, fakeCategories, [], db)

    expect(generateTextMock).not.toHaveBeenCalled()
  })

  it('calls generateText when consensus is absent', async () => {
    const db = buildEmptyDb()
    await categorizeTransaction(fakeTransaction, fakeCategories, [], db)

    expect(generateTextMock).toHaveBeenCalledTimes(1)
  })

  it('calls generateText when no db is provided', async () => {
    await categorizeTransaction(fakeTransaction, fakeCategories)

    expect(generateTextMock).toHaveBeenCalledTimes(1)
  })
})
