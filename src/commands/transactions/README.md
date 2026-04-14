# Transactions Command

## What It Does

The `transactions` command groups the main workflows for working with stored transaction data.

- `import` reads CSV data and inserts valid rows into the database
- `list` prints stored transactions as a table, CSV, or JSON
- `categorize` runs AI categorization on uncategorized transactions and stores suggestions

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

| Option | Description |
|---|---|
| `-f, --from <date>` | Filter from date (yyyy-MM-dd) |
| `-t, --to <date>` | Filter to date (yyyy-MM-dd) |
| `-c, --category <slug>` | Filter by category slug |
| `-s, --search <text>` | Search counterparty name |
| `-l, --limit <n>` | Max results |
| `--uncategorized` | Show only transactions without a manual category |
| `-o, --output <format>` | Output format: `table`, `csv`, or `json` (default: `table`) |
| `-d, --db <path>` | SQLite database path |

`--category` and `--uncategorized` are mutually exclusive.

### `categorize`

Uses an AI model to suggest categories for transactions that have no manual category and no existing suggestion. Suggestions are stored in the `transaction_category_suggestions` table and never silently overwrite `transactions.category_id`.

```bash
flouz transactions categorize [options]
```

| Option | Description |
|---|---|
| `-f, --from <date>` | Process only transactions from this date (YYYY-MM-DD) |
| `-t, --to <date>` | Process only transactions up to this date (YYYY-MM-DD) |
| `-s, --search <text>` | Filter by counterparty name |
| `-l, --limit <n>` | Max transactions to process in one run |
| `-d, --db <path>` | SQLite database path |

## Recommended Inspect-then-Categorize Workflow

```bash
# 1. See what still needs categorizing
flouz transactions list --uncategorized

# 2. Run AI categorization on a bounded set
flouz transactions categorize --limit 10

# 3. Repeat until all transactions have suggestions
flouz transactions list --uncategorized
```

## Scope

This command group owns transaction ingestion, inspection, and AI-assisted categorization.
The parent command wires shared configuration into each subcommand and keeps the transaction workflows organized under one namespace.