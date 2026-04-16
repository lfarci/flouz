---
name: handle-release
description: 'Manage releases for the flouz project using release-please and conventional commits. Use when the user asks to cut a release, merge a release PR, check release status, or mentions "/release". Supports: (1) Checking if a release PR is open and its contents, (2) Merging the release PR to trigger a GitHub release, (3) Verifying CI passes before releasing, (4) Reviewing what will be included in the next release'
license: MIT
allowed-tools: Bash
---

# Handle Release

## Overview

Releases are fully automated via [release-please](https://github.com/googleapis/release-please). When commits following the Conventional Commits spec land on `main`, release-please opens a **Release PR** that bumps the version in `package.json`, updates `CHANGELOG.md`, and creates a GitHub release upon merge.

**Never manually edit `CHANGELOG.md` or bump the version in `package.json`** — release-please owns those files.

## Release Flow

```
feat:/fix:/chore! commits → main
        ↓
release-please workflow runs
        ↓
Release PR opened (or updated) automatically
        ↓
Merge Release PR
        ↓
GitHub Release created + tag pushed
```

## Version Bump Rules

| Commit type                   | Version bump  |
| ----------------------------- | ------------- |
| `fix:`                        | patch (0.0.x) |
| `feat:`                       | minor (0.x.0) |
| `feat!:` or `BREAKING CHANGE` | major (x.0.0) |
| `chore:`, `docs:`, `ci:`      | no bump       |

## Workflow

### 1. Check for an open Release PR

```bash
gh pr list --repo lfarci/flouz --search "chore(main): release" --state open
```

### 2. Review what's in the Release PR

```bash
gh pr view <PR_NUMBER> --repo lfarci/flouz
```

Check the PR body — it contains the generated CHANGELOG entry and the new version.

### 3. Verify CI is green before merging

```bash
gh pr checks <PR_NUMBER> --repo lfarci/flouz
```

All checks must pass. Never merge a Release PR with failing CI.

### 4. Merge the Release PR

```bash
gh pr merge <PR_NUMBER> --repo lfarci/flouz --merge
```

Use `--merge` (not squash or rebase) to preserve the commit history release-please relies on.

### 5. Confirm the GitHub Release was created

```bash
gh release list --repo lfarci/flouz --limit 3
```

## Triggering release-please manually

If the workflow didn't run automatically (e.g. after fixing the repo settings):

```bash
gh workflow run release-please.yml --repo lfarci/flouz --ref main
```

## Safety Rules

- NEVER manually bump the version in `package.json`
- NEVER manually edit `CHANGELOG.md`
- NEVER merge a Release PR with failing CI checks
- NEVER use `--squash` or `--rebase` when merging a Release PR
- NEVER delete the `release-please--branches--main--components--flouz` branch manually — release-please manages it
