# Budgets Tables

Stores monthly budget targets and income data for spending tracking.

## Tables

### `budgets`

- `id`: integer primary key
- `category_id`: foreign key to `categories.id` (top-level only)
- `amount`: budget amount (EUR for fixed, percentage for percent type)
- `type`: `'fixed'` or `'percent'` (CHECK constraint enforced)
- `month`: target month in `YYYY-MM` format
- `created_at`: insertion timestamp

Unique constraint on `(category_id, month)` — one budget per category per month.

### `monthly_income`

- `id`: integer primary key
- `month`: unique month in `YYYY-MM` format
- `amount`: manually set monthly income in EUR
- `created_at`: insertion timestamp

## Queries

- `getBudgetsForMonth`: lists all budgets for a given month
- `getBudgetForCategory`: resolves one budget by category and month
- `getMonthlyIncome`: returns manually stored income for a month
- `getIncomeForMonth`: sums income transactions for a month
- `resolveMonthlyTotal`: resolves income using fallback chain (stored → detected → previous month)
- `previousMonth`: computes the preceding `YYYY-MM` string

## Mutations

- `upsertBudget`: inserts or updates a budget for a category/month
- `upsertMonthlyIncome`: inserts or updates the income total for a month

## Seed

- None
