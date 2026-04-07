# Transactions Table

Stores imported bank transactions plus manual and AI categorization state.

## Columns

- `date`, `amount`, `counterparty`: core transaction fields and the current duplicate detection key
- `source_ref`: source-system reference kept as metadata only; it does not participate in the duplicate detection key
- `category_id`: user-confirmed category
- `ai_category_id`, `ai_confidence`, `ai_reasoning`: AI suggestion data
- `source_file`, `imported_at`: import audit metadata

## Duplicate Detection Rule

Duplicate imports are currently identified by the business key `(date, amount, counterparty)`.

This means:

- changing `source_file`, `imported_at`, or `source_ref` does not make a row unique
- changing any of `date`, `amount`, or `counterparty` does make it a separate row

## Queries

- `getTransactions`: lists transactions with optional filters
- `getUncategorized`: returns rows with no user or AI category

## Mutations

- `insertTransaction`: inserts one imported transaction
- `updateCategory`: sets the user category only

## Seed

- None