# flouz transactions import

Parses Belgian bank CSV exports and inserts transactions into the local database. Duplicate transactions are silently ignored — safe to re-import the same file.

## Use cases

- **Initial load** — import months or years of bank history from a directory of CSV exports
- **Monthly update** — run after downloading the latest CSV; duplicates from previous imports are skipped automatically
- **Multiple accounts** — point at a directory containing CSVs from different accounts; flouz processes all `.csv` files found

## Usage

```sh
# Import a single file
flouz transactions import ~/downloads/bank-2024-03.csv

# Import all CSV files in a directory
flouz transactions import ~/downloads/bank-exports/

# Import into a non-default database
flouz transactions import ~/downloads/bank-2024-03.csv --db ~/finance/flouz.db
```

## Reference

### `flouz transactions import <path>`

| Argument / Option | Description |
|---|---|
| `<path>` | Path to a CSV file or a directory of CSV files |
| `-d, --db <path>` | Override database path |

## Behaviour

- Directories are scanned for `*.csv` files (non-recursive)
- Deduplication key: `(date, amount, counterparty)` — re-importing the same rows has no effect
- If the database file does not exist yet, it is created on first import
- Parse errors (malformed rows) are reported as warnings; valid rows in the same file are still imported
- The import is transactional per file — a failure mid-file rolls back only that file's inserts

## After importing

Run `flouz transactions list` to verify the data, then proceed with `flouz transactions categorize` to generate AI category suggestions.
