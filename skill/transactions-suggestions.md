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
- **Fixing a specific suggestion** — override the AI's choice for a single transaction without going through the full interactive flow
- **Rejecting bad suggestions** — remove suggestions that are clearly wrong before applying
- **Auditing applied suggestions** — review what categories have already been written to transactions

## Commands

### List suggestions

```sh
# List all pending suggestions (default)
flouz transactions suggestions list

# List approved suggestions
flouz transactions suggestions list --status approved

# List already-applied suggestions
flouz transactions suggestions list --status applied

# Filter by date range or counterparty
flouz transactions suggestions list --from 2024-01-01 --search netflix
```

Output columns: ID (transaction ID), Date, Amount, Counterparty, Category, Confidence (%), Status, Reasoning

### Review interactively

```sh
# Review all pending suggestions one by one
flouz transactions suggestions review

# Review a filtered subset
flouz transactions suggestions review --search amazon --limit 20
```

Interactive choices: **Approve**, **Fix category** (pick from list), **Reject**, **Skip**, **Quit**

### Bulk approve

```sh
# Approve all pending suggestions
flouz transactions suggestions approve

# Approve only a filtered subset
flouz transactions suggestions approve --search delhaize
flouz transactions suggestions approve --from 2024-01-01 --to 2024-01-31
```

### Fix a specific suggestion

```sh
# Override the suggested category for transaction 42
flouz transactions suggestions fix --id 42 --category groceries.supermarkets
```

Use `flouz transactions categories list` to find valid category slugs. Cannot fix an already-applied suggestion.

### Reject suggestions

```sh
# Reject all pending suggestions
flouz transactions suggestions reject

# Reject a filtered subset
flouz transactions suggestions reject --search "mystery merchant"

# Reject already-approved suggestions (before they are applied)
flouz transactions suggestions reject --status approved
```

### Apply approved suggestions

Writes the approved category to `category_id` on each transaction.

```sh
# Apply all approved suggestions
flouz transactions suggestions apply

# Apply only a subset
flouz transactions suggestions apply --from 2024-01-01 --search delhaize
```

After applying, verify with `flouz transactions list --category <slug>`.

## Notes

- `suggestions apply` is the only operation that modifies `category_id` on transactions
- The transaction ID shown in `suggestions list` is the same ID used with `fix --id`
- Confidence is shown as a percentage — higher means the AI was more certain
