# Database

flouz uses SQLite via `bun:sqlite` directly — no ORM. All queries use prepared statements.

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
  counterparty_iban  TEXT,                   -- IBAN when available in the source file
  currency           TEXT DEFAULT 'EUR',
  account            TEXT,                   -- source account IBAN
  source_ref         TEXT,                   -- "extract:transaction" ref for dedup
  category_id        TEXT REFERENCES categories(id),    -- user-assigned category
  ai_category_id     TEXT REFERENCES categories(id),    -- AI suggestion only, never overwrites category_id
  ai_confidence      REAL,                   -- 0.0–1.0
  ai_reasoning       TEXT,                   -- short explanation from the AI
  note               TEXT,                   -- raw Communications field from CSV
  source_file        TEXT,                   -- original CSV filename
  imported_at        TEXT NOT NULL,          -- ISO 8601 timestamp of import
  UNIQUE(date, amount, counterparty)         -- dedup key
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

### `ai_category_id` never overwrites `category_id`

The `category_id` column is user-controlled. The AI writes only to `ai_category_id`. Promoting an AI suggestion to a confirmed category is an explicit user action.

```ts
// Correct — update only the AI columns
db.prepare(`
  UPDATE transactions
  SET ai_category_id = ?, ai_confidence = ?, ai_reasoning = ?
  WHERE id = ?
`).run(categoryId, confidence, reasoning, txId);

// Never do this automatically
// UPDATE transactions SET category_id = ai_category_id WHERE …
```

### Dedup Strategy

The `UNIQUE(date, amount, counterparty)` constraint prevents duplicate imports. Use `INSERT OR IGNORE` so re-importing a CSV is always safe:

```ts
db.prepare(`
  INSERT OR IGNORE INTO transactions (date, amount, counterparty, …)
  VALUES (?, ?, ?, …)
`).run(date, amount, counterparty, …);
```

## Usage Pattern

Always use prepared statements — never string-interpolate user data into queries:

```ts
import { Database } from "bun:sqlite";

const db = new Database("flouz.db");

const insert = db.prepare(
  "INSERT OR IGNORE INTO transactions (date, amount, counterparty) VALUES (?, ?, ?)"
);
insert.run("2026-01-27", -12.50, "Some Merchant");
```
