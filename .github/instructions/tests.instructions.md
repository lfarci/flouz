---
description: "Guidelines for writing TypeScript tests with bun test. Applies to all test files in the project."
applyTo: '**/*.test.ts'
---

# Testing Guidelines (bun test)

## Stack
- **Runner:** `bun test` — Jest-compatible API, zero extra dependencies
- **DB:** Always `new Database(':memory:')` — never create files on disk in tests
- **AI mocking:** `mock.module('ai', ...)` from `bun:test` — no real API calls, no cost
- **Fixtures:** `__fixtures__/` directory next to each test file

## Standards

- Write tests for all new features and bug fixes
- Ensure tests cover edge cases and error handling
- **NEVER change the original code to make it easier to test** — write tests that cover the code as it is
- Never use `null`, always use `undefined` for optional values
- Do not add comments unless absolutely necessary — test names should be self-explanatory

## Test Structure (AAA Pattern)

```typescript
import { describe, it, expect, beforeEach } from 'bun:test'

describe('parseAmount', () => {
  it('converts comma-decimal French format to dot-decimal number', () => {
    // Arrange
    const input = '1.234,56'

    // Act
    const result = parseAmount(input)

    // Assert
    expect(result).toBe(1234.56)
  })

  it('returns undefined when input is empty string', () => {
    expect(parseAmount('')).toBeUndefined()
  })
})
```

## Naming Convention

Use descriptive names that express behavior:
```
✅  'returns undefined when date column is missing'
✅  'inserts transaction with IGNORE on duplicate'
✅  'strips BANCONTACT prefix from counterparty'
❌  'test1'
❌  'works correctly'
```

## In-Memory SQLite Pattern

```typescript
import { Database } from 'bun:sqlite'
import { createSchema } from '../db/schema'

describe('queries', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    createSchema(db)
  })

  it('inserts and retrieves a transaction', () => {
    insertTransaction(db, { date: '2026-01-15', amount: -42.5, counterparty: 'Delhaize' })
    const rows = getTransactions(db, {})
    expect(rows).toHaveLength(1)
    expect(rows[0].counterparty).toBe('Delhaize')
  })
})
```

## AI Mocking Pattern

```typescript
import { mock } from 'bun:test'

mock.module('ai', () => ({
  generateObject: async () => ({
    object: { categoryId: 'uuid-groceries', confidence: 0.9, reasoning: 'supermarket' }
  })
}))
```

## Fixture Files

Place sample CSV files or JSON fixtures in `__fixtures__/` next to the test:
```
src/parsers/__fixtures__/bank-sample.csv
src/parsers/__fixtures__/bank-metadata-only.csv
```
