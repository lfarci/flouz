# Architecture

## Overview

**flouz** is a CLI tool for analyzing bank transactions using AI. It imports CSV exports from your bank, stores transactions in a local SQLite database, and uses AI to automatically categorize spending.

## Stack

| Technology | Role |
|---|---|
| [Bun](https://bun.sh) | Runtime, test runner, package manager |
| [Commander.js](https://github.com/tj/commander.js) | CLI framework (commands, options, help) |
| [@clack/prompts](https://github.com/natemoo-re/clack) | Interactive terminal UI (spinners, prompts) |
| [bun:sqlite](https://bun.sh/docs/api/sqlite) | Local SQLite database (built into Bun) |
| [csv-parse](https://csv.js.org/parse/) | CSV parsing with configurable separators |
| [Vercel AI SDK](https://sdk.vercel.ai) | AI provider abstraction layer |
| [Zod](https://zod.dev) | Schema validation for AI structured output |

## Project Structure

```
src/
├── commands/          # Commander.js command handlers and grouped subcommands
│   ├── accounts/      # Account management command group
│   └── transactions/  # Transaction command group (import, export, list)
├── db/                # Database access layer — schema, migrations, prepared statements
├── parsers/           # CSV parsing logic, one parser per bank format
└── ai/                # AI provider setup, prompts, and categorization logic
```

## Key Design Principles

- **SOLID** — each module has a single responsibility; dependencies are injected rather than hardcoded
- **KISS** — prefer simple, readable code over clever abstractions
- **DRY** — shared logic (date formatting, IBAN normalization) lives in utilities, not duplicated across parsers
- **TDD** — tests are written with `bun test`; unit tests cover parsers, DB helpers, and AI output schemas

## AI Provider Switching

The AI provider is configured through environment variables, making it a one-line swap. The setup lives in `src/ai/` and uses the Vercel AI SDK's provider abstraction:

```ts
// GitHub Models (default — free with Copilot subscription)
import { createOpenAI } from "@ai-sdk/openai";
const model = createOpenAI({
  baseURL: process.env.AI_BASE_URL ?? "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_TOKEN,
})("gpt-4o-mini");

// Anthropic
import { createAnthropic } from "@ai-sdk/anthropic";
const model = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })("claude-3-5-haiku-20241022");

// Ollama (local)
import { createOllama } from "ollama-ai-provider";
const model = createOllama()("llama3.2");
```

Switch by changing the import and constructor — the rest of the code stays the same.
