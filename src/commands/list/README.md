# List Command

## What It Does

The `list` command reads transactions from the local database and prints them in a terminal-friendly table.

- it supports filtering by date range, category, search text, and limit
- it resolves category slugs before querying
- it shows a short summary after the table

## Scope

This command is the main read-only inspection command for stored transactions.
It is meant to help a developer or user quickly see what is in the database.

It does not modify transactions, assign categories, or produce advanced reports.
