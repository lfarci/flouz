# flouz — Command Reference

## `flouz config set <key> <value>`

| Key | Description |
|---|---|
| `db-path` | Path to the SQLite database file |
| `github-token` | GitHub personal access token (required for AI categorization) |
| `ai-model` | AI model name (default: `openai/gpt-4o-mini`) |
| `ai-base-url` | AI provider base URL (default: `https://models.github.ai/inference`) |

## `flouz config get [key]`

Omit `key` to print all values.

---

## `flouz accounts add <key> <name> <company>`

| Argument/Option | Description |
|---|---|
| `<key>` | Unique import key (matches the key column in CSVs) |
| `<name>` | Human-readable account name |
| `<company>` | Provider or institution name |
| `-d, --description <text>` | Optional account description |
| `-i, --iban <iban>` | Optional account IBAN |
| `--db <path>` | Override database path |

## `flouz accounts list`

| Option | Description |
|---|---|
| `--db <path>` | Override database path |

## `flouz accounts delete <key>`

| Argument/Option | Description |
|---|---|
| `<key>` | Unique import key of the account to delete |
| `--db <path>` | Override database path |

---

## `flouz transactions import <path>`

| Argument/Option | Description |
|---|---|
| `<path>` | Path to a CSV file or directory of CSV files |
| `-d, --db <path>` | Override database path |

---

## `flouz transactions list`

| Option | Description |
|---|---|
| `-f, --from <date>` | Start date filter (YYYY-MM-DD) |
| `-t, --to <date>` | End date filter (YYYY-MM-DD) |
| `-c, --category <slug>` | Category slug filter (includes descendants) |
| `-s, --search <text>` | Search counterparty name |
| `-l, --limit <n>` | Max results |
| `--uncategorized` | Only transactions without a manual category |
| `-o, --output <format>` | `table` (default) \| `csv` \| `json` |
| `-d, --db <path>` | Override database path |

`--category` and `--uncategorized` are mutually exclusive.

JSON output fields: `date`, `amount`, `counterparty`, `bankCommunication`, `category`

---

## `flouz transactions comment [id]`

| Argument/Option | Description |
|---|---|
| `[id]` | Optional transaction ID to jump to directly |
| `-f, --from <date>` | Start date filter (YYYY-MM-DD) |
| `-t, --to <date>` | End date filter (YYYY-MM-DD) |
| `-s, --search <text>` | Search counterparty name |
| `-l, --limit <n>` | Max transactions to review |
| `-d, --db <path>` | Override database path |

---

## `flouz transactions categorize`

| Option | Description |
|---|---|
| `-f, --from <date>` | Start date filter (YYYY-MM-DD) |
| `-t, --to <date>` | End date filter (YYYY-MM-DD) |
| `-s, --search <text>` | Search counterparty name |
| `-l, --limit <n>` | Max transactions to process |
| `--override` | Also categorize already-categorized transactions |
| `-d, --db <path>` | Override database path |

---

## `flouz transactions suggestions list`

| Option | Description |
|---|---|
| `-f, --from <date>` | Start date filter (YYYY-MM-DD) |
| `-t, --to <date>` | End date filter (YYYY-MM-DD) |
| `-s, --search <text>` | Search counterparty name |
| `-l, --limit <n>` | Max results |
| `--status <status>` | `pending` (default) \| `approved` \| `applied` |
| `-d, --db <path>` | Override database path |

## `flouz transactions suggestions review`

| Option | Description |
|---|---|
| `-f, --from <date>` | Start date filter (YYYY-MM-DD) |
| `-t, --to <date>` | End date filter (YYYY-MM-DD) |
| `-s, --search <text>` | Search counterparty name |
| `-l, --limit <n>` | Max suggestions to review |
| `-d, --db <path>` | Override database path |

## `flouz transactions suggestions approve`

| Option | Description |
|---|---|
| `-f, --from <date>` | Start date filter (YYYY-MM-DD) |
| `-t, --to <date>` | End date filter (YYYY-MM-DD) |
| `-s, --search <text>` | Search counterparty name |
| `-l, --limit <n>` | Max suggestions to approve |
| `-d, --db <path>` | Override database path |

## `flouz transactions suggestions fix`

| Option | Description |
|---|---|
| `--id <transactionId>` | Transaction ID of the suggestion to fix (required) |
| `--category <slug>` | Correct category slug to use instead (required) |
| `-d, --db <path>` | Override database path |

## `flouz transactions suggestions reject`

| Option | Description |
|---|---|
| `-f, --from <date>` | Start date filter (YYYY-MM-DD) |
| `-t, --to <date>` | End date filter (YYYY-MM-DD) |
| `-s, --search <text>` | Search counterparty name |
| `-l, --limit <n>` | Max suggestions to reject |
| `--status <status>` | `pending` (default) \| `approved` |
| `-d, --db <path>` | Override database path |

## `flouz transactions suggestions apply`

| Option | Description |
|---|---|
| `-f, --from <date>` | Start date filter (YYYY-MM-DD) |
| `-t, --to <date>` | End date filter (YYYY-MM-DD) |
| `-s, --search <text>` | Search counterparty name |
| `-l, --limit <n>` | Max suggestions to apply |
| `-d, --db <path>` | Override database path |

---

## `flouz transactions categories list`

| Option | Description |
|---|---|
| `--tree` | Show categories as a hierarchy tree |
| `-d, --db <path>` | Override database path |
