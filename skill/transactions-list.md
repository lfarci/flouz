# flouz transactions list

Queries transactions from the database with optional filters. Supports machine-readable output for piping into other tools.

## Use cases

- **Spending overview** — list all transactions for a given period to review what was imported
- **Category audit** — filter by a category slug to see everything tagged under it (including subcategories)
- **Finding uncategorized transactions** — identify transactions that still need a category assigned
- **Exporting data** — produce CSV or JSON output for use in spreadsheets or further processing
- **Agent pipelines** — use `--output json` to get structured data that can be filtered with `jq`

## Usage

```sh
# All transactions
flouz transactions list

# Date range
flouz transactions list --from 2024-01-01 --to 2024-03-31

# Filter by category (includes all descendants)
flouz transactions list --category groceries
flouz transactions list --category necessities

# Search counterparty name
flouz transactions list --search delhaize

# Transactions without a manual category
flouz transactions list --uncategorized

# Limit results
flouz transactions list --limit 20

# Machine-readable output
flouz transactions list --output json
flouz transactions list --output csv --from 2024-01-01 > transactions.csv

# Combine filters
flouz transactions list --from 2024-01-01 --category food --output json --limit 100
```

## JSON output

Each record contains:

| Field | Description |
|---|---|
| `date` | Transaction date (YYYY-MM-DD) |
| `amount` | Signed amount as a formatted string (e.g. `-42.50`, `+1200.00`) |
| `counterparty` | Counterparty name |
| `bankCommunication` | Bank communication / reference (may be empty) |
| `category` | Category slug, or `—` if uncategorized |

## Piping examples

```sh
# All expenses in Q1
flouz transactions list --output json --from 2024-01-01 --to 2024-03-31 \
  | jq '[.[] | select(.amount | startswith("-"))]'

# Total amount for a category
flouz transactions list --output json --category groceries \
  | jq '[.[].amount | ltrimstr("+") | tonumber] | add'
```

## Notes

- `--category` and `--uncategorized` cannot be combined
- Category slugs can be discovered with `flouz transactions categories list`
- Filtering by a parent category slug includes all its descendants
