# transaction_category_suggestions

Stores AI-generated category suggestions for transactions.

## Purpose

When the AI categorization feature runs, it writes one row per transaction here instead of directly modifying `transactions.category_id`. This preserves the user's explicit choices while still surfacing AI suggestions.

**Invariant**: this table **never** overwrites `transactions.category_id`. Only the user (through an explicit confirm/accept command) promotes a suggestion into `category_id`.

## Columns

| Column           | Type    | Description                                                  |
| ---------------- | ------- | ------------------------------------------------------------ |
| `transaction_id` | INTEGER | FK → `transactions(id)`, PK; one suggestion per transaction  |
| `category_id`    | TEXT    | FK → `categories(id)`; the suggested category (L3 leaf UUID) |
| `confidence`     | REAL    | Model confidence score in [0, 1]                             |
| `model`          | TEXT    | Model identifier used to produce this suggestion             |
| `suggested_at`   | TEXT    | ISO 8601 timestamp when the suggestion was created           |

## Queries (`queries.ts`)

- `getSuggestedTransactionIds(db)` — returns all `transaction_id` values that already have a suggestion, used to skip re-categorizing already-processed transactions.

## Mutations (`mutations.ts`)

- `upsertTransactionCategorySuggestion(db, suggestion)` — inserts or updates the suggestion for a given `transactionId`. Uses `ON CONFLICT … DO UPDATE` so re-running categorization refreshes stale suggestions rather than failing.

## Seeding

This table has no seed data.
