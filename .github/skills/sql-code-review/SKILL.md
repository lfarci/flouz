---
name: sql-code-review
description: 'SQL code review assistant for bun:sqlite queries — focuses on SQL injection prevention via parameterized statements, index strategy, anti-patterns, and code quality. Use when reviewing db/queries.ts or any SQLite query helper.'
---

# SQL Code Review (bun:sqlite)

Perform a thorough SQL code review focusing on security, performance, maintainability, and SQLite best practices.

## 🔒 Security: SQL Injection Prevention

```typescript
// ❌ CRITICAL: SQL Injection vulnerability
db.run(`SELECT * FROM transactions WHERE category_id = '${categoryId}'`)
db.query(`DELETE FROM transactions WHERE id = ${id}`).run()

// ✅ SECURE: Parameterized queries (bun:sqlite)
const stmt = db.prepare('SELECT * FROM transactions WHERE category_id = ?')
stmt.all(categoryId)

const del = db.prepare('DELETE FROM transactions WHERE id = ?')
del.run(id)
```

**Rule:** All user-supplied or AI-generated values must use `?` placeholders in `db.prepare()`. Never use template literals or string concatenation for SQL values.

## ⚡ Performance

### Index Strategy

- `(date)` — for `--from` / `--to` filters on `list` command
- `(category_id)` — for category filter queries
- `UNIQUE(date, amount, counterparty)` — deduplication constraint on import

### Anti-patterns to Flag

```sql
-- ❌ BAD: SELECT * fetches unnecessary columns
SELECT * FROM transactions WHERE date > ?

-- ✅ GOOD: Select only needed columns
SELECT id, date, amount, counterparty, category_id FROM transactions WHERE date > ?

-- ❌ BAD: Function in WHERE clause prevents index usage
SELECT * FROM transactions WHERE strftime('%Y', date) = '2026'

-- ✅ GOOD: Range condition uses index
SELECT * FROM transactions WHERE date >= '2026-01-01' AND date < '2027-01-01'
```

## 🛠️ Code Quality

### Naming Conventions

- Table names: lowercase plural (`transactions`, `categories`)
- Column names: snake_case (`category_id`, `ai_confidence`, `imported_at`)
- Prepared statement variables: descriptive (`insertTransaction`, `getByCategory`)

### bun:sqlite Patterns

```typescript
// ✅ Reuse prepared statements — don't re-prepare on every call
class TransactionQueries {
  private readonly insert: Statement
  private readonly getAll: Statement

  constructor(db: Database) {
    this.insert = db.prepare('INSERT OR IGNORE INTO transactions (date, amount, counterparty) VALUES (?, ?, ?)')
    this.getAll = db.prepare('SELECT id, date, amount, counterparty FROM transactions')
  }

  insertTransaction(date: string, amount: number, counterparty: string) {
    this.insert.run(date, amount, counterparty)
  }
}
```

## 📋 Review Checklist

### Security

- [ ] All user inputs and AI-generated values are parameterized (`?` placeholders)
- [ ] No template literal SQL construction from external input
- [ ] `ai_category_id` never silently overwrites user-set `category_id`

### Performance

- [ ] Indexes exist for `date`, `category_id`, `UNIQUE(date, amount, counterparty)`
- [ ] No `SELECT *` in production queries
- [ ] WHERE clauses use range conditions instead of functions on columns

### Code Quality

- [ ] Prepared statements are reused, not re-created on each call
- [ ] Column names are consistent snake_case
- [ ] Error handling covers `UNIQUE` constraint violations on import

## 📊 SQLite-Specific Notes

- `INSERT OR IGNORE` for deduplication — do not use `ON CONFLICT DO UPDATE` unless intentional
- Use `TEXT` for dates in ISO format (`yyyy-MM-dd`) — SQLite has no native date type
- Use `REAL` for amounts — not `DECIMAL` (SQLite stores as float anyway)
- Use `INTEGER PRIMARY KEY AUTOINCREMENT` for auto-increment IDs
