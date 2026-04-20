---
goal: Improve AI categorization accuracy by enriching prompts with user history, adding a fast-path for known counterparties, and surfacing reasoning to the user
version: 1.0
date_created: 2026-04-16
last_updated: 2026-04-16
owner: lfarci
status: Planned
tags: [feature, ai, categories, transactions, prompt-engineering, few-shot]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

The current categorization pipeline is a single-shot prompt: it sends the transaction details and the full category list to the model and hopes for the best. It has no memory of the user's prior decisions and no mechanism to improve over time. This plan adds three mutually reinforcing improvements:

1. **Few-shot examples from approved history** — include the user's own approved/applied suggestions as in-prompt examples so the model sees how _this user_ categorizes transactions.
2. **Counterparty fast-path** — when a counterparty already has a consistent approved category, bypass the AI call entirely and reuse that mapping.
3. **Reasoning field** — ask the model to explain its choice; store and display that reasoning so the user can catch mistakes early and understand the model's logic.

Each phase is independent and can ship separately, but all three compound.

## 1. Requirements & Constraints

- **REQ-001**: The prompt enrichment must use only approved or applied suggestions from `transaction_category_suggestions`; pending or rejected (deleted) suggestions must never become examples.
- **REQ-002**: The number of few-shot examples included in the prompt must be capped to avoid token bloat; default cap is 5 examples, configurable via a constant in `ai/prompts.ts`.
- **REQ-003**: Few-shot examples must be selected by relevance: prioritize examples from the same counterparty, then from the same category, then most-recently approved.
- **REQ-004**: The fast-path must only activate when the counterparty has at least `MIN_FAST_PATH_APPROVALS` consistent approved/applied suggestions for the same category; default is 3.
- **REQ-005**: The fast-path result must still be stored in `transaction_category_suggestions` as a suggestion with `status = 'pending'`; it must not write directly to `transactions.category_id`.
- **REQ-006**: The fast-path must set confidence to `1.0` and model to a sentinel string `'fast-path'` so the origin is traceable.
- **REQ-007**: The AI response schema must be extended with an optional `reasoning` field (string, max 200 characters).
- **REQ-008**: The `reasoning` field must be stored in `transaction_category_suggestions` and surfaced in `transactions suggestions list`.
- **REQ-009**: Existing tests must continue to pass without modification; new behavior must be covered by new tests.
- **REQ-010**: `categorizeTransaction` must remain the single call site for AI invocation; commands must not call `generateText` directly.
- **SEC-001**: Approved transaction counterparty names used as few-shot examples are financial data; they must never be logged to stdout or written to files outside the database.
- **SEC-002**: All new database reads must use prepared statements only.
- **CON-001**: Runtime remains Bun; database access uses `bun:sqlite`.
- **CON-002**: No new npm packages; all new behavior uses existing dependencies (`ai`, `@ai-sdk/openai`, `bun:sqlite`, `zod`).
- **CON-003**: Tests use `new Database(':memory:')` and `bun test` with `mock.module` for AI calls.
- **CON-004**: No real transaction data, IBANs, or merchant names in fixtures.

## 2. Implementation Steps

### Phase 1 — Few-Shot Examples in the Prompt

- **GOAL-001**: Enrich the categorization prompt with approved examples drawn from the user's own history so the model can match the user's categorization style.

| Task     | Description                                                                                                                                                                                                                                                                                                                    | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-001 | Add `getCategorizationExamples(db, transaction, limit)` to `src/db/transaction_category_suggestions/queries.ts`. The query selects approved or applied suggestions joined to transactions and categories, ordered by: exact counterparty match first, then `suggested_at DESC`. Accept a `limit` parameter defaulting to `5`.  |           |      |
| TASK-002 | Add `CategorizationExample` type to `src/types.ts` containing `counterparty`, `amount`, `date`, `categoryId`, `categoryName`, and `categorySlug`.                                                                                                                                                                              |           |      |
| TASK-003 | Update `buildTransactionCategorizationPrompt` in `src/ai/prompts.ts` to accept an optional `examples: CategorizationExample[]` parameter. When examples are present, inject a `## Examples` section before `## Instructions` that shows each example as a formatted block with its transaction fields and the chosen category. |           |      |
| TASK-004 | Update `categorizeTransaction` in `src/ai/categorize.ts` to accept an optional `examples: CategorizationExample[]` parameter and forward it to `buildTransactionCategorizationPrompt`.                                                                                                                                         |           |      |
| TASK-005 | Update `src/commands/transactions/categorize.ts` to call `getCategorizationExamples(db, transaction, 5)` for each transaction before calling `categorizeTransaction`, and pass the result as the `examples` argument.                                                                                                          |           |      |
| TASK-006 | Add tests in `src/db/transaction_category_suggestions/queries.test.ts` verifying: examples are ordered with same-counterparty first, only approved/applied rows are returned, the limit is respected, and an empty array is returned when no history exists.                                                                   |           |      |
| TASK-007 | Add tests in `src/ai/prompts.test.ts` verifying: the `## Examples` section is absent when no examples are given, examples are rendered with correct field values, and the example section appears before `## Instructions`.                                                                                                    |           |      |

