# Import Command

## What It Does

The `import` command reads transaction CSV files and inserts the valid rows into the local SQLite database.

- it accepts either a single CSV file or a directory of CSV files
- it parses each file through the CSV parser
- it inserts valid transactions into the database
- it reports invalid rows without stopping the whole import

## Scope

This command is the ingestion entry point for transaction data.
Its job is to move data from CSV files into the normalized database format.

It does not categorize transactions, edit existing data, or define the CSV parsing rules itself.
