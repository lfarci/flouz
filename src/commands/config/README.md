# Config Command

## What It Does

The `config` command manages stored CLI configuration.

- `get` reads configuration values
- `set` updates configuration values
- it validates that the requested key is supported before using it

Right now, the command only supports the `db-path` key.

## Scope

This command exists so other commands do not need to read or write config files directly.
It is only responsible for exposing a small CLI surface over the config layer.

It does not open the database or resolve whether the configured path is valid at runtime.
