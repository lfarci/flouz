import { describe, expect, it } from 'bun:test'
import type { CategorizationExample, Category, Transaction } from '@/types'
import { buildTransactionCategorizationPrompt } from './prompts'

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
  { id: 'cat-001', name: 'Groceries', slug: 'groceries', parentId: null },
  { id: 'cat-002', name: 'Transport', slug: 'transport', parentId: null },
]

const fakeExample: CategorizationExample = {
  counterparty: 'Test Merchant',
  amount: -20,
  date: '2026-01-10',
  categoryId: 'cat-001',
  categoryName: 'Groceries',
  categorySlug: 'groceries',
}

describe('buildTransactionCategorizationPrompt', () => {
  describe('without examples', () => {
    it('does not include an Examples section', () => {
      const prompt = buildTransactionCategorizationPrompt(fakeTransaction, fakeCategories)
      expect(prompt).not.toContain('## Examples')
    })

    it('includes the transaction counterparty', () => {
      const prompt = buildTransactionCategorizationPrompt(fakeTransaction, fakeCategories)
      expect(prompt).toContain('ACME Shop')
    })

    it('includes the available categories section', () => {
      const prompt = buildTransactionCategorizationPrompt(fakeTransaction, fakeCategories)
      expect(prompt).toContain('## Available Categories')
      expect(prompt).toContain('groceries')
      expect(prompt).toContain('transport')
    })

    it('includes the Instructions section', () => {
      const prompt = buildTransactionCategorizationPrompt(fakeTransaction, fakeCategories)
      expect(prompt).toContain('## Instructions')
    })
  })

  describe('reasoning instruction', () => {
    it('includes the reasoning instruction in the Instructions section', () => {
      const prompt = buildTransactionCategorizationPrompt(fakeTransaction, fakeCategories)
      expect(prompt).toContain('"reasoning"')
    })
  })

  describe('with examples', () => {
    it('includes an Examples section', () => {
      const prompt = buildTransactionCategorizationPrompt(fakeTransaction, fakeCategories, [fakeExample])
      expect(prompt).toContain('## Examples')
    })

    it('places the Examples section before the Instructions section', () => {
      const prompt = buildTransactionCategorizationPrompt(fakeTransaction, fakeCategories, [fakeExample])
      const examplesIndex = prompt.indexOf('## Examples')
      const instructionsIndex = prompt.indexOf('## Instructions')
      expect(examplesIndex).toBeLessThan(instructionsIndex)
    })

    it('renders the example counterparty in the prompt', () => {
      const prompt = buildTransactionCategorizationPrompt(fakeTransaction, fakeCategories, [fakeExample])
      expect(prompt).toContain('Test Merchant')
    })

    it('renders the example category name in the prompt', () => {
      const prompt = buildTransactionCategorizationPrompt(fakeTransaction, fakeCategories, [fakeExample])
      expect(prompt).toContain('Groceries')
    })

    it('renders the example date in the prompt', () => {
      const prompt = buildTransactionCategorizationPrompt(fakeTransaction, fakeCategories, [fakeExample])
      expect(prompt).toContain('2026-01-10')
    })
  })
})
