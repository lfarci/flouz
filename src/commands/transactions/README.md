# Transactions Command

## What It Does

The `transactions` command groups the main workflows for working with stored transaction data.

- `import` reads CSV data and inserts valid rows into the database
- `export` writes stored transactions back out as CSV
- `list` prints stored transactions in a terminal-friendly table

## Scope

This command group owns transaction ingestion, inspection, and export.
The parent command wires shared configuration into each subcommand and keeps the transaction workflows organized under one namespace.