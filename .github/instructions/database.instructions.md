---
description: 'Database conventions for SQLite modules in flouz'
applyTo: 'src/db/**/*.ts,src/db/**/*.md,docs/database.md'
---

# Database Conventions

## Stack

- Use `bun:sqlite` directly — no ORM
- Use prepared statements only
- Keep SQL in typed helper modules, never inline in callers when a db helper should own it

## Module Layout

Database code is organized by table under `src/db/<table>/`:

```text
src/db/
  README.md
  schema.ts
  schema.test.ts
  categories/
    README.md
    schema.ts
    schema.test.ts
    seed.ts
    seed.test.ts
    queries.ts
    queries.test.ts
  transactions/
    README.md
    schema.ts
    schema.test.ts
    queries.ts
    queries.test.ts
    mutations.ts
    mutations.test.ts
```

- Keep a top-level `src/db/README.md` with a concise overview of the database and a Mermaid schema diagram
- Use `queries.ts` for read-only SQL
- Use `mutations.ts` for write SQL
- Keep table creation in `schema.ts`
- Keep bootstrap data in `seed.ts` only when the table actually needs seeding
- Add a concise `README.md` in each table directory documenting table purpose, main queries, mutations, and seeding behavior
- Keep cross-table initialization in `src/db/schema.ts`
- Co-locate tests next to each database module: `schema.test.ts`, `queries.test.ts`, `mutations.test.ts`, `seed.test.ts`

## SQL Rules

- No raw SQL in CLI commands; go through typed helpers in the db modules
- Use `INSERT OR IGNORE` for deduplication, never manual existence checks
- Use SQLite transactions for multi-row write operations
- Column names must be `snake_case`
- Database initialization lives in `src/db/schema.ts` — use `openDatabase(path)` to open, init, and seed in one call; never call `new Database()` directly in commands

## Domain Rules

- Category IDs are stable UUIDs from `data/Categories.csv` — never regenerate them
- Transaction deduplication key is `(date, amount, counterparty)`
- `category_id` is user-controlled
- AI suggestions must be stored in `ai_category_id` and must never silently overwrite `category_id`

## Design Guidance

- Each database module should do one thing: table schema, seed data, reads, or writes
- Query helpers should return plain typed objects, not raw `bun:sqlite` statement objects
- Keep all SQL for a given table under its own `src/db/<table>/` directory
- Keep cross-table orchestration only in `src/db/schema.ts`; table-specific SQL should not leak back into the top-level db directory
