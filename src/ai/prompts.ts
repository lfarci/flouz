import type { Category, Transaction } from '@/types'

function formatCategoryList(categories: Category[]): string {
  return categories
    .map((category) => `- id: ${category.id} | slug: ${category.slug} | name: ${category.name}`)
    .join('\n')
}

function formatTransactionDetails(transaction: Transaction): string {
  const lines = [
    `Date: ${transaction.date}`,
    `Amount: ${transaction.amount} ${transaction.currency}`,
    `Counterparty: ${transaction.counterparty}`,
  ]
  if (transaction.note) {
    lines.push(`Note: ${transaction.note}`)
  }
  return lines.join('\n')
}

export function buildTransactionCategorizationPrompt(transaction: Transaction, categories: Category[]): string {
  return `You are a personal finance assistant. Categorize the following bank transaction by selecting the most appropriate category from the list below.

## Transaction

${formatTransactionDetails(transaction)}

## Available Categories

${formatCategoryList(categories)}

## Instructions

Return a JSON object with exactly two fields:
- "categoryId": the UUID of the most appropriate category from the list above
- "confidence": a number between 0 and 1 indicating how confident you are in the categorization

Only return a categoryId that appears in the list above. Do not invent new IDs.`
}
