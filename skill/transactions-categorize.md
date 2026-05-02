# flouz transactions categorize

Runs AI categorization on transactions and stores the results as pending suggestions. This command never modifies `category_id` directly — all suggestions must be reviewed and applied separately.

## Use cases

- **Bulk categorization** — categorize a full month or year of new imports in one run
- **Incremental runs** — categorize only newly imported transactions (already-categorized ones are skipped by default)
- **Re-categorization** — use `--override` to re-process transactions that already have a category, for example after adding comments or when you suspect the AI would do better with updated context
- **Scoped runs** — limit by date range or counterparty search to process a specific subset

## Usage

```sh
# Categorize all eligible transactions
flouz transactions categorize

# Categorize only recent imports
flouz transactions categorize --from 2024-03-01

# Limit to 50 transactions per run (useful for API quota management)
flouz transactions categorize --limit 50

# Re-categorize transactions that already have a category
flouz transactions categorize --override

# Combine filters
flouz transactions categorize --from 2024-01-01 --to 2024-03-31 --search amazon
```

## What counts as eligible

By default, a transaction is eligible if it has no `category_id` and no existing pending suggestion. With `--override`, all matching transactions are reprocessed regardless of current category state.

## After running

```sh
# Check the generated suggestions
flouz transactions suggestions list

# Review them interactively
flouz transactions suggestions review
```

## Notes

- Requires `github-token` to be set — run `flouz config set github-token <token>` first
- If the run fails mid-way, suggestions already created are preserved; re-run to continue from where it stopped
- Adding comments before categorizing (via `flouz transactions comment`) gives the AI more context and improves accuracy
