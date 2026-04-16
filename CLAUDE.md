# flouz — Personal Finance CLI

Personal finance CLI tool that imports bank transaction CSVs into a local SQLite database and uses AI to auto-categorize transactions and surface spending insights.

## Stack

| Concern     | Choice                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| Runtime     | **Bun** — use Bun APIs, never Node.js equivalents                                                                  |
| Language    | **TypeScript strict mode**                                                                                         |
| CLI         | **Commander.js** — parent command groups use `index.ts`; leaf subcommands live in sibling files in `src/commands/` |
| Prompts     | **@clack/prompts** — all user-facing output goes through this                                                      |
| Database    | **`bun:sqlite`** — built-in, no ORM, prepared statements only                                                      |
| CSV parsing | **`csv-parse`**                                                                                                    |
| AI          | **Vercel AI SDK** (`ai`) — `generateObject`, `generateText`, `streamText`                                          |
| AI provider | **GitHub Models** (default) via `@ai-sdk/openai` with custom `baseURL`                                             |
| Validation  | **Zod** — all external data and LLM output validated with Zod schemas                                              |
| Testing     | **`bun test`** — Jest-compatible API, no extra test runner                                                         |

## Project Structure

```
src/
  commands/     ← standalone commands or grouped command directories
  db/           ← table-specific database modules; see database.instructions.md
  parsers/      ← source.ts (bank CSV parser)
  ai/           ← client.ts (model factory), prompts.ts
  index.ts      ← Commander root, registers all commands
.github/
  copilot-instructions.md ← Copilot chat/edit mode context
  instructions/           ← path-scoped instruction files
  skills/                 ← agent skills (auto-loaded by both tools)
  agents/                 ← GitHub Copilot agent definitions
.claude/
  agents/                 ← Claude Code sub-agent definitions
```

## Domain Knowledge

- Bank: Belgian bank, semicolon-delimited CSV export format
- Source CSV: semicolon-separated, comma decimals, French headers, metadata block before data rows
- Categories: 3-level UUID hierarchy (Necessities / Savings / Discretionary → subcategories → leaves)
- `category_id` is user-controlled; AI suggestions must be stored in `ai_category_id` — never silently overwrite `category_id`

## Detailed Rules

@.github/instructions/typescript.instructions.md
@.github/instructions/tests.instructions.md
@.github/instructions/database.instructions.md
@.github/instructions/data-privacy.instructions.md
@.github/instructions/security-and-owasp.instructions.md
@.github/instructions/object-calisthenics.instructions.md
@.github/instructions/commands.instructions.md

## Design Principles

### SOLID

- **Single Responsibility** — each module does one thing: `parsers/source.ts` parses CSVs, `ai/client.ts` creates the model; never mix concerns
- **Open/Closed** — extend behaviour via new files/functions, not by modifying stable ones; a new subcommand means a new file in its command group, not an expanded parent `index.ts`
- **Liskov Substitution** — AI provider adapters must be interchangeable; swapping `@ai-sdk/openai` for `@ai-sdk/anthropic` must require zero changes outside `ai/client.ts`
- **Interface Segregation** — expose only what callers need
- **Dependency Inversion** — commands depend on abstractions (`getModel()`, query helpers), not concrete SDKs; inject `db` as a parameter, never import a global instance

### KISS & DRY

- Solve the problem at hand, not the hypothetical future problem
- Prefer a plain `for` loop over a clever `reduce` when it reads more clearly
- Date parsing, amount parsing, and counterparty cleanup live in `parsers/source.ts` only
- Prompt templates live in `ai/prompts.ts` — no inline prompt strings in commands
- Reused Zod schemas live in `src/types.ts`

## What NOT to Do

- Do not install `better-sqlite3`, `node-sqlite3`, or any other SQLite package — use `bun:sqlite`
- Do not use `openai` npm package directly — use `@ai-sdk/openai` from the Vercel AI SDK
- Do not import from `fs`, `path`, or other Node built-ins when Bun equivalents exist
- Do not add `console.log` in production code — use `@clack/prompts` for all output
- Do not make changes outside the scope of the current task without asking first
