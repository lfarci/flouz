# Accounts Command

## What It Does

The `accounts` command manages configured accounts used during transaction import.

- `add` creates an account with a unique machine key and a human-readable name
- `snapshot` saves an authoritative end-of-day balance for an account
- `balance` shows a derived balance for an account on a date
- `history` shows daily derived balances from snapshots and transactions
- `delete` removes an account by key when no transactions reference it
- `list` prints configured accounts so import keys are visible before running `flouz import`

## Scope

This command stores account metadata and account balance snapshots.
Snapshots are authoritative end-of-day balances. Balance history is derived by applying same-account transactions around the closest snapshot.
Transactions without an account are not included in account balance calculations.

## Examples

```bash
flouz accounts snapshot checking 1250.00 --date 2026-06-04
flouz accounts balance checking --date 2026-06-04
flouz accounts history checking --from 2026-06-01 --to 2026-06-30
```
