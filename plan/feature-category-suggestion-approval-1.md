---
goal: Define and implement the end-to-end approval and application flow for AI-generated transaction category suggestions
version: 1.0
date_created: 2026-04-15
last_updated: 2026-04-15
owner: lfarci
status: Planned
tags: [feature, ai, categories, transactions, cli, database]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines a deterministic workflow for reviewing AI-generated category suggestions before applying them to transactions. The design preserves the current invariant that AI never writes directly to `transactions.category_id`, introduces explicit approval state for suggestions, and adds CLI commands for listing pending suggestions, approving them, rejecting incorrect suggestions by deleting them, and applying approved suggestions in a controlled batch.

## 1. Requirements & Constraints

- **REQ-001**: Preserve the existing invariant documented in `src/db/transaction_category_suggestions/README.md`: AI suggestion generation must never write directly to `transactions.category_id`.
- **REQ-002**: Implement the persisted suggestion lifecycle `pending -> approved -> applied` for each suggestion row.
- **REQ-003**: Provide a CLI flow that allows the user to inspect pending suggestions before approval.
- **REQ-004**: Provide a CLI command that approves pending suggestions without modifying `transactions.category_id`.
- **REQ-005**: Provide a CLI command that applies only approved suggestions by copying the approved `category_id` into `transactions.category_id`.
- **REQ-006**: Provide a CLI command that rejects incorrect suggestions by deleting the suggestion row without modifying `transactions.category_id`.
- **REQ-007**: Ensure apply operations skip transactions that already have a manual category assigned at apply time.
- **REQ-008**: Ensure apply operations are idempotent; re-running apply must not duplicate work or corrupt state.
- **REQ-009**: Keep the current `transactions categorize` command behavior focused on suggestion generation only.
- **REQ-010**: Surface counts and clear terminal feedback through `@clack/prompts` for review, approval, rejection, and apply commands.
- **REQ-011**: Support the same transaction filters currently used by `transactions categorize`: `from`, `to`, `search`, `limit`, and `db`.
- **REQ-012**: Expose query helpers that can retrieve pending suggestions and approved suggestions with transaction details for CLI presentation.
- **REQ-013**: Preserve a record of suggestion lifecycle state after application; do not delete suggestion rows during apply.
- **SEC-001**: Use prepared statements only for all SQLite writes and reads.
- **SEC-002**: Fail closed: if approval or apply state is ambiguous or inconsistent, the command must skip the row and report the first error.
- **SEC-003**: Prevent overwriting explicit user choices by requiring `transactions.category_id IS NULL` in the apply mutation.
- **CON-001**: Runtime must remain Bun and database access must use `bun:sqlite`.
- **CON-002**: CLI commands must follow the repository convention: parent groups use `index.ts`; leaf commands live in sibling files under `src/commands/`.
- **CON-003**: Tests must use `new Database(':memory:')` and `bun test`.
- **CON-004**: No real financial data, IBANs, or credentials may be added to tests, fixtures, docs, or code.
- **GUD-001**: Keep functions short and single-purpose; add helpers instead of extending `categorize.ts` into a multi-responsibility command.
- **GUD-002**: Update README documentation for every new user-facing command.
- **PAT-001**: Introduce approval state in the existing `transaction_category_suggestions` table instead of creating a second workflow table.
- **PAT-002**: Use explicit persisted status values: `pending`, `approved`, and `applied`.
- **PAT-003**: Model approval and application as suggestion state transitions; model rejection as explicit deletion of an incorrect suggestion row.

## 2. Implementation Steps

### Implementation Phase 1

