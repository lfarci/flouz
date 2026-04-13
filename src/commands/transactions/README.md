# Transactions Command

## What It Does

The `transactions` command groups the main workflows for working with stored transaction data.

- `import` reads CSV data and inserts valid rows into the database
- `list` prints stored transactions as a table, CSV, or JSON without extra summary lines around the output

## Scope

This command group owns transaction ingestion and inspection.
The parent command wires shared configuration into each subcommand and keeps the transaction workflows organized under one namespace.