# Transactions Command

## What It Does

The `transactions` command groups the main workflows for working with stored transaction data.

- `import` reads CSV data and inserts valid rows into the database
- `list` prints stored transactions as a table, CSV, or JSON
- `categorize` runs AI categorization on uncategorized transactions and stores suggestions
- `suggestions` reviews, approves, rejects, and applies AI-generated suggestions

## Subcommands

### `import`

Reads one or more CSV files and inserts valid rows into the database.

```bash
flouz transactions import <file.csv> [more.csv...]
```

Options: `-d, --db <path>` — SQLite database path

### `list`

Prints stored transactions. Supports filtering, searching, and multiple output formats.

```bash
flouz transactions list [options]
```

| Option                  | Description                                                 |
| ----------------------- | ----------------------------------------------------------- |
| `-f, --from <date>`     | Filter from date (yyyy-MM-dd)                               |
| `-t, --to <date>`       | Filter to date (yyyy-MM-dd)                                 |
| `-c, --category <slug>` | Filter by category slug                                     |
| `-s, --search <text>`   | Search counterparty name                                    |
| `-l, --limit <n>`       | Max results                                                 |
| `--uncategorized`       | Show only transactions without a manual category            |
| `-o, --output <format>` | Output format: `table`, `csv`, or `json` (default: `table`) |
| `-d, --db <path>`       | SQLite database path                                        |

`--category` and `--uncategorized` are mutually exclusive.

### `categorize`

Uses an AI model to suggest categories for transactions that have no manual category and no existing suggestion. Suggestions are stored in the `transaction_category_suggestions` table and never silently overwrite `transactions.category_id`.

```bash
flouz transactions categorize [options]
```

| Option                | Description                                            |
| --------------------- | ------------------------------------------------------ |
| `-f, --from <date>`   | Process only transactions from this date (YYYY-MM-DD)  |
| `-t, --to <date>`     | Process only transactions up to this date (YYYY-MM-DD) |
| `-s, --search <text>` | Filter by counterparty name                            |
| `-l, --limit <n>`     | Max transactions to process in one run                 |
| `-d, --db <path>`     | SQLite database path                                   |

### `suggestions`

Manages the lifecycle of AI-generated category suggestions. All subcommands share the same filter options (`--from`, `--to`, `--search`, `--limit`, `--db`).

#### `suggestions list`

Lists pending suggestions by default. Pass `--status` to view approved or applied ones.

```bash
flouz transactions suggestions list [options]
```

| Option                | Description                                                                |
| --------------------- | -------------------------------------------------------------------------- |
| `--status <status>`   | Filter by status: `pending`, `approved`, or `applied` (default: `pending`) |
| `-f, --from <date>`   | Filter from date (YYYY-MM-DD)                                              |
| `-t, --to <date>`     | Filter to date (YYYY-MM-DD)                                                |
| `-s, --search <text>` | Search counterparty name                                                   |
| `-l, --limit <n>`     | Max results                                                                |
| `-d, --db <path>`     | SQLite database path                                                       |

#### `suggestions approve`

Marks matching `pending` suggestions as `approved`. Does not modify `transactions.category_id`.

```bash
flouz transactions suggestions approve [options]
```

#### `suggestions reject`

Deletes matching `pending` or `approved` suggestions. The deleted transactions become eligible again for `transactions categorize`. Does not modify `transactions.category_id`.

```bash
flouz transactions suggestions reject [options]
```

| Option              | Description                                                    |
| ------------------- | -------------------------------------------------------------- |
| `--status <status>` | Status to reject: `pending` or `approved` (default: `pending`) |
| (common filters)    | `--from`, `--to`, `--search`, `--limit`, `--db`                |

#### `suggestions apply`

Copies the suggested `category_id` into `transactions.category_id` for all `approved` suggestions where the transaction has not already been manually categorized. Marks each successful suggestion row as `applied`. The operation is idempotent.

```bash
flouz transactions suggestions apply [options]
```

## Canonical Suggestion Review Workflow

```bash
# 1. Generate suggestions for uncategorized transactions
flouz transactions categorize --limit 20

# 2. Inspect the pending suggestions
flouz transactions suggestions list

# 3a. Reject incorrect suggestions (re-opens those transactions to re-categorization)
flouz transactions suggestions reject --search "Suspicious Merchant"

# 3b. Approve all remaining pending suggestions
flouz transactions suggestions approve

# 4. Apply approved suggestions to transactions
flouz transactions suggestions apply

# 5. Verify the result
flouz transactions list --from 2026-01-01
```

## Scope

This command group owns transaction ingestion, inspection, and AI-assisted categorization.
The parent command wires shared configuration into each subcommand and keeps the transaction workflows organized under one namespace.
