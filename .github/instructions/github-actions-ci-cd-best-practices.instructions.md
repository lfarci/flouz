---
applyTo: '.github/workflows/*.yml,.github/workflows/*.yaml'
description: 'Best practices for GitHub Actions CI/CD workflows — secret handling, caching, matrix strategies, and secure workflow design.'
---

# GitHub Actions CI/CD Best Practices

## Workflow Structure

- Use descriptive workflow names that explain their purpose
- Trigger on `push` to main and `pull_request` — never trigger on both events for the same job
- Use `concurrency` to cancel in-flight runs on new pushes:
  ```yaml
  concurrency:
    group: ${{ github.workflow }}-${{ github.ref }}
    cancel-in-progress: true
  ```

## Security

- **Pin action versions** with full SHA (not tags) to prevent supply chain attacks:
  ```yaml
  # BAD: Mutable tag
  uses: actions/checkout@v4
  # GOOD: Pinned SHA
  uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
  ```
- **Never echo secrets** in workflow steps
- Use `${{ secrets.GITHUB_TOKEN }}` for GitHub API access — never create PATs unless required
- Set minimum permissions using `permissions:` key:
  ```yaml
  permissions:
    contents: read
    pull-requests: write
  ```

## Caching

- Cache `bun install` output to speed up CI:
  ```yaml
  - uses: actions/cache@v4
    with:
      path: ~/.bun/install/cache
      key: ${{ runner.os }}-bun-${{ hashFiles('bun.lockb') }}
      restore-keys: ${{ runner.os }}-bun-
  ```

## Finance CLI CI Pattern

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - uses: actions/cache@v4
        with:
          path: ~/.bun/install/cache
          key: ${{ runner.os }}-bun-${{ hashFiles('bun.lockb') }}
      - run: bun install --frozen-lockfile
      - run: bun test
      - run: bun run typecheck
```