- **GOAL-001**: Extend the suggestion persistence model so suggestions can be reviewed, approved, rejected by deletion, and applied without losing their audit trail after application.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                               | Completed  | Date                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- | --- | --- |
| TASK-001 | Update `src/types.ts` to add `TransactionCategorySuggestionStatus = 'pending'                                                                                                                                                                                                                                                                                                                                             | 'approved' | 'applied'`plus lifecycle fields on`TransactionCategorySuggestion`: `status`, `reviewedAt?`, and `appliedAt?`. |     |     |
| TASK-002 | Update `src/db/transaction_category_suggestions/schema.ts` to add `status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','applied'))`, `reviewed_at TEXT`, and `applied_at TEXT` to the table definition.                                                                                                                                                                                          |            |                                                                                                               |
| TASK-003 | Update `src/db/schema.ts` initialization logic so existing databases receive the new columns safely via additive migration statements guarded by `PRAGMA table_info` checks.                                                                                                                                                                                                                                              |            |                                                                                                               |
| TASK-004 | Update `src/db/transaction_category_suggestions/mutations.ts` so `upsertTransactionCategorySuggestion` always writes `status = 'pending'`, clears `reviewed_at`, clears `applied_at`, and refreshes `suggested_at` when a suggestion is regenerated.                                                                                                                                                                      |            |                                                                                                               |
| TASK-005 | Add new mutation functions in `src/db/transaction_category_suggestions/mutations.ts`: `approveTransactionCategorySuggestion(db, transactionId)`, `deleteTransactionCategorySuggestion(db, transactionId)`, and `markApprovedSuggestionApplied(db, transactionId)` using prepared statements only. `deleteTransactionCategorySuggestion` must delete only `pending` or `approved` rows and must not delete `applied` rows. |            |                                                                                                               |
| TASK-006 | Add schema and mutation tests in `src/db/transaction_category_suggestions/schema.test.ts` and `src/db/transaction_category_suggestions/mutations.test.ts` covering default state, valid status transitions, reset-to-pending on upsert, and deletion behavior for rejected suggestions.                                                                                                                                   |            |                                                                                                               |

### Implementation Phase 2

- **GOAL-002**: Add query helpers that return review-ready and apply-ready suggestion datasets with transaction context and deterministic filtering.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-007 | Extend `src/types.ts` with `SuggestionFilters` containing `from?`, `to?`, `search?`, `limit?`, and `status?` for reuse across CLI commands and database queries.                                                                                                                                                                                                                                                                                                            |           |      |
| TASK-008 | Replace `getSuggestedTransactionIds` in `src/db/transaction_category_suggestions/queries.ts` with a broader query surface while keeping the existing function for `categorize.ts` compatibility. Add `getTransactionCategorySuggestions(db, filters)` that joins `transaction_category_suggestions`, `transactions`, and `categories` to return transaction date, counterparty, amount, suggested category id, suggested category name, confidence, status, and timestamps. |           |      |
| TASK-009 | Add `getApprovedSuggestionTransactionIds(db, filters)` in `src/db/transaction_category_suggestions/queries.ts` to drive batch apply without embedding selection logic in CLI code.                                                                                                                                                                                                                                                                                          |           |      |
| TASK-010 | Update `src/db/transaction_category_suggestions/queries.test.ts` to cover status filtering, search filtering, date filtering, result ordering by `suggested_at DESC`, and exclusion of already categorized transactions from the apply-ready set.                                                                                                                                                                                                                           |           |      |
| TASK-011 | Keep `src/db/transactions/queries.ts` categorization eligibility logic unchanged: deleting a rejected suggestion row must automatically make the transaction eligible again for `transactions categorize`. Verify this behavior in tests.                                                                                                                                                                                                                                   |           |      |

### Implementation Phase 3

- **GOAL-003**: Add a dedicated `transactions suggestions` CLI group with explicit review, approval, rejection, and apply commands.

