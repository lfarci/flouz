# GitHub Copilot Instructions — finance-cli

## Project

Personal finance CLI tool that imports bank transaction CSVs into
a local SQLite database and uses AI to auto-categorize transactions and surface spending insights.

**New GitHub repository must be created** before scaffolding: `finance-cli` (public or private).
Initialize with a README, then clone locally to `~/Documents/finance-cli/`.

## ⚠️ Data Privacy

**Never commit personal or financial data to this repository.**
See `.github/instructions/data-privacy.instructions.md` for full rules.

Key rules at a glance:
- No real IBANs, account numbers, or transaction amounts anywhere in the repo
- No `.csv`, `.db`, or `.env` files — they are gitignored
- Test fixtures must use invented data only (e.g. `BE00 0000 0000 0000`, `ACME Shop`)
- No API keys or tokens in source code

## Stack

| Concern | Choice |
|---|---|
| Runtime | **Bun** — use Bun APIs, never Node.js equivalents |
| Language | **TypeScript strict mode** |
| CLI | **Commander.js** — one `Command` per file in `src/commands/` |
| Prompts | **@clack/prompts** — all user-facing output goes through this |
| Database | **`bun:sqlite`** — built-in, no ORM, prepared statements only |
| CSV parsing | **`csv-parse`** |
| AI | **Vercel AI SDK** (`ai`) — `generateObject`, `generateText`, `streamText` |
| AI provider | **GitHub Models** (default) via `@ai-sdk/openai` with custom `baseURL` |
| Validation | **Zod** — all external data and LLM output validated with Zod schemas |
| Testing | **`bun test`** — Jest-compatible API, no extra test runner |

## Code Rules

> TypeScript and Bun-specific rules are in `.github/instructions/typescript.instructions.md`.

### Database
- All queries go through typed helpers in `src/db/queries.ts` — no raw SQL in commands
- Use `INSERT OR IGNORE` for deduplication, never manual existence checks
- Transactions (SQLite transactions) for any multi-row write operation
- Column names: `snake_case`
- Database initialisation lives in `src/db/schema.ts` — use `openDatabase(path)` to open, init and seed in one call; never call `new Database()` directly in commands

### AI
- Never call LLM APIs directly with `fetch` — always use Vercel AI SDK functions
- Always use `generateObject` with a Zod schema for structured output — never parse JSON manually
- Store AI suggestions in `ai_category_id` — never silently overwrite user-set `category_id`
- Model is injected via `getModel()` from `src/ai/client.ts` — never hardcode a model name

### Error Handling
- Commands: catch errors at the top level, display via `@clack/prompts` `cancel()`, exit with code 1
- Internal functions: throw typed `Error` with descriptive messages — no silent failures
- Validate file existence before processing; validate CSV format early with a clear error

### Style
- Comment only non-obvious logic — no JSDoc on trivial functions
- Prefer early returns over nested conditionals
- Max function length: ~40 lines — extract helpers freely
- Commit messages: imperative mood, `feat:`, `fix:`, `test:`, `chore:` prefixes

### Testing
- Test files live next to source: `source.ts` → `source.test.ts`
- DB tests always use `new Database(':memory:')` — never a file on disk
- Mock LLM calls via `mock.module('ai', ...)` from `bun:test` — no real API calls in tests
- Test fixtures live in `__fixtures__/` next to the test file
- Test names describe behavior: `'returns empty string when date is missing'`, not `'test 1'`

## Project Structure

```
src/
  commands/     ← one file per CLI command
  db/           ← schema.ts, queries.ts
  parsers/      ← source.ts (bank CSV parser)
  ai/           ← client.ts (model factory), prompts.ts
  index.ts      ← Commander root, registers all commands
.github/
  copilot-instructions.md
  instructions/ ← path-scoped instructions
  prompts/      ← reusable prompt files (skills)
```

## Domain Knowledge

- Bank: Belgian bank, semicolon-delimited CSV export format
- Source CSV: semicolon-separated, comma decimals, French headers, metadata block before data rows
- Categories: 3-level UUID hierarchy (Necessities / Savings / Discretionary → subcategories → leaves)
- Category IDs are stable UUIDs from `data/Categories.csv` — never regenerate them
- Transaction deduplication key: `(date, amount, counterparty)` — composite UNIQUE constraint

## Design Principles

### SOLID
- **Single Responsibility** — each module does one thing: `parsers/source.ts` parses CSVs, `db/queries.ts` queries data, `ai/client.ts` creates the model. Never mix concerns.
- **Open/Closed** — extend behavior via new files/functions, not by modifying stable ones. Adding a new command = new file in `commands/`, not editing `index.ts` logic.
- **Liskov Substitution** — AI provider adapters must be interchangeable. Swapping `@ai-sdk/openai` for `@ai-sdk/anthropic` must require zero changes outside `ai/client.ts`.
- **Interface Segregation** — expose only what callers need. Query helpers in `queries.ts` return plain typed objects, not raw `bun:sqlite` statement objects.
- **Dependency Inversion** — commands depend on abstractions (`getModel()`, query helpers), not on concrete SDKs or `Database` instances directly. Inject `db` as a parameter, never import a global instance.

### KISS — Keep It Simple
- Solve the problem at hand, not the hypothetical future problem.
- Prefer a plain `for` loop over a clever `reduce` when it reads more clearly.
- Prefer a single SQL query over an in-memory aggregation when SQL is simpler.
- No design patterns for their own sake — only introduce abstraction when it removes real duplication.

### DRY — Don't Repeat Yourself
- Date parsing, amount parsing, and counterparty cleanup live in `parsers/source.ts` only — never duplicated in tests or commands (tests import the same function).
- All SQL for a given table lives in `db/queries.ts` — no inline SQL strings in commands.
- Prompt templates live in `ai/prompts.ts` — no inline prompt strings in commands.
- Zod schemas that are reused across modules live in a shared `src/types.ts`.

## What NOT to Do

- Do not install `better-sqlite3`, `node-sqlite3`, or any other SQLite package — use `bun:sqlite`
- Do not use `openai` npm package directly — use `@ai-sdk/openai` from the Vercel AI SDK
- Do not import from `fs`, `path`, or other Node built-ins when Bun equivalents exist
- Do not add `console.log` in production code — use `@clack/prompts` for all output
- Do not modify files in `~/Documents/Jan2026/` — that directory is reference material only
- Do not make changes outside the scope of the current task without asking first
