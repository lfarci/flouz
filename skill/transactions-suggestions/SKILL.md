# flouz transactions suggestions

Manages AI-generated category suggestions. Suggestions are stored separately from the transaction's `category_id` and must be explicitly approved and applied before they take effect.

## Suggestions lifecycle

```
categorize → [pending] → approve / fix → [approved] → apply → [applied]
                       → reject → (deleted)
```

## Use cases

- **Interactive review** — go through each pending suggestion one by one, approving, fixing, or rejecting
- **Bulk approval** — approve all pending suggestions at once when you trust the AI output for a batch
- **Fixing a specific suggestion** — override the AI's choice for a single transaction without the full interactive flow
- **Rejecting bad suggestions** — remove suggestions that are clearly wrong before applying
- **Auditing applied suggestions** — review what categories have already been written to transactions

## Usage

### List suggestions

```sh
flouz transactions suggestions list                     # pending (default)
flouz transactions suggestions list --status approved
flouz transactions suggestions list --status applied
flouz transactions suggestions list --from 2024-01-01 --search netflix
```

Output columns: ID (transaction ID), Date, Amount, Counterparty, Category, Confidence (%), Status, Reasoning

### Review interactively

```sh
flouz transactions suggestions review
flouz transactions suggestions review --search amazon --limit 20
```

Interactive choices: **Approve**, **Fix category** (pick from list), **Reject**, **Skip**, **Quit**

### Bulk approve

```sh
flouz transactions suggestions approve
flouz transactions suggestions approve --search delhaize
flouz transactions suggestions approve --from 2024-01-01 --to 2024-01-31
```

### Fix a specific suggestion

```sh
flouz transactions suggestions fix --id 42 --category groceries.supermarkets
```

Use `flouz transactions categories list` to find valid category slugs. Cannot fix an already-applied suggestion.

### Reject suggestions

```sh
flouz transactions suggestions reject
flouz transactions suggestions reject --search "mystery merchant"
flouz transactions suggestions reject --status approved   # reject already-approved ones
```

### Apply approved suggestions

```sh
flouz transactions suggestions apply
flouz transactions suggestions apply --from 2024-01-01 --search delhaize
```

`apply` is the only operation that writes `category_id` to transactions. Verify the result with `flouz transactions list --category <slug>`.

## Reference

### `flouz transactions suggestions list`

| Option | Description |
|---|---|
| `-f, --from <date>` | Start date filter (YYYY-MM-DD) |
| `-t, --to <date>` | End date filter (YYYY-MM-DD) |
| `-s, --search <text>` | Search counterparty name |
| `-l, --limit <n>` | Max results |
| `--status <status>` | `pending` (default) \| `approved` \| `applied` |
| `-d, --db <path>` | Override database path |

### `flouz transactions suggestions review`

| Option | Description |
|---|---|
| `-f, --from <date>` | Start date filter (YYYY-MM-DD) |
| `-t, --to <date>` | End date filter (YYYY-MM-DD) |
| `-s, --search <text>` | Search counterparty name |
| `-l, --limit <n>` | Max suggestions to review |
| `-d, --db <path>` | Override database path |

### `flouz transactions suggestions approve`

| Option | Description |
|---|---|
| `-f, --from <date>` | Start date filter (YYYY-MM-DD) |
| `-t, --to <date>` | End date filter (YYYY-MM-DD) |
| `-s, --search <text>` | Search counterparty name |
| `-l, --limit <n>` | Max suggestions to approve |
| `-d, --db <path>` | Override database path |

### `flouz transactions suggestions fix`

| Option | Description |
|---|---|
| `--id <transactionId>` | Transaction ID of the suggestion to fix (required) |
| `--category <slug>` | Correct category slug to use instead (required) |
| `-d, --db <path>` | Override database path |

### `flouz transactions suggestions reject`

| Option | Description |
|---|---|
| `-f, --from <date>` | Start date filter (YYYY-MM-DD) |
| `-t, --to <date>` | End date filter (YYYY-MM-DD) |
| `-s, --search <text>` | Search counterparty name |
| `-l, --limit <n>` | Max suggestions to reject |
| `--status <status>` | `pending` (default) \| `approved` |
| `-d, --db <path>` | Override database path |

### `flouz transactions suggestions apply`

| Option | Description |
|---|---|
| `-f, --from <date>` | Start date filter (YYYY-MM-DD) |
| `-t, --to <date>` | End date filter (YYYY-MM-DD) |
| `-s, --search <text>` | Search counterparty name |
| `-l, --limit <n>` | Max suggestions to apply |
| `-d, --db <path>` | Override database path |
