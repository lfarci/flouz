# src/ai

AI integration layer — model access, prompt building, and transaction categorization.

## Modules

| File | Responsibility |
| --- | --- |
| `client.ts` | Creates the AI model instance via `@ai-sdk/openai`; reads token and base URL from config or env vars |
| `prompts.ts` | Builds the categorization prompt from a transaction, category list, and optional past examples |
| `schemas.ts` | Zod schema and type for the structured LLM output (`categorySlug`, `confidence`, `reasoning`) |
| `categorize.ts` | Orchestrates categorization: fast-path (counterparty consensus) then LLM fallback |

## Fast-path vs LLM

`categorizeTransaction` checks `transaction_category_suggestions` first. If a counterparty has ≥ 3 approved suggestions all pointing to the same category (`MIN_FAST_PATH_APPROVALS`), that category is returned immediately with `confidence: 1.0` and no API call is made.

## Configuration

| Source | Keys |
| --- | --- |
| `Bun.env` | `GITHUB_TOKEN`, `AI_MODEL`, `AI_BASE_URL` |
| `flouz config` | `githubToken`, `aiModel`, `aiBaseUrl` |

Env vars take precedence over stored config. Default model: `openai/gpt-4o-mini` via `https://models.github.ai/inference`.

## Provider contract

`getModel()` returns a Vercel AI SDK–compatible chat model. Swapping the provider (e.g. `@ai-sdk/anthropic`) requires changes only in `client.ts`.
