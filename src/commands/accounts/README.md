# Accounts Command

## What It Does

The `accounts` command manages configured accounts used during transaction import.

- `add` creates an account with a unique machine key and a human-readable name
- `delete` removes an account by key when no transactions reference it
- `list` prints configured accounts so import keys are visible before running `flouz import`

## Scope

This command is responsible for account registry management only.
It stores account metadata in the database so imported transactions can reference accounts by foreign key.
