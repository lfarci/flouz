# flouz transactions categories

Lists the available category hierarchy. Category slugs are used throughout flouz to filter transactions, apply suggestions, and fix AI choices.

## Use cases

- **Discovering slugs** — look up the exact slug to pass to `--category`, `suggestions fix --category`, or `transactions list --category`
- **Understanding the hierarchy** — view the 3-level structure (root → subcategory → leaf) to understand how parent filters cascade
- **Verifying seeded data** — confirm that categories are present in the database after a fresh import

## Usage

```sh
# Flat table: slug, name, UUID
flouz transactions categories list

# Hierarchy tree
flouz transactions categories list --tree
```

## Category hierarchy

Categories are organized in 3 levels:

```
root                          (e.g. necessities)
  └── subcategory             (e.g. necessities.housing)
        └── leaf              (e.g. necessities.housing.rent)
```

Filtering by a parent slug (e.g. `--category necessities`) includes transactions under all descendant categories.

## Reference

### `flouz transactions categories list`

| Option | Description |
|---|---|
| `--tree` | Show categories as a hierarchy tree |
| `-d, --db <path>` | Override database path |

## Notes

- Category slugs are stable — they do not change between flouz versions
- The UUID column in flat output is the internal `category_id` stored on transactions
- Use `--tree` for a visual overview; use the flat table when you need to copy exact slug values