| Task     | Description                                                                                                                                                                                                                                                                                                | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-012 | Create `src/commands/transactions/suggestions/index.ts` exporting `createSuggestionsCommand(defaultDb: string): Command` and registering the leaf commands `list`, `approve`, `reject`, and `apply`.                                                                                                       |           |      |
| TASK-013 | Create `src/commands/transactions/suggestions/list.ts` implementing `flouz transactions suggestions list [options]` to show pending suggestions by default using `@clack/prompts` output helpers and the query helpers from `src/db/transaction_category_suggestions/queries.ts`.                          |           |      |
| TASK-014 | Create `src/commands/transactions/suggestions/approve.ts` implementing `flouz transactions suggestions approve [options]` that selects `status = 'pending'` suggestions by filters, marks them `approved`, logs the number approved, and leaves `transactions.category_id` unchanged.                      |           |      |
| TASK-015 | Create `src/commands/transactions/suggestions/reject.ts` implementing `flouz transactions suggestions reject [options]` that deletes selected `pending` or `approved` suggestions, leaves `transactions.category_id` unchanged, and makes those transactions eligible again for `transactions categorize`. |           |      |
| TASK-016 | Create `src/commands/transactions/suggestions/apply.ts` implementing `flouz transactions suggestions apply [options]` that loads approved suggestion IDs, updates `transactions.category_id` only where it is still `NULL`, then marks the suggestion rows `applied` with `applied_at`.                    |           |      |
| TASK-017 | Update `src/commands/transactions/index.ts` to register `createSuggestionsCommand(defaultDb)` under the existing `transactions` group.                                                                                                                                                                     |           |      |
| TASK-018 | Keep `src/commands/transactions/categorize.ts` unchanged in scope; do not merge approval, rejection, or apply behavior into the categorize command.                                                                                                                                                        |           |      |

### Implementation Phase 4

- **GOAL-004**: Implement a safe apply workflow with transactional guarantees and deterministic command behavior.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                               | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-020 | Add `applyApprovedCategorySuggestions(db, filters)` to `src/db/transaction_category_suggestions/mutations.ts` or a new focused module `src/db/transaction_category_suggestions/apply.ts`. The function must wrap the full batch in a SQLite transaction, read approved IDs once, update transactions, mark successful suggestion rows as applied, and return `{ applied: number, skipped: number, firstError?: string }`. |           |      |
| TASK-021 | Reuse `updateCategory` from `src/db/transactions/mutations.ts` only if it is wrapped by the batch transaction; otherwise add a batch-safe mutation that enforces `WHERE id = ? AND category_id IS NULL`.                                                                                                                                                                                                                  |           |      |
| TASK-022 | Ensure the apply command treats suggestions as stale and skips them when `transactions.category_id` is already non-null, when the suggestion status is not `approved`, or when the referenced category no longer exists.                                                                                                                                                                                                  |           |      |
| TASK-023 | Ensure the apply command emits summary output: selected approved suggestions, applied count, skipped count, and first error when present, matching the style used in `src/commands/transactions/categorize.ts`.                                                                                                                                                                                                           |           |      |
| TASK-019 | Add `applyApprovedCategorySuggestions(db, filters)` to `src/db/transaction_category_suggestions/mutations.ts` or a new focused module `src/db/transaction_category_suggestions/apply.ts`. The function must wrap the full batch in a SQLite transaction, read approved IDs once, update transactions, mark successful suggestion rows as applied, and return `{ applied: number, skipped: number, firstError?: string }`. |           |      |
| TASK-020 | Reuse `updateCategory` from `src/db/transactions/mutations.ts` only if it is wrapped by the batch transaction; otherwise add a batch-safe mutation that enforces `WHERE id = ? AND category_id IS NULL`.                                                                                                                                                                                                                  |           |      |
| TASK-021 | Ensure the apply command treats suggestions as stale and skips them when `transactions.category_id` is already non-null, when the suggestion status is not `approved`, or when the referenced category no longer exists.                                                                                                                                                                                                  |           |      |
| TASK-022 | Ensure the apply command emits summary output: selected approved suggestions, applied count, skipped count, and first error when present, matching the style used in `src/commands/transactions/categorize.ts`.                                                                                                                                                                                                           |           |      |
| TASK-023 | Add tests proving that repeated `apply` runs are idempotent and that partial failures do not leave suggestion and transaction state out of sync.                                                                                                                                                                                                                                                                          |           |      |

### Implementation Phase 5

- **GOAL-005**: Document the approved workflow and cover it with command-level and integration tests.

