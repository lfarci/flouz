# Database

flouz uses SQLite via `bun:sqlite` directly — no ORM. All queries use prepared statements.

## Module Layout

Database code is grouped by table:

```text
src/db/
  categories/
    schema.ts
    seed.ts
    queries.ts
  transactions/
    schema.ts
    queries.ts
    mutations.ts
  schema.ts
```

- `schema.ts` inside a table directory defines `CREATE TABLE` logic for that table.
- `seed.ts` is only used for tables that need bootstrap data.
- `queries.ts` contains read-only `SELECT` helpers.
- `mutations.ts` contains write helpers such as `INSERT` and `UPDATE`.
- `src/db/schema.ts` coordinates cross-table initialization.

## Schema

```sql
CREATE TABLE categories (
  id        TEXT PRIMARY KEY,   -- UUID, stable across imports
  name      TEXT NOT NULL,      -- display name e.g. "Food & Drink"
  slug      TEXT NOT NULL,      -- kebab-case e.g. "food-and-drink"
  parent_id TEXT REFERENCES categories(id)  -- NULL for root nodes
);

CREATE TABLE transactions (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  date               TEXT NOT NULL,          -- yyyy-MM-dd
  amount             REAL NOT NULL,          -- signed Euros, dot decimal (negative = debit)
  counterparty       TEXT NOT NULL,          -- cleaned merchant / sender name
  hash               TEXT NOT NULL,          -- SHA-256 of (date, amount, counterparty, note)
  counterparty_iban  TEXT,                   -- IBAN when available in the source file
  currency           TEXT DEFAULT 'EUR',
  account            TEXT,                   -- source account IBAN
  category_id        TEXT REFERENCES categories(id),    -- user-assigned category
  note               TEXT,                   -- raw Communications field from CSV
  source_file        TEXT,                   -- original CSV filename
  imported_at        TEXT NOT NULL           -- ISO 8601 timestamp of import
);
```

## Category Hierarchy

Categories form a 3-level tree:

```
Root (L1)
├── Necessities
│   ├── Housing
│   │   ├── Rent
│   │   └── Utilities
│   └── Groceries
├── Savings
│   ├── Emergency Fund
│   └── Investments
└── Discretionary
    ├── Food & Drink
    │   ├── Restaurants
    │   └── Coffee
    └── Entertainment
        ├── Streaming
        └── Events
```

- **L1 roots**: `Necessities`, `Savings`, `Discretionary` — `parent_id IS NULL`
- **L2 nodes**: broad sub-groups — `parent_id` points to an L1 row
- **L3 leaves**: specific categories used on transactions — `parent_id` points to an L2 row

Transactions are assigned to **L3 leaves** only.

## Key Rules

### Transaction Hash Strategy

Each transaction row stores a `hash` derived from `(date, amount, counterparty, note)`.

- `source_file` and `imported_at` remain metadata and do not affect the hash
- `note` is part of the hash input and distinguishes otherwise identical transactions
- the hash is required in the persisted schema
- new rows compute the hash during insertion

This phase only stores the hash. It does not yet change duplicate-handling behavior or hide duplicate rows from queries.

Hash computation is deterministic and uses SHA-256 over a JSON-encoded array to avoid delimiter-collision edge cases:

```ts
const hasher = new Bun.CryptoHasher('sha256')
hasher.update(JSON.stringify([date, amount, counterparty, note ?? null]))
const hash = hasher.digest('hex')
```

## Usage Pattern

Always use prepared statements — never string-interpolate user data into queries:

```ts
import { Database } from 'bun:sqlite'
import { insertTransaction } from '@/db/transactions/mutations'

const db = new Database(`${process.env.HOME}/.config/flouz/flouz.db`)

insertTransaction(db, {
  date: '2026-01-27',
  amount: -12.5,
  counterparty: 'Some Merchant',
  currency: 'EUR',
  importedAt: new Date().toISOString(),
})
```
