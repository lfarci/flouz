# Categories Table

Stores the category hierarchy used to classify transactions.

## Columns

- `id`: stable UUID primary key
- `name`: display label
- `slug`: stable CLI-friendly identifier
- `parent_id`: self-reference for the 3-level tree

## Queries

- `getCategories`: returns all categories ordered for display

## Mutations

- None in normal runtime usage

## Seed

- `seedCategories`: inserts the built-in category tree with `INSERT OR IGNORE`