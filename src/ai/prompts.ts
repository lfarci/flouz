import type { CategorizationExample, Category, Transaction } from '@/types'

function formatCategoryList(categories: Category[]): string {
  return categories.map((category) => `- slug: ${category.slug} | name: ${category.name}`).join('\n')
}

function formatTransactionDetails(transaction: Transaction): string {
  const lines = [
    `Date: ${transaction.date}`,
    `Amount: ${transaction.amount} ${transaction.currency}`,
    `Counterparty: ${transaction.counterparty}`,
  ]
  if (transaction.bankCommunication) {
    lines.push(`Bank communication: ${transaction.bankCommunication}`)
  }
  return lines.join('\n')
}

function formatExamples(examples: CategorizationExample[]): string {
  return examples
    .map(
      (example) =>
        `- Counterparty: ${example.counterparty} | Date: ${example.date} | Amount: ${example.amount} → Category: ${example.categoryName} (${example.categorySlug})`,
    )
    .join('\n')
}

export function buildTransactionCategorizationPrompt(
  transaction: Transaction,
  categories: Category[],
  examples: CategorizationExample[] = [],
): string {
  const examplesSection =
    examples.length > 0
      ? `## Examples\n\nThese are past transactions this user has already categorized:\n\n${formatExamples(examples)}\n\n`
      : ''

  return `You are a personal finance assistant. Categorize the following bank transaction by selecting the most appropriate category from the list below.

## Transaction

${formatTransactionDetails(transaction)}

## Available Categories

${formatCategoryList(categories)}

${examplesSection}## Instructions

Return a JSON object with exactly three fields:
- "categorySlug": the slug of the most appropriate category from the list above
- "confidence": a number between 0 and 1 indicating how confident you are in the categorization
- "reasoning": a short sentence (max 200 characters) explaining why this category was chosen

Only return a categorySlug that appears in the list above. Do not invent new slugs.`
}