| Task     | Description                                                                                                                                                                                                                                                                                                                  | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-024 | Add command tests in `src/commands/transactions/` for `suggestions/list`, `suggestions/approve`, `suggestions/reject`, and `suggestions/apply`, following the existing command test style used by `list.test.ts` and `import.test.ts`.                                                                                       |           |      |
| TASK-025 | Add an end-to-end test scenario that seeds transactions, runs suggestion upsert, rejects incorrect suggestions by deletion, approves a subset, applies approved suggestions, and asserts final transaction and suggestion states. Place the test beside the relevant command or DB module based on the existing test layout. |           |      |
| TASK-026 | Update `src/commands/transactions/README.md` to document the new `transactions suggestions` group, all options, and the canonical workflow: `categorize -> suggestions list -> suggestions approve or reject -> suggestions apply`.                                                                                          |           |      |
| TASK-027 | Update `README.md` to replace the current inspect-then-categorize workflow with the full suggestion review lifecycle and include concrete command examples.                                                                                                                                                                  |           |      |
| TASK-028 | Update `src/db/transaction_category_suggestions/README.md` to document the new lifecycle states, the meaning of `reviewed_at` and `applied_at`, the fact that reject deletes incorrect suggestions, and the rule that apply never overwrites a manual category.                                                              |           |      |

## 3. Alternatives

- **ALT-001**: Apply suggestions directly inside `transactions categorize`. Rejected because it breaks the existing invariant that AI never writes directly to `transactions.category_id` and removes human review.
- **ALT-002**: Add only a single `approve` command that also applies immediately. Rejected because the user explicitly asked to define both approval and apply flow as separate stages.
- **ALT-003**: Store approvals in a separate `approved_transaction_category_suggestions` table. Rejected because it duplicates the same entity lifecycle and adds unnecessary join complexity.
- **ALT-004**: Delete suggestion rows after apply. Rejected because it removes lifecycle visibility and prevents audit of what the AI suggested versus what was applied.
- **ALT-005**: Persist a `rejected` status. Rejected because the only required reject behavior is to discard an incorrect suggestion and re-open the transaction to future categorization; deletion achieves that with less schema and query complexity.

## 4. Dependencies

- **DEP-001**: Existing command framework in `src/commands/transactions/index.ts` and Commander.js command registration patterns.
- **DEP-002**: Existing suggestion storage model in `src/db/transaction_category_suggestions/schema.ts`, `src/db/transaction_category_suggestions/mutations.ts`, and `src/db/transaction_category_suggestions/queries.ts`.
- **DEP-003**: Existing transaction update mutation in `src/db/transactions/mutations.ts`.
- **DEP-004**: Existing category query surface in `src/db/categories/queries.ts` for resolving category labels when listing suggestions.
- **DEP-005**: Existing CLI output conventions using `@clack/prompts` and any table helper already used in transaction list output.

## 5. Files

- **FILE-001**: `src/types.ts` — add suggestion lifecycle types and shared suggestion filter types.
- **FILE-002**: `src/db/schema.ts` — add additive migration logic for new suggestion columns.
- **FILE-003**: `src/db/transaction_category_suggestions/schema.ts` — extend table definition with lifecycle columns.
- **FILE-004**: `src/db/transaction_category_suggestions/mutations.ts` — implement approve/delete/apply lifecycle mutations.
- **FILE-005**: `src/db/transaction_category_suggestions/queries.ts` — add list and apply-ready queries.
- **FILE-006**: `src/db/transactions/mutations.ts` — add or tighten the safe category application mutation if required.
- **FILE-007**: `src/commands/transactions/index.ts` — register the new suggestions command group.
- **FILE-008**: `src/commands/transactions/suggestions/index.ts` — parent group for suggestion workflow commands.
- **FILE-009**: `src/commands/transactions/suggestions/list.ts` — list pending or filtered suggestions.
- **FILE-010**: `src/commands/transactions/suggestions/approve.ts` — approve suggestions without applying them.
- **FILE-011**: `src/commands/transactions/suggestions/reject.ts` — delete incorrect suggestions and reopen those transactions to future categorization.
- **FILE-012**: `src/commands/transactions/suggestions/apply.ts` — apply approved suggestions to transactions.
- **FILE-013**: `src/commands/transactions/README.md` — document new command group and workflow.
- **FILE-014**: `README.md` — document the complete user workflow.
- **FILE-015**: `src/db/transaction_category_suggestions/README.md` — document the suggestion lifecycle model and reject-by-deletion behavior.
- **FILE-016**: `src/db/transaction_category_suggestions/schema.test.ts` — schema coverage for new columns and constraints.
- **FILE-017**: `src/db/transaction_category_suggestions/mutations.test.ts` — mutation coverage for lifecycle transitions and deletion behavior.
- **FILE-018**: `src/db/transaction_category_suggestions/queries.test.ts` — query coverage for pending/approved/applied filtering.
- **FILE-019**: `src/commands/transactions/index.test.ts` — verify registration of the new suggestions command group.
- **FILE-020**: New command tests under `src/commands/transactions/suggestions/` or `src/commands/transactions/` matching existing repository conventions.

