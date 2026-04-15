# Configuration

flouz supports a three-tier configuration system. Settings are resolved in priority order:

| Priority    | Source                                        | Scope                        |
| ----------- | --------------------------------------------- | ---------------------------- |
| 1 (highest) | `--db` CLI flag                               | Single command invocation    |
| 2           | `DB_PATH` environment variable                | Shell session or `.env` file |
| 3           | Config file (`~/.config/flouz/config.json`)   | Persistent, user-wide        |
| 4 (lowest)  | Built-in default (`~/.config/flouz/flouz.db`) | Fallback                     |

## Config File

The config file is stored at:

```
~/.config/flouz/config.json
```

If `$XDG_CONFIG_HOME` is set, flouz respects it:

```
$XDG_CONFIG_HOME/flouz/config.json
```

The file is created automatically on the first `flouz config set` call. You never need to create it manually.

## Schema

```json
{
  "dbPath": "~/.config/flouz/flouz.db"
}
```

| Field    | Type     | Required | Description                                                                      |
| -------- | -------- | -------- | -------------------------------------------------------------------------------- |
| `dbPath` | `string` | No       | Path to the SQLite database file. Absolute or relative to the working directory. |

## Managing Config with the CLI

### Set a value

```
flouz config set db-path ~/Documents/finances.db
```

### Read a value

```
flouz config get db-path
```

### Show all settings

```
flouz config get
```

## Supported Keys

| Key       | Config field | Description                      |
| --------- | ------------ | -------------------------------- |
| `db-path` | `dbPath`     | Path to the SQLite database file |

## Environment Variable

`DB_PATH` overrides the config file for the duration of the shell session:

```bash
DB_PATH=~/Documents/finances.db flouz list
```

Or add it to your `.env` file in the project directory (gitignored):

```
DB_PATH=~/Documents/finances.db
```

## Changing the Database Path

If you change `db-path` after already importing transactions, your existing data is **not moved** — it stays at the old path. The next command you run will use the new path:

- **`flouz import`** — creates a fresh database at the new path and imports into it. A note is printed when a new database file is being created so you know it is not reusing an existing one.
- **`flouz list` / `flouz export`** — exit with an error if no database file exists at the configured path, rather than silently creating an empty one.

To check which path is currently active:

```
flouz config get db-path
```

To migrate your data to a new location, copy the database file manually:

```bash
cp ~/old/path/flouz.db ~/new/path/flouz.db
flouz config set db-path ~/new/path/flouz.db
```

### Keeping finances in a dedicated directory

```bash
flouz config set db-path ~/Documents/finances/flouz.db
# All subsequent commands use ~/Documents/finances/flouz.db by default
flouz import export.csv
flouz list
```

### Temporarily using a different database

```bash
# One-off override with --db flag
flouz list --db ~/Documents/archive-2025.db

# Or export using an env var
DB_PATH=~/Documents/archive-2025.db flouz export -o archive.csv
```

### Using multiple databases

flouz has no built-in profile system, but you can switch databases per command:

```bash
flouz import export.csv --db ~/finances/personal.db
flouz import export.csv --db ~/finances/joint.db
```
