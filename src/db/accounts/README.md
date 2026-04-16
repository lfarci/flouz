# Accounts Table

Stores user-configured accounts that transactions can reference.

## Columns

- `id`: integer primary key
- `key`: unique import lookup key
- `company`: provider or institution name
- `name`: human-readable display name
- `description`: optional free-text description
- `iban`: optional IBAN

## Queries

- `getAccounts`: lists configured accounts
- `getAccountByKey`: resolves one account from the import key

## Mutations

- `insertAccount`: inserts one configured account

## Seed

- None
