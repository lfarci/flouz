# flouz

flouz is a personal finance CLI. It imports Belgian bank CSV exports into a local SQLite database and uses AI to categorize transactions.

## Key concepts

**Database** — a single SQLite file (`~/.config/flouz/flouz.db` by default). All commands accept `--db <path>` to override it.

**Accounts** — optional groupings that map a CSV import key to a bank account. Useful when managing multiple accounts.

**Categories** — a 3-level hierarchy (root → subcategory → leaf) identified by stable slugs. Use `flouz transactions categories list --tree` to discover them. Filtering by a parent slug includes all descendants.

**Category vs AI suggestion** — `category_id` is user-controlled and written only when the user explicitly applies or approves a suggestion. The AI stores its proposals separately and never silently overwrites user choices.

**Suggestions lifecycle**
```
categorize → [pending] → approve / fix → [approved] → apply → [applied]
                       → reject → (deleted)
```

## Core workflow

```
import → comment → categorize → review suggestions → apply → list
```

1. **Import** — load bank CSVs into the database (duplicates are silently ignored)
2. **Comment** — optionally annotate transactions before AI sees them (improves accuracy)
3. **Categorize** — AI generates pending suggestions without touching `category_id`
4. **Review** — approve, fix, or reject suggestions interactively or in bulk
5. **Apply** — write approved suggestions to `category_id` on transactions
6. **List** — query the result with filters and output formats

## Command groups

| Command | Purpose |
|---|---|
| `flouz config` | Manage tool configuration |
| `flouz accounts` | Manage bank account registrations |
| `flouz transactions import` | Import bank CSV exports |
| `flouz transactions list` | Query and export transactions |
| `flouz transactions comment` | Annotate transactions before categorization |
| `flouz transactions categorize` | Run AI categorization |
| `flouz transactions suggestions` | Review and apply AI category suggestions |
| `flouz transactions categories` | Discover available category slugs |
