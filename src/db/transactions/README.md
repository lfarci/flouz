# Transactions Table

Stores imported bank transactions plus manual and AI categorization state.

## Columns

- `date`, `amount`, `counterparty`: core transaction fields and dedup key
- `category_id`: user-confirmed category
- `ai_category_id`, `ai_confidence`, `ai_reasoning`: AI suggestion data
- `source_file`, `imported_at`: import audit metadata

## Queries

- `getTransactions`: lists transactions with optional filters
- `getUncategorized`: returns rows with no user or AI category

## Mutations

- `insertTransaction`: inserts one imported transaction
- `updateCategory`: sets the user category only

## Seed

- None