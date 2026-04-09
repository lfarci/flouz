# Database Directory

This directory contains SQLite schema and data access code for flouz.

## Schema

```mermaid
erDiagram
    CATEGORIES {
        string id PK
        string name
        string slug
        string parent_id FK
    }

    TRANSACTIONS {
        int id PK
        string date
        float amount
        string counterparty
        string hash
        string counterparty_iban
        string currency
        string account
        string category_id FK
        string note
        string source_file
        string imported_at
    }

    CATEGORIES ||--o{ CATEGORIES : parent_of
    CATEGORIES ||--o{ TRANSACTIONS : category_id
```

## Conventions

- Group SQL by table directory
- Use `queries.ts` for reads and `mutations.ts` for writes
- Keep seeding only in tables that require bootstrap data
- See the per-table `README.md` files for table-specific details