# Transactions Table

Stores imported bank transactions and user categorization state.

## Columns

- `date`, `amount`, `counterparty`: core transaction identity fields
- `hash`: required SHA-256 hash of `(date, amount, counterparty, note)` used as preparation for later duplicate-review workflows
- `account_id`: optional foreign key to `accounts.id`
- `category_id`: user-confirmed category
- `source_file`, `imported_at`: import audit metadata

## Hash Strategy

The table persists a `hash` for every row.

- new rows compute the hash during insertion
- the persisted schema requires the hash column
- `note` is part of the hash input when present
- the hash does not change current duplicate-handling behavior yet

## Queries

- `getTransactions`: lists transactions with optional filters
- `getUncategorized`: returns rows with no user category

## Mutations

- `insertTransaction`: inserts one imported transaction
- `updateCategory`: sets the user category only

## Seed

- None
