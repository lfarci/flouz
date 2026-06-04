# Account Balance Snapshots

Stores authoritative end-of-day balances for configured accounts.

## Table

- `account_balance_snapshots`
- One row per `(account_id, date)`
- `amount` can be negative to support overdrafts
- `currency` defaults to `EUR`
- `note` is optional user context

## Queries

- `getBalanceSnapshotForDate` returns an exact snapshot.
- `getLatestBalanceSnapshotOnOrBefore` returns the closest prior snapshot for forward derivation.
- `getEarliestBalanceSnapshotOnOrAfter` returns the closest future snapshot for reverse derivation.
- `getBalanceSnapshots` lists snapshots by optional account and date filters.

## Mutations

- `upsertAccountBalanceSnapshot` inserts a snapshot or updates the existing snapshot for the same account and date.

## Derivation rule

Snapshots are authoritative. Point-in-time balances and balance history are derived by applying same-account transactions around the closest snapshot. Transactions without `account_id` are not included in account balances.
