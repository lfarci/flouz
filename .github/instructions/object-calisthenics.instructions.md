---
applyTo: 'src/**/*.ts'
description: 'Object Calisthenics rules for TypeScript business domain code — enforces clean, maintainable, and robust code via 9 concrete constraints. Applies to src/ only; exempts test files, DTOs, and configuration objects.'
---

# Object Calisthenics Rules (TypeScript)

> ⚠️ Applies to business domain code in `src/`. Exemptions: test files (`*.test.ts`), plain data objects (transactions, categories as returned from DB queries), configuration interfaces.

## Rules

### 1. One Level of Indentation per Method
Extract nested logic into well-named helper functions.
```typescript
// BAD
function processTransactions(rows: Row[]) {
  for (const row of rows) {
    if (row.amount < 0) {
      if (!row.category_id) {
        // process uncategorized expense
      }
    }
  }
}

// GOOD
function processTransactions(rows: Row[]) {
  rows.filter(isUncategorizedExpense).forEach(processExpense)
}
function isUncategorizedExpense(row: Row): boolean {
  return row.amount < 0 && !row.category_id
}
```

### 2. No else — Use Early Returns
```typescript
// BAD
function getLabel(amount: number): string {
  if (amount < 0) {
    return 'expense'
  } else {
    return 'income'
  }
}

// GOOD — early return / guard clause
function getLabel(amount: number): string {
  if (amount < 0) return 'expense'
  return 'income'
}
```

### 3. No Abbreviations
- `tx` → `transaction`
- `cp` → `counterparty`
- `cat` → `category`
- `amt` → `amount`
- `dt` → `date`

### 4. Keep Functions Small
- Max ~20 lines per function
- Max ~10 functions per module
- If a module exceeds ~100 lines, split it

### 5. One Dot per Line (Law of Demeter)
```typescript
// BAD
const label = transaction.category.parent.name.toLowerCase()

// GOOD — expose what you need at the right level
const label = transaction.getCategoryLabel()
```

### 6. No Getters/Setters in Domain Objects
Use factory functions and readonly properties.
```typescript
// BAD
class Transaction {
  public categoryId: string
  setCategoryId(id: string) { this.categoryId = id }
}

// GOOD
interface Transaction { readonly categoryId: string | undefined }
function withCategory(t: Transaction, id: string): Transaction {
  return { ...t, categoryId: id }
}
```

## Exemptions
- Plain data interfaces returned from SQLite queries — public readonly properties are fine
- Test files — any style that makes tests readable
- Commander.js command options objects — configuration objects
