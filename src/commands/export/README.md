# Export Command

## What It Does

The `export` command reads transactions from the local database and writes them as CSV.

- it loads stored transactions
- it converts category IDs back to category slugs for export
- it writes the CSV either to stdout or to a file
- it escapes CSV fields when needed

## Scope

This command is the output side of the transaction pipeline.
It takes normalized data that is already in the database and turns it into a reusable CSV export.

It does not re-read the original bank export format, filter results, or modify stored data.
