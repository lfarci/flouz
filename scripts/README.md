# Scripts

Utility SQL scripts for inspecting the local database.

## duplicate_transactions.sql

Lists all transactions that share a hash with at least one other row, grouped so each transaction appears next to its twins.

```bash
sqlite3 -column -header test.db < scripts/duplicate_transactions.sql
```

To page through results:

```bash
sqlite3 -column -header test.db < scripts/duplicate_transactions.sql | less
```
