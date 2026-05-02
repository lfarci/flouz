# flouz transactions comment

Interactively adds or edits free-text comments on transactions. Comments are stored on the transaction and visible to the AI during categorization — adding context before running `categorize` improves suggestion accuracy.

## Use cases

- **Disambiguation before categorization** — a counterparty name like "VIREMENT" is ambiguous; a comment like "monthly rent" gives the AI enough context to categorize it correctly
- **Personal annotations** — record what a transaction was for (e.g. "birthday gift for Alice", "hotel for work trip")
- **Correcting AI context** — add notes to transactions the AI has previously miscategorized due to vague counterparty names
- **Targeted annotation** — jump directly to a known transaction by ID to add or update its comment

## Usage

```sh
# Review all transactions interactively
flouz transactions comment

# Jump directly to a specific transaction
flouz transactions comment 42

# Review transactions from a date range
flouz transactions comment --from 2024-01-01 --to 2024-03-31

# Review transactions matching a counterparty search
flouz transactions comment --search virement --limit 10
```

## Interactive choices per transaction

| Choice | Effect |
|---|---|
| **Add comment** / **Update comment** | Prompts for text; saves on confirm |
| **Clear comment** | Removes the existing comment (only shown when a comment exists) |
| **Skip** | Moves to the next transaction without changes |
| **Quit** | Exits the review session |

## Reference

### `flouz transactions comment [id]`

| Argument / Option | Description |
|---|---|
| `[id]` | Optional transaction ID to jump to directly |
| `-f, --from <date>` | Start date filter (YYYY-MM-DD) |
| `-t, --to <date>` | End date filter (YYYY-MM-DD) |
| `-s, --search <text>` | Search counterparty name |
| `-l, --limit <n>` | Max transactions to review |
| `-d, --db <path>` | Override database path |

## Notes

- Run this before `flouz transactions categorize` to improve AI suggestion quality
- Leaving the text input blank during "Add comment" is treated as Skip
