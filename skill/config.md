# flouz config

Manages persistent tool configuration stored at `~/.config/flouz/config.json`.

## Use cases

- **First-time setup** — set the database path and GitHub token before any other command
- **Switching databases** — point `db-path` to a different file to manage separate datasets
- **Changing AI provider** — override `ai-model` or `ai-base-url` to use a different model or compatible endpoint
- **Inspecting current config** — verify what values are active before diagnosing a broken import or categorization

## Usage

```sh
# View all config values
flouz config get

# View a single value
flouz config get db-path

# Set the database location
flouz config set db-path ~/finance/flouz.db

# Set the GitHub token (required for AI categorization)
flouz config set github-token ghp_...

# Change the AI model
flouz config set ai-model openai/gpt-4o

# Change the AI provider endpoint
flouz config set ai-base-url https://models.github.ai/inference
```

## Config keys

| Key | Default | Description |
|---|---|---|
| `db-path` | `~/.config/flouz/flouz.db` | SQLite database file location |
| `github-token` | _(not set)_ | GitHub personal access token for AI categorization |
| `ai-model` | `openai/gpt-4o-mini` | AI model name |
| `ai-base-url` | `https://models.github.ai/inference` | AI provider base URL |

## Notes

- `github-token` is masked in `config get` output (shown as `***`)
- All commands accept `--db <path>` to override `db-path` for a single invocation
