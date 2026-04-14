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

| Column | Required | Format |
|---|---|---|
| `date` | ✅ | ISO 8601: `YYYY-MM-DD` |
| `amount` | ✅ | Dot-decimal; negative = expense, positive = income |
| `counterparty` | ✅ | Free text (merchant or sender name) |
| `counterparty_iban` | ❌ | IBAN of the other party |
| `currency` | ❌ | 3-letter code, defaults to `EUR` |
| `account` | ❌ | Configured account key created with `flouz accounts add` |
| `note` | ❌ | Free text memo |

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

flouz can suggest categories for uncategorized transactions using an AI model. Suggestions are stored separately from user-assigned categories and never silently overwrite them.

**Recommended workflow — inspect then categorize:**

```bash
# 1. See what still needs categorizing
flouz transactions list --uncategorized

# 2. Run AI categorization on a bounded set
flouz transactions categorize --limit 10
```

Options:
- `-f, --from <date>` — process only transactions from this date (YYYY-MM-DD)
- `-t, --to <date>` — process only transactions up to this date (YYYY-MM-DD)
- `-s, --search <text>` — filter by counterparty name
- `-l, --limit <n>` — max transactions to process in one run
- `-d, --db <path>` — SQLite database path

### Manage accounts

```bash
bun run src/index.ts accounts add checking "Main account" Belfius --iban "BE00 0000 0000 0000"
bun run src/index.ts accounts delete checking
bun run src/index.ts accounts list
```

## Tests

```bash
bun test
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

| Variable | Config key | Default |
|---|---|---|
| `GITHUB_TOKEN` | `github-token` | — (required for AI) |
| `AI_MODEL` | `ai-model` | `openai/gpt-4o-mini` |
| `AI_BASE_URL` | `ai-base-url` | `https://models.github.ai/inference` |
| `DB_PATH` | `db-path` | `~/.config/flouz/flouz.db` |

See `docs/ai-providers.md` to switch to Anthropic or Ollama.

## Data & Privacy

All transaction data stays local in a SQLite file. Nothing is sent to any server except transaction descriptions sent to the AI provider for categorization.