### Phase 2 — Counterparty Fast-Path

- **GOAL-002**: Skip the AI call entirely for counterparties that already have a clear, consistent approved category in the user's history.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                   | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-008 | Add `getCounterpartyCategoryConsensus(db, counterparty, minCount)` to `src/db/transaction_category_suggestions/queries.ts`. The query counts approved/applied suggestions grouped by `(counterparty, category_id)`; returns the category ID and its count only when `count >= minCount` AND that single category accounts for all approved suggestions for that counterparty. |           |      |
| TASK-009 | Add `CounterpartyCategoryConsensus` type to `src/types.ts` containing `categoryId`, `categoryName`, and `count`.                                                                                                                                                                                                                                                              |           |      |
| TASK-010 | Add `buildFastPathResult(categoryId, model)` factory in `src/ai/categorize.ts` that returns a `CategorizationResult` with `confidence: 1.0` and `model: 'fast-path'`.                                                                                                                                                                                                         |           |      |
| TASK-011 | Update `categorizeTransaction` in `src/ai/categorize.ts` to accept `db: Database` and call `getCounterpartyCategoryConsensus` before invoking the model. When consensus is found, return the fast-path result without calling `generateText`. When not found, proceed as before.                                                                                              |           |      |
| TASK-012 | Update `src/commands/transactions/categorize.ts` to pass `db` to `categorizeTransaction`.                                                                                                                                                                                                                                                                                     |           |      |
| TASK-013 | Export `MIN_FAST_PATH_APPROVALS = 3` constant from `src/ai/categorize.ts` so tests and the command can reference the threshold without duplicating the magic number.                                                                                                                                                                                                          |           |      |
| TASK-014 | Add tests in `src/db/transaction_category_suggestions/queries.test.ts` verifying: consensus is returned only when the single category reaches the min count, consensus is absent when approvals are split across two categories, and pending suggestions are excluded from the count.                                                                                         |           |      |
| TASK-015 | Add tests in `src/ai/categorize.test.ts` verifying: the fast-path is returned and `generateText` is not called when consensus exists, the AI path is taken when consensus is absent, and `model` is set to `'fast-path'` on fast-path results.                                                                                                                                |           |      |

### Phase 3 — Reasoning Field

- **GOAL-003**: Ask the model to explain its choice, persist that reasoning, and display it in suggestion listings so the user can spot mistakes without re-running categorization.

