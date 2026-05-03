# Output Formatting Improvements — Design Spec

## Problem

The flouz CLI output formatting has several UX issues:

1. **No color differentiation in tables** — amounts, statuses, and confidence levels are plain text, making it hard to scan data at a glance.
2. **Duplicate formatting logic** — `formatAmount()` is defined in both `src/cli/format.ts` and `src/commands/transactions/list.ts`. Confidence formatting is inline in two places.
3. **No status indicators** — suggestion statuses (pending/approved/applied) render as plain text with no visual distinction. Note: rejection deletes the suggestion row rather than storing a "rejected" status.
4. **Silent truncation** — long text in table cells is cut off without any ellipsis indicator.
5. **Inconsistent empty states** — some commands use `log.info`, others use `log.warn` for "no results" messages, with varying tone and no follow-up hints.
6. **No `NO_COLOR` support** — the CLI does not respect the `NO_COLOR` environment variable or offer a `--no-color` flag.

## Approach

Create a **Theme Module** (`src/cli/theme.ts`) that centralizes all semantic formatting — colors, icons, and display helpers. Consolidate duplicate logic into `src/cli/format.ts`. Add a consistent empty state helper in `src/cli/empty.ts`. Use `picocolors` (3.8KB, zero dependencies) for ANSI coloring with automatic `NO_COLOR` support.

## Scope

- In scope: semantic colors, icons, formatting consolidation, truncation, empty states, `NO_COLOR`
- Out of scope: table layout changes, new output formats, responsive column hiding, `--compact`/`--detailed` modes

## Architecture

### File Structure

```
src/cli/
  theme.ts           ← NEW: semantic color functions, icon constants
  theme.test.ts      ← NEW: tests for theme functions
  format.ts          ← UPDATED: consolidated formatting (amount, confidence, truncation)
  format.test.ts     ← NEW: tests for format functions
  empty.ts           ← NEW: consistent empty state helper
  empty.test.ts      ← NEW: tests for empty state
  table.ts           ← UNCHANGED
  stdout.ts          ← UNCHANGED
```

### Dependencies

- Add `picocolors` as a production dependency
- No other new dependencies

## Module Design

### `src/cli/theme.ts`

Exports semantic formatting functions and icon constants. All color functions return plain text when `NO_COLOR` is set.

**Icon constants:**

| Constant        | Value | Usage                  |
| --------------- | ----- | ---------------------- |
| `ICON_ACTIVE`   | `●`   | Approved suggestion    |
| `ICON_PENDING`  | `○`   | Pending suggestion     |
| `ICON_SUCCESS`  | `✓`   | Applied, success outro |
| `ICON_REJECTED` | `✗`   | Rejected suggestion    |
| `ICON_EMPTY`    | `—`   | Missing/null value     |

**Color functions:**

```typescript
colorAmount(amount: number, formatted: string): string
```

Returns `formatted` wrapped in green (positive) or red (negative).

```typescript
colorConfidence(confidence: number, formatted: string): string
```

Returns `formatted` wrapped in green (≥0.75), dim (0.50–0.74), or yellow (<0.50).

```typescript
formatStatus(status: 'pending' | 'approved' | 'applied'): string
```

Returns icon + colored status text:

- `pending` → dim `○ pending`
- `approved` → green `● approved`
- `applied` → blue `✓ applied`

> Note: rejection deletes the suggestion row — there is no persisted "rejected" status.

### `src/cli/format.ts`

Consolidated pure formatting functions (no colors — colors are layered on by theme).

```typescript
formatAmount(amount: number): string        // "+42.50" or "-42.50"
formatConfidence(confidence: number): string // "95%"
truncateWithEllipsis(text: string, maxLength: number): string // "Long te…"
```

- `formatAmount` — existing, stays as-is. The duplicate in `list.ts` is deleted.
- `formatConfidence` — moved from `suggestions/list.ts`. Returns `Math.round(confidence * 100)%`.
- `truncateWithEllipsis` — returns the original text if `text.length <= maxLength`. Otherwise truncates to `maxLength - 1` characters and appends `…` (the ellipsis counts as 1 character, so total length equals `maxLength`). Returns as-is if `maxLength < 2` (no room for even one character + ellipsis).

### `src/cli/empty.ts`

Consistent empty state rendering.

```typescript
emptyState(message: string, hint?: string): void
```

Always uses `log.info(message)`. If `hint` is provided, appends it on the next line via a second `log.info` with dimmed text. This replaces the inconsistent mix of `log.info` and `log.warn` for "no results" scenarios across all commands.

