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
cp .env.example .env   # then fill in your GITHUB_TOKEN
```

## Commands

### Import transactions

```bash
bun run src/index.ts import <file.csv>
```

Options:
- `-d, --db <path>` — SQLite database path (default: `./flouz.db`, or `$DB_PATH`)

### List transactions

```bash
bun run src/index.ts list
```

Options:
- `-f, --from <yyyy-MM-dd>` — filter from date
- `-t, --to <yyyy-MM-dd>` — filter to date
- `-c, --category <slug>` — filter by category (e.g. `groceries`, `food-and-drink`)
- `-s, --search <text>` — search counterparty name
- `-l, --limit <n>` — max results (default: 50)
- `-d, --db <path>` — SQLite database path

### Export transactions

```bash
bun run src/index.ts export
bun run src/index.ts export --output transactions.csv
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
