# transaction_category_suggestions

Stores AI-generated category suggestions for transactions.

## Purpose

When the AI categorization feature runs, it writes one row per transaction here instead of directly modifying `transactions.category_id`. This preserves the user's explicit choices while still surfacing AI suggestions.

**Invariant**: this table **never** overwrites `transactions.category_id`. Only the user (through an explicit `suggestions apply` command) promotes a suggestion into `category_id`.

## Columns

| Column           | Type    | Description                                                    |
|------------------|---------|----------------------------------------------------------------|
| `transaction_id` | INTEGER | FK → `transactions(id)`, PK; one suggestion per transaction    |
| `category_id`    | TEXT    | FK → `categories(id)`; the suggested category (L3 leaf UUID)  |
| `confidence`     | REAL    | Model confidence score in [0, 1]                              |
| `model`          | TEXT    | Model identifier used to produce this suggestion               |
| `suggested_at`   | TEXT    | ISO 8601 timestamp when the suggestion was created             |
| `status`         | TEXT    | Lifecycle state: `pending`, `approved`, or `applied`           |
| `reviewed_at`    | TEXT    | ISO 8601 timestamp set when the suggestion is approved; NULL otherwise |
| `applied_at`     | TEXT    | ISO 8601 timestamp set when the suggestion is applied; NULL otherwise  |

## Lifecycle

Suggestions move through three explicit states:

```
pending  →  approved  →  applied
   ↓              ↓
(deleted)     (deleted)   ← rejection deletes the row
```

- **`pending`** — initial state after AI categorization. Re-running `transactions categorize` on the same transaction resets any existing suggestion back to `pending`.
- **`approved`** — the user has reviewed and accepted the suggested category. `reviewed_at` is set. `transactions.category_id` is still unchanged.
- **`applied`** — the approved category has been copied into `transactions.category_id`. `applied_at` is set. The row is retained for audit purposes.

**Rejection** deletes the suggestion row entirely, re-opening that transaction to future `transactions categorize` runs. Only `pending` and `approved` rows can be rejected; `applied` rows cannot be deleted.

## Queries (`queries.ts`)

- `getSuggestedTransactionIds(db)` — returns all `transaction_id` values that already have a suggestion, used to skip re-categorizing already-processed transactions.
- `getTransactionCategorySuggestions(db, filters?)` — returns joined suggestion + transaction + category rows, filtered by `status`, `from`, `to`, `search`, and `limit`.
- `getApprovedSuggestionTransactionIds(db, filters?)` — returns `transaction_id` values for `approved` suggestions where `transactions.category_id IS NULL`. Used by the apply batch.

## Mutations (`mutations.ts`)

- `upsertTransactionCategorySuggestion(db, suggestion)` — inserts or updates the suggestion for a given `transactionId`. Always resets `status` to `pending` and clears `reviewed_at` and `applied_at`.
- `approveTransactionCategorySuggestion(db, transactionId)` — transitions `pending → approved` and sets `reviewed_at`. No-op on `approved` or `applied` rows.
- `deleteTransactionCategorySuggestion(db, transactionId)` — deletes a `pending` or `approved` suggestion row. Does **not** delete `applied` rows.
- `markApprovedSuggestionApplied(db, transactionId)` — transitions `approved → applied` and sets `applied_at`. No-op on non-`approved` rows.

## Apply (`apply.ts`)

- `applyApprovedCategorySuggestions(db, filters?)` — batch function that wraps the full apply operation in a SQLite transaction. For each approved suggestion, it updates `transactions.category_id` only where it is still `NULL`, then marks the suggestion `applied`. Returns `{ applied, skipped, firstError? }`.

## Seeding

This table has no seed data.