## Color Semantics

| Data       | Positive           | Negative/Warning    | Neutral                           |
| ---------- | ------------------ | ------------------- | --------------------------------- |
| Amount     | green `+42.50`     | red `-42.50`        | —                                 |
| Confidence | green `95%` (≥75%) | yellow `40%` (<50%) | dim `65%` (50–74%)                |
| Status     | green `● approved` | red `✗ rejected`    | dim `○ pending`, blue `✓ applied` |

## NO_COLOR Support

### How it works

1. `picocolors` automatically detects the `NO_COLOR` environment variable and disables all ANSI codes.
2. A global `--no-color` flag is added to the Commander root in `src/index.ts`.
3. The flag sets `process.env.NO_COLOR = '1'` in a `preAction` hook, before any output is produced.
4. Unicode icons are always displayed regardless of color setting (they are not ANSI-dependent).

### Commander integration

```typescript
program.option('--no-color', 'Disable colored output')
program.hook('preAction', (thisCommand) => {
  if (thisCommand.opts().noColor) {
    process.env.NO_COLOR = '1'
  }
})
```

## Migration: Files Changed

### Deleted code

| File                                              | What                             | Why                     |
| ------------------------------------------------- | -------------------------------- | ----------------------- |
| `commands/transactions/list.ts:127-130`           | Local `formatAmount()` duplicate | Use `cli/format.ts`     |
| `commands/transactions/suggestions/list.ts:31-33` | Local `formatConfidence()`       | Move to `cli/format.ts` |

### Updated imports and calls

| File                                           | Change                                                                                                                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `commands/transactions/list.ts`                | Import `colorAmount` from theme, `ICON_EMPTY` from theme. Delete local `formatAmount`. Use `colorAmount(t.amount, formatAmount(t.amount))` for table cells. Use `ICON_EMPTY` instead of hardcoded `—`. |
| `commands/transactions/suggestions/list.ts`    | Import `colorConfidence`, `formatStatus` from theme. Import `formatConfidence` from format. Delete local `formatConfidence`. Use theme functions for table cells.                                      |
| `commands/transactions/suggestions/review.ts`  | Import `colorAmount`, `colorConfidence` from theme. Use in note display. Replace inline `Math.round(confidence * 100)%` with `formatConfidence`.                                                       |
| `commands/transactions/comment.ts`             | Import `colorAmount` from theme for transaction display.                                                                                                                                               |
| `commands/transactions/import.ts`              | Import `ICON_SUCCESS` from theme. Replace hardcoded `✓` in outro.                                                                                                                                      |
| `commands/transactions/categorize.ts`          | Import `ICON_SUCCESS` from theme. Replace hardcoded `✓` in outro.                                                                                                                                      |
| `commands/accounts/list.ts`                    | Import `ICON_EMPTY` from theme. Replace hardcoded `—`.                                                                                                                                                 |
| All commands with empty states (~13 locations) | Import `emptyState` from `cli/empty`. Replace `log.info('No X found.')` with `emptyState('No X found.', 'hint text')`.                                                                                 |
| `src/index.ts`                                 | Add `--no-color` global option with `preAction` hook.                                                                                                                                                  |

## Testing

### New test files

**`src/cli/theme.test.ts`:**

- `colorAmount` returns green-wrapped text for positive amounts, red for negative
- `colorConfidence` returns green for ≥0.75, dim for 0.50–0.74, yellow for <0.50
- `formatStatus` returns correct icon + text for each status
- All functions return plain text when `NO_COLOR=1`

**`src/cli/format.test.ts`:**

- `formatAmount` returns `+42.50` for positive, `-42.50` for negative, `+0.00` for zero
- `formatConfidence` returns `95%` for 0.95, `0%` for 0, `100%` for 1.0
- `truncateWithEllipsis` returns original text when it fits, truncated + `…` when it doesn't, handles empty strings and edge cases

**`src/cli/empty.test.ts`:**

- `emptyState` calls `log.info` with the message
- When hint is provided, calls `log.info` a second time with hint text

### Existing tests

No changes expected. Command tests verify behavior (data correctness), not string formatting. If any tests assert exact output strings with hardcoded `—` or `✓`, they will need minor updates to use the icon constants.

## Error Handling

No new error paths are introduced. All theme and format functions are pure (string in → string out). `truncateWithEllipsis` handles edge cases gracefully: empty strings returned as-is, strings shorter than or equal to `maxLength` returned as-is, `maxLength < 2` returns the text as-is (no room for even one character plus ellipsis).
