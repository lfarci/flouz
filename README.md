# flouz

AI-powered personal finance CLI for analyzing bank transactions.

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- A `GITHUB_TOKEN` with access to [GitHub Models](https://github.com/marketplace/models) (free with Copilot subscription)

## Installation

```bash
git clone https://github.com/lfarci/flouz.git
cd flouz
bun install
bun link              # registers `flouz` as a global command
cp .env.example .env  # then fill in your GITHUB_TOKEN
```

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
- `-l, --limit <n>` — max results (default: 50)
- `-d, --db <path>` — SQLite database path

### Manage accounts

```bash
bun run src/index.ts accounts add checking "Main account" Belfius --iban "BE00 0000 0000 0000"
bun run src/index.ts accounts delete checking
bun run src/index.ts accounts list
```

### Export transactions

```bash
bun run src/index.ts transactions export
bun run src/index.ts transactions export --output transactions.csv
```

Options:
- `-o, --output <file>` — output file (default: stdout)
- `-d, --db <path>` — SQLite database path

## Tests

```bash
bun test
```

## Type checking

```bash
bun run typecheck
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `GITHUB_TOKEN` | — | Required for AI features |
| `AI_MODEL` | `openai/gpt-4.1-mini` | Model to use |
| `AI_BASE_URL` | `https://models.github.ai/inference` | Provider endpoint |
| `DB_PATH` | `./flouz.db` | SQLite database file |

See `docs/ai-providers.md` to switch to Anthropic or Ollama.

## Data & Privacy

All transaction data stays local in a SQLite file. Nothing is sent to any server except transaction descriptions sent to the AI provider for categorization.