| Task     | Description                                                                                                                                                                                                                      | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-016 | Extend `TransactionCategorizationResultSchema` in `src/ai/schemas.ts` to add `reasoning: z.string().max(200).optional()`.                                                                                                        |           |      |
| TASK-017 | Update the `## Instructions` section in `buildTransactionCategorizationPrompt` to ask the model for a third field `"reasoning"`: a short sentence explaining why this category was chosen.                                       |           |      |
| TASK-018 | Add `reasoning TEXT` column to `transaction_category_suggestions` in `src/db/transaction_category_suggestions/schema.ts`.                                                                                                        |           |      |
| TASK-019 | Add an additive migration in `src/db/schema.ts` to add the `reasoning` column to existing databases using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS reasoning TEXT`.                                                             |           |      |
| TASK-020 | Update `TransactionCategorySuggestion` in `src/types.ts` to include `reasoning?: string`. Update `SuggestionWithContext` accordingly.                                                                                            |           |      |
| TASK-021 | Update `upsertTransactionCategorySuggestion` in `src/db/transaction_category_suggestions/mutations.ts` to accept and persist `reasoning`.                                                                                        |           |      |
| TASK-022 | Update `getTransactionCategorySuggestions` in `src/db/transaction_category_suggestions/queries.ts` to include `s.reasoning AS reasoning` in the SELECT.                                                                          |           |      |
| TASK-023 | Update `src/commands/transactions/categorize.ts` to forward `reasoning` from the AI result to `upsertTransactionCategorySuggestion`.                                                                                             |           |      |
| TASK-024 | Update `src/commands/transactions/suggestions/list.ts` to display the `reasoning` field when present, shown below the category name in a muted style using `@clack/prompts`.                                                     |           |      |
| TASK-025 | Add schema and mutation tests covering: the `reasoning` column stores and retrieves a string, `reasoning` is null when absent, and `upsertTransactionCategorySuggestion` overwrites the previous reasoning on re-categorization. |           |      |
| TASK-026 | Add a prompt test verifying the `reasoning` instruction is present in the generated prompt.                                                                                                                                      |           |      |

## 3. Alternatives

- **ALT-001**: Fine-tune a model on approved history. Rejected because it requires significant data volume and infrastructure beyond this project's scope; prompt-based few-shot is cheaper and achievable with the existing stack.
- **ALT-002**: Store examples in a dedicated `categorization_examples` table instead of querying from suggestions. Rejected because approved suggestions already contain exactly this information — a second table would duplicate data and add sync complexity.
- **ALT-003**: Make the fast-path threshold configurable via CLI flag. Deferred; a single constant is sufficient now and can be promoted to a config setting later if needed.
- **ALT-004**: Apply the fast-path silently during import rather than during the `categorize` command. Rejected because it would bypass the user review workflow that the suggestion lifecycle enforces.
- **ALT-005**: Add a `--no-fast-path` flag to the categorize command. Deferred; not needed until the fast-path proves to be problematic in practice.
- **ALT-006**: Truncate long reasoning strings in the prompt instead of enforcing `max(200)` in the schema. Rejected because capping at the schema level prevents token waste and guarantees consistent storage width.

## 4. Dependencies

- **DEP-001**: `src/ai/prompts.ts` — extended to accept and render few-shot examples; prompt changes must not break existing tests.
- **DEP-002**: `src/ai/categorize.ts` — extended with fast-path logic; must remain the single AI call site.
- **DEP-003**: `src/db/transaction_category_suggestions/queries.ts` — new query helpers for examples and consensus.
- **DEP-004**: `src/db/transaction_category_suggestions/mutations.ts` — `upsertTransactionCategorySuggestion` extended to accept `reasoning`.
- **DEP-005**: `src/db/transaction_category_suggestions/schema.ts` — new `reasoning` column.
- **DEP-006**: `src/db/schema.ts` — additive migration for `reasoning` column.
- **DEP-007**: `src/types.ts` — new `CategorizationExample`, `CounterpartyCategoryConsensus` types; updated `TransactionCategorySuggestion` and `SuggestionWithContext`.
- **DEP-008**: `src/commands/transactions/categorize.ts` — wires examples and db into `categorizeTransaction`.
- **DEP-009**: `src/commands/transactions/suggestions/list.ts` — displays reasoning field.
- **DEP-010**: Plan `feature-category-suggestion-approval-1.md` — this plan depends on the suggestion lifecycle (status, reviewed_at, applied_at) being in place; Phases 1–2 of the approval plan must be merged first.

## 5. Files

- **FILE-001**: `src/types.ts` — add `CategorizationExample`, `CounterpartyCategoryConsensus`; extend `TransactionCategorySuggestion` and `SuggestionWithContext` with `reasoning?`.
- **FILE-002**: `src/ai/schemas.ts` — add optional `reasoning` to the Zod validation schema.
- **FILE-003**: `src/ai/prompts.ts` — add `examples` parameter; render `## Examples` section; add `reasoning` instruction.
- **FILE-004**: `src/ai/categorize.ts` — add fast-path logic; thread `examples` and `db` through; export `MIN_FAST_PATH_APPROVALS`.
- **FILE-005**: `src/db/transaction_category_suggestions/schema.ts` — add `reasoning TEXT` column.
- **FILE-006**: `src/db/schema.ts` — additive migration for `reasoning` column.
- **FILE-007**: `src/db/transaction_category_suggestions/mutations.ts` — add `reasoning` to upsert.
- **FILE-008**: `src/db/transaction_category_suggestions/queries.ts` — add `getCategorizationExamples`, `getCounterpartyCategoryConsensus`; add `reasoning` to `getTransactionCategorySuggestions`.
- **FILE-009**: `src/commands/transactions/categorize.ts` — pass `db` and `examples` to `categorizeTransaction`; forward `reasoning` to upsert.
- **FILE-010**: `src/commands/transactions/suggestions/list.ts` — render reasoning field.
- **FILE-011**: `src/ai/prompts.test.ts` — new test file for prompt rendering assertions.
- **FILE-012**: `src/ai/categorize.test.ts` — new or extended test file for fast-path behavior.
- **FILE-013**: `src/db/transaction_category_suggestions/queries.test.ts` — extended with example and consensus query tests.
- **FILE-014**: `src/db/transaction_category_suggestions/schema.test.ts` — extended with reasoning column tests.
- **FILE-015**: `src/db/transaction_category_suggestions/mutations.test.ts` — extended with reasoning persistence tests.