## 6. Testing

- **TEST-001**: Verify `transaction_category_suggestions` defaults new rows to `status = 'pending'` with `reviewed_at` and `applied_at` null.
- **TEST-002**: Verify `upsertTransactionCategorySuggestion` resets an `approved` or `applied` suggestion back to `pending` and refreshes timestamps.
- **TEST-003**: Verify `approveTransactionCategorySuggestion` changes only `pending` rows and sets `reviewed_at`.
- **TEST-004**: Verify `deleteTransactionCategorySuggestion` deletes only `pending` or `approved` rows, never deletes `applied` rows, and makes the transaction eligible again for `transactions categorize`.
- **TEST-005**: Verify `getTransactionCategorySuggestions` returns joined transaction context and filters by `status`, `search`, `from`, `to`, and `limit`.
- **TEST-006**: Verify `getApprovedSuggestionTransactionIds` excludes transactions whose `category_id` is already non-null.
- **TEST-007**: Verify `transactions suggestions list` shows pending suggestions by default and can list approved suggestions when `--status approved` is passed.
- **TEST-008**: Verify `transactions suggestions approve` marks only matching pending suggestions as approved and reports the correct count.
- **TEST-009**: Verify `transactions suggestions reject` deletes only matching pending or approved suggestions and preserves `transactions.category_id` as null.
- **TEST-010**: Verify `transactions suggestions apply` copies category IDs into transactions only for approved suggestions with uncategorized transactions.
- **TEST-011**: Verify `transactions suggestions apply` is idempotent across repeated runs.
- **TEST-012**: Verify `transactions suggestions apply` skips stale rows when a transaction was manually categorized after approval.
- **TEST-013**: Verify the end-to-end workflow `categorize -> reject or approve -> apply` produces deleted rows for rejected suggestions and `status = 'applied'` plus `transactions.category_id = suggestion.category_id` for applied suggestions.

## 7. Risks & Assumptions

- **RISK-001**: Existing databases created before the lifecycle columns were introduced may fail commands unless additive migration logic is implemented in `src/db/schema.ts`.
- **RISK-002**: If approval and apply commands use different filter semantics, users may approve one dataset and unintentionally apply another. The CLI must share a single `SuggestionFilters` contract.
- **RISK-003**: Reject-by-deletion must be constrained so it cannot remove `applied` rows; otherwise the audit trail for already-applied suggestions would be lost.
- **RISK-004**: A batch apply implementation that updates transactions and suggestion rows outside one database transaction can leave inconsistent state after a failure.
- **ASSUMPTION-001**: Suggestion approval currently means approving the exact AI-proposed category without manual category override during the approval step.
- **ASSUMPTION-002**: The initial review UI can be non-interactive CLI filters rather than a prompt-by-prompt interactive reviewer.
- **ASSUMPTION-003**: Keeping applied suggestions in the table is acceptable and desirable for auditability.
- **ASSUMPTION-004**: Rejection is defined as discarding an incorrect suggestion before application, not as undoing an already applied category.
- **ASSUMPTION-005**: The project prefers incremental additive schema changes over introducing a formal migration framework at this stage.

## 8. Related Specifications / Further Reading

- `src/db/transaction_category_suggestions/README.md`
- `src/commands/transactions/README.md`
- `README.md`
- `.github/copilot-instructions.md`
