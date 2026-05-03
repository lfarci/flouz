# flouz

AI-powered personal finance CLI for analyzing bank transactions.

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- A GitHub account with access to [GitHub Models](https://github.com/marketplace/models) (free with a Copilot subscription)

## Installation

```bash
git clone https://github.com/lfarci/flouz.git
cd flouz
bun install
bun link              # registers `flouz` as a global command
```

After `bun link`, configure your GitHub token so AI features work:

```bash
flouz config set github-token ghp_your_personal_access_token
```

Get a token at [github.com/settings/tokens](https://github.com/settings/tokens):

- **Fine-grained PAT** — enable the **Models: Read** permission (under "Account permissions")
- **Classic PAT** — no scopes required

After `bun link`, you can run `flouz` from anywhere:

```bash
flouz --help
```

## Updating

```bash
cd flouz
git pull
bun install  # sync dependencies if changed
```

No need to re-run `bun link` after updates.

## Commands

### Import transactions

```bash
bun run src/index.ts transactions import <file.csv>
```

flouz expects a **generic CSV format** — not tied to any specific bank. Convert your bank export to this format before importing.

#### CSV format

```
date,amount,counterparty,counterparty_iban,currency,account,note
```

| Column              | Required | Format                                                   |
| ------------------- | -------- | -------------------------------------------------------- |
| `date`              | ✅       | ISO 8601: `YYYY-MM-DD`                                   |
| `amount`            | ✅       | Dot-decimal; negative = expense, positive = income       |
| `counterparty`      | ✅       | Free text (merchant or sender name)                      |
| `counterparty_iban` | ❌       | IBAN of the other party                                  |
| `currency`          | ❌       | 3-letter code, defaults to `EUR`                         |
| `account`           | ❌       | Configured account key created with `flouz accounts add` |
| `note`              | ❌       | Free text memo                                           |

Example:

```csv
date,amount,counterparty,counterparty_iban,currency,account,note
2026-01-15,-42.50,ACME Shop,BE00 0000 0000 0000,EUR,checking,Invoice 42
2026-01-16,1200.00,Employer,,EUR,,January salary
```

Before importing transactions that use the `account` column, create the referenced accounts first:

```bash
bun run src/index.ts accounts add checking "Main account" Belfius --iban "BE00 0000 0000 0000"
```

Options:

- `-d, --db <path>` — SQLite database path (default: `./flouz.db`, or `$DB_PATH`)

### List transactions

```bash
bun run src/index.ts transactions list
```

Options:

- `-f, --from <yyyy-MM-dd>` — filter from date
- `-t, --to <yyyy-MM-dd>` — filter to date
- `-c, --category <slug>` — filter by category (e.g. `groceries`, `food-and-drink`)
- `-s, --search <text>` — search counterparty name
- `-l, --limit <n>` — max results
- `--uncategorized` — show only transactions without a manual category
- `-o, --output <format>` — output format: `table`, `csv`, or `json` (default: `table`)
- `-d, --db <path>` — SQLite database path

### AI categorization

flouz can suggest categories for uncategorized transactions using an AI model. Suggestions are stored in a separate table and go through an explicit review lifecycle before being written to `transactions.category_id`.

**Suggestion lifecycle: `pending → approved → applied`**

Rejection deletes the suggestion row and re-opens that transaction to future categorization runs.

**Canonical workflow:**

```bash
# 1. Generate suggestions for uncategorized transactions
flouz transactions categorize --limit 20

# 2. Inspect pending suggestions
flouz transactions suggestions list

# 3a. Reject incorrect ones (re-opens those transactions for re-categorization)
flouz transactions suggestions reject --search "Suspicious Merchant"

# 3b. Approve the rest
flouz transactions suggestions approve

# 4. Apply approved suggestions to transactions
flouz transactions suggestions apply

# 5. Verify
flouz transactions list
```

#### `transactions categorize`

Options:

- `-f, --from <date>` — process only transactions from this date (YYYY-MM-DD)
- `-t, --to <date>` — process only transactions up to this date (YYYY-MM-DD)
- `-s, --search <text>` — filter by counterparty name
- `-l, --limit <n>` — max transactions to process in one run
- `-d, --db <path>` — SQLite database path

#### `transactions suggestions list`

```bash
flouz transactions suggestions list [--status pending|approved|applied] [filters]
```

#### `transactions suggestions approve`

Marks matching pending suggestions as approved. Does not write to `transactions.category_id`.

```bash
flouz transactions suggestions approve [filters]
```

#### `transactions suggestions reject`

Deletes pending or approved suggestions. Re-opens those transactions to future categorization.

```bash
flouz transactions suggestions reject [--status pending|approved] [filters]
```

#### `transactions suggestions apply`

Copies the approved category into `transactions.category_id` only where it is still NULL. Idempotent.

```bash
flouz transactions suggestions apply [filters]
```

### Manage accounts

```bash
bun run src/index.ts accounts add checking "Main account" Belfius --iban "BE00 0000 0000 0000"
bun run src/index.ts accounts delete checking
bun run src/index.ts accounts list
```

### Budgets

Track monthly spending against budgets set on **top-level categories only**.

Available top-level categories (slugs):

| Slug             | Description                                        |
| ---------------- | -------------------------------------------------- |
| `necessities`    | House, utilities, groceries, transport, health, …  |
| `savings`        | Savings accounts, investments                      |
| `discretionary`  | Food & drink, shopping, entertainment, travel, …   |
| `income`         | Salary, reimbursements, gifts received             |

Budget checking aggregates all transactions in descendant categories under each top-level parent.

#### `budget set`

```bash
flouz budget set <category-slug> <amount|percentage> [--month YYYY-MM]
```

Sets (or updates) the monthly budget for a top-level category. Defaults to the current month.
Amounts can be fixed EUR values or percentages of monthly income (suffix with `%`).

```bash
flouz budget set necessities 2000
flouz budget set discretionary 800 --month 2026-06
flouz budget set necessities 60%    # 60% of monthly income
flouz budget set savings 20%
```

#### `budget list`

```bash
flouz budget list [--month YYYY-MM]
```

Shows all budgets configured for the given month in a table.
Percentage budgets display the resolved EUR amount alongside the percentage.

#### `budget check`

```bash
flouz budget check [--month YYYY-MM]
```

Displays a dashboard with:
- Progress bars per category (color-coded: green = on track, yellow = over pace, red = over budget)
- Total budget vs. spending summary
- Recent transactions (last 7 days)
- Linear pace projection with warning if on track to exceed budget

#### `budget total set`

```bash
flouz budget total set [amount] [--month YYYY-MM]
```

Sets the monthly income total used to resolve percentage-based budgets.
When no amount is given, prompts interactively with auto-detected income from transactions.

```bash
flouz budget total set 3500
flouz budget total set --month 2026-06
flouz budget total set              # interactive with auto-detect
```

#### `budget total show`

```bash
flouz budget total show [--month YYYY-MM]
```

Shows the stored or auto-detected monthly income total for the given month.

## Tests

```bash
bun test
```

## Formatting

```bash
bun run format
bun run format:check
```

## Type checking

```bash
bun run typecheck
```

## Configuration

flouz stores settings in `~/.config/flouz/config.json`. Use `flouz config set` to write values and `flouz config get` to read them.

### AI provider

```bash
flouz config set github-token ghp_your_token   # required for AI features
flouz config set ai-model openai/gpt-4o-mini   # optional, this is the default
flouz config set ai-base-url https://...       # optional, defaults to GitHub Models
```

### Database path

```bash
flouz config set db-path /path/to/custom.db   # optional, defaults to ~/.config/flouz/flouz.db
```

### Inspect current configuration

```bash
flouz config get             # show all keys (github-token is masked as ***)
flouz config get ai-model    # show a single key
```

### Environment variable overrides

Environment variables take precedence over the config file — useful for CI/CD or scripting:

| Variable       | Config key     | Default                              |
| -------------- | -------------- | ------------------------------------ |
| `GITHUB_TOKEN` | `github-token` | — (required for AI)                  |
| `AI_MODEL`     | `ai-model`     | `openai/gpt-4o-mini`                 |
| `AI_BASE_URL`  | `ai-base-url`  | `https://models.github.ai/inference` |
| `DB_PATH`      | `db-path`      | `~/.config/flouz/flouz.db`           |

See `docs/ai-providers.md` to switch to Anthropic or Ollama.

## Data & Privacy

All transaction data stays local in a SQLite file. Nothing is sent to any server except transaction descriptions sent to the AI provider for categorization.