## 6. Testing

- **TEST-001**: `getCategorizationExamples` returns empty array when no approved/applied suggestions exist.
- **TEST-002**: `getCategorizationExamples` orders same-counterparty matches before other approved suggestions.
- **TEST-003**: `getCategorizationExamples` respects the `limit` parameter.
- **TEST-004**: `getCategorizationExamples` excludes pending and deleted suggestions.
- **TEST-005**: `buildTransactionCategorizationPrompt` with no examples does not include `## Examples` section.
- **TEST-006**: `buildTransactionCategorizationPrompt` with examples includes `## Examples` section before `## Instructions`.
- **TEST-007**: Each example block contains counterparty, amount, date, and chosen category name.
- **TEST-008**: `buildTransactionCategorizationPrompt` includes `reasoning` instruction in `## Instructions`.
- **TEST-009**: `getCounterpartyCategoryConsensus` returns the category ID when all approvals for that counterparty agree on one category and count >= minCount.
- **TEST-010**: `getCounterpartyCategoryConsensus` returns null when approvals are split across two categories.
- **TEST-011**: `getCounterpartyCategoryConsensus` returns null when approved count is below minCount.
- **TEST-012**: `getCounterpartyCategoryConsensus` excludes pending suggestions from the count.
- **TEST-013**: `categorizeTransaction` returns fast-path result with `model = 'fast-path'` and `confidence = 1.0` when consensus exists.
- **TEST-014**: `categorizeTransaction` calls `generateText` and not the fast-path when consensus is absent.
- **TEST-015**: `upsertTransactionCategorySuggestion` persists `reasoning` when provided.
- **TEST-016**: `upsertTransactionCategorySuggestion` stores NULL for `reasoning` when omitted.
- **TEST-017**: `getTransactionCategorySuggestions` includes `reasoning` in returned rows.
- **TEST-018**: Re-categorizing a transaction overwrites the previous `reasoning` value.

## 7. Risks & Assumptions

- **RISK-001**: Including counterparty names from approved suggestions in the prompt means real financial data is sent to the AI provider. This is inherent to the feature and is not a new risk — the current implementation already sends the current transaction's counterparty. Documented here for visibility.
- **RISK-002**: A model that is not instruction-following enough may ignore the `reasoning` field instruction or return overly long strings. The `z.string().max(200)` Zod cap and the `optional()` modifier ensure the application handles both cases gracefully.
- **RISK-003**: The fast-path consensus query requires at least `MIN_FAST_PATH_APPROVALS` consistent approvals; a user who has approved few transactions will not benefit from it until history accumulates.
- **RISK-004**: Existing databases do not have the `reasoning` column; the additive migration in `src/db/schema.ts` must be tested against a pre-existing schema to confirm it applies cleanly.
- **ASSUMPTION-001**: The approval plan (`feature-category-suggestion-approval-1.md`) has been implemented and the `status`, `reviewed_at`, and `applied_at` columns exist in `transaction_category_suggestions`.
- **ASSUMPTION-002**: The AI provider and model in use support structured output with the Vercel AI SDK `Output.object` mode. No additional SDK changes are required for the reasoning field.
- **ASSUMPTION-003**: Five few-shot examples fit comfortably within the context window of the default model (`openai/gpt-4o-mini`) alongside the full category list.
- **ASSUMPTION-004**: The fast-path threshold of 3 approvals is a conservative starting point; it can be tuned without code changes by updating `MIN_FAST_PATH_APPROVALS`.

## 8. Related Specifications / Further Reading

- `plan/feature-category-suggestion-approval-1.md` — prerequisite plan for the suggestion lifecycle.
- `src/ai/prompts.ts` — current prompt structure.
- `src/ai/categorize.ts` — current AI call site.
- `src/db/transaction_category_suggestions/README.md` — suggestion lifecycle documentation.
- `src/commands/transactions/README.md` — command group overview.
