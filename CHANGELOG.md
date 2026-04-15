# Changelog

## [2.1.0](https://github.com/lfarci/flouz/compare/v2.0.0...v2.1.0) (2026-04-14)

### Features

- implement AI categorization for transactions ([5dd3870](https://github.com/lfarci/flouz/commit/5dd3870cd956440176be759d661901d08ad743a1))

## [2.0.0](https://github.com/lfarci/flouz/compare/v1.8.0...v2.0.0) (2026-04-13)

### ⚠ BREAKING CHANGES

- **cli:** import, export, and list are no longer top-level commands; use flouz transactions import|export|list instead.

### Features

- **db:** persist transaction hashes ([35d7bc3](https://github.com/lfarci/flouz/commit/35d7bc373072de770bde719712a48144e15a7ec9))
- implement accounts management for transaction imports ([c09525e](https://github.com/lfarci/flouz/commit/c09525eefb6698daa7422d1c5199397ce4f51aaf))
- **table:** implement CLI table rendering and update account transaction formatting ([d682a96](https://github.com/lfarci/flouz/commit/d682a96f1d72f21eda0d1137b48397381074631c))

### Bug Fixes

- **transactions:** streamline list output ([14c339c](https://github.com/lfarci/flouz/commit/14c339cc0ceeed00bc0c56caf989ec0f68b74e40))

### Code Refactoring

- **cli:** group transaction commands under namespace ([b17ea2e](https://github.com/lfarci/flouz/commit/b17ea2e90bf5a30229d2726fa284a31bc1b9a2d0))

## [1.8.0](https://github.com/lfarci/flouz/compare/v1.7.1...v1.8.0) (2026-03-22)

### Features

- **import:** close db and exit cleanly on Ctrl+C ([32996ec](https://github.com/lfarci/flouz/commit/32996ec59ec544cbcc89177b1aebac9bce2291d0))

### Bug Fixes

- **import:** add spinner during file reading phase ([f6ff18d](https://github.com/lfarci/flouz/commit/f6ff18d318a45e9cde535f5d750de58bea6b6e63))
- **import:** deduplicate log messages and yield every 50 rows ([1986801](https://github.com/lfarci/flouz/commit/198680174e03055b210e0d600d5d79aeedffd9d7))
- **import:** handle Ctrl+C at any point in the action ([e150f2f](https://github.com/lfarci/flouz/commit/e150f2ff8b273ecec7f415069be853dd29419f15))
- **import:** reduce yield interval to 25 rows for smoother progress ([2578c6d](https://github.com/lfarci/flouz/commit/2578c6d6990cf04a8b8fe0287c1bfd573b0fd898))
- **import:** single progress bar across all files ([d32fab8](https://github.com/lfarci/flouz/commit/d32fab878471b53df38ddfcf26012c9abc5d5e33))
- **import:** yield to event loop during inserts for progress and SIGINT ([219dfc8](https://github.com/lfarci/flouz/commit/219dfc8422cb257fd0e46eb348090b53c1e2bf95))

## [1.7.1](https://github.com/lfarci/flouz/compare/v1.7.0...v1.7.1) (2026-03-22)

### Bug Fixes

- **import:** restore progress bar for batch imports ([bc42292](https://github.com/lfarci/flouz/commit/bc422920fed1a4d777efc6c4054807d99e733c8c))

## [1.7.0](https://github.com/lfarci/flouz/compare/v1.6.0...v1.7.0) (2026-03-22)

### Features

- **import:** use tasks component for batch imports ([741e8a7](https://github.com/lfarci/flouz/commit/741e8a7a115f2c1d22824d2781828a536cd0f8cf))

## [1.6.0](https://github.com/lfarci/flouz/compare/v1.5.0...v1.6.0) (2026-03-22)

### Features

- add -v/--version flag reading version from package.json ([1fabc80](https://github.com/lfarci/flouz/commit/1fabc80089ae429d77f52f2b78a75a4df47b9435))
- add global install support via bun link ([9fbee53](https://github.com/lfarci/flouz/commit/9fbee53f25444a5152c4d2c3264641757a3c40f0))
- **config:** add persistent CLI configuration with db-path support ([111bf88](https://github.com/lfarci/flouz/commit/111bf88e4dcbf638a23b993093917e09ea5ed644))
- implement commands/export.ts — dump transactions to CSV ([765c1bf](https://github.com/lfarci/flouz/commit/765c1bfb1b4b6d13b2d0f28d2728914114998c15)), closes [#6](https://github.com/lfarci/flouz/issues/6)
- implement commands/export.ts (closes [#6](https://github.com/lfarci/flouz/issues/6)) ([2adfde9](https://github.com/lfarci/flouz/commit/2adfde9eb79b58d1b3050cac85d1a82579a0092b))
- implement commands/import.ts — CSV import with dedup and progress ([305e2cb](https://github.com/lfarci/flouz/commit/305e2cb90b2c0eb52a85055d363be07f95ed09e7)), closes [#4](https://github.com/lfarci/flouz/issues/4)
- implement commands/import.ts (closes [#4](https://github.com/lfarci/flouz/issues/4)) ([3083ccd](https://github.com/lfarci/flouz/commit/3083ccd60f1709ef746af1d38e5775d933db4133))
- implement commands/list.ts — transaction table display ([49af39b](https://github.com/lfarci/flouz/commit/49af39b48e2afc79ff42089bd5d6174676bc8e99)), closes [#5](https://github.com/lfarci/flouz/issues/5)
- implement commands/list.ts (closes [#5](https://github.com/lfarci/flouz/issues/5)) ([f2d297d](https://github.com/lfarci/flouz/commit/f2d297d075d1e5557e33e2bdbed81dc3577ae9af))
- implement db/queries.ts (closes [#2](https://github.com/lfarci/flouz/issues/2)) ([90b8bdd](https://github.com/lfarci/flouz/commit/90b8bdddbca5d62aff3dad3ee3c29b9e4de88935))
- implement db/queries.ts with typed query helpers ([c8bdb08](https://github.com/lfarci/flouz/commit/c8bdb083dcacc45a871c8a56494a7630631abe6a)), closes [#2](https://github.com/lfarci/flouz/issues/2)
- implement db/schema.ts (closes [#1](https://github.com/lfarci/flouz/issues/1)) ([e7599e7](https://github.com/lfarci/flouz/commit/e7599e74f1c8ada7f200b78a89d62ee537052fc1))
- implement db/schema.ts with categories and transactions tables ([2f5d229](https://github.com/lfarci/flouz/commit/2f5d229d41db71a925dfa1c7f6d2563744a7a097)), closes [#1](https://github.com/lfarci/flouz/issues/1)
- implement parsers/bank.ts — bank CSV parser ([3bbf82d](https://github.com/lfarci/flouz/commit/3bbf82d98bd5668c95b967c22892f7cf4b9ac131)), closes [#3](https://github.com/lfarci/flouz/issues/3)
- implement parsers/bank.ts — bank CSV parser ([ed55210](https://github.com/lfarci/flouz/commit/ed55210f94dcf21d31b54eff2a27ebdefc23b1c3)), closes [#3](https://github.com/lfarci/flouz/issues/3)
- implement parsers/bank.ts (closes [#3](https://github.com/lfarci/flouz/issues/3)) ([dcd4032](https://github.com/lfarci/flouz/commit/dcd4032bc1520b838727fcfeaabd8b945fcc52ad))
- **import:** enhance CSV import process with progress tracking and counterparty fallback ([b844824](https://github.com/lfarci/flouz/commit/b844824f2af9822f07befbd5235ea2f91d7ad59e))
- **import:** replace spinner with progress bar ([e73f803](https://github.com/lfarci/flouz/commit/e73f803ffc84c4a6bd8db08385a2f015631e7f4e))
- **import:** support directory import and report invalid rows ([9079cff](https://github.com/lfarci/flouz/commit/9079cff447ce83589de1a06cb23a3d3d51612cf5))
- register import, list, export commands in src/index.ts ([b48995c](https://github.com/lfarci/flouz/commit/b48995cdca5cb37d79158212018fb880fb8ab24d))
- replace bank-specific parser with generic CSV import format ([d812c0a](https://github.com/lfarci/flouz/commit/d812c0a1341b7fc6fd5b51f8193c318423fadfe7))

### Bug Fixes

- default db path to ~/.config/flouz/flouz.db ([c3d1d5a](https://github.com/lfarci/flouz/commit/c3d1d5aae81956a33ed61a3814a556a1cc468f48))

## [1.5.0](https://github.com/lfarci/flouz/compare/v1.4.0...v1.5.0) (2026-03-22)

### Features

- **import:** support directory import and report invalid rows ([9079cff](https://github.com/lfarci/flouz/commit/9079cff447ce83589de1a06cb23a3d3d51612cf5))

## [1.4.0](https://github.com/lfarci/flouz/compare/v1.3.0...v1.4.0) (2026-03-22)

### Features

- replace bank-specific parser with generic CSV import format ([d812c0a](https://github.com/lfarci/flouz/commit/d812c0a1341b7fc6fd5b51f8193c318423fadfe7))

## [1.3.0](https://github.com/lfarci/flouz/compare/v1.2.0...v1.3.0) (2026-03-22)

### Features

- add -v/--version flag reading version from package.json ([1fabc80](https://github.com/lfarci/flouz/commit/1fabc80089ae429d77f52f2b78a75a4df47b9435))
- add global install support via bun link ([9fbee53](https://github.com/lfarci/flouz/commit/9fbee53f25444a5152c4d2c3264641757a3c40f0))
- **config:** add persistent CLI configuration with db-path support ([111bf88](https://github.com/lfarci/flouz/commit/111bf88e4dcbf638a23b993093917e09ea5ed644))
- implement commands/export.ts — dump transactions to CSV ([765c1bf](https://github.com/lfarci/flouz/commit/765c1bfb1b4b6d13b2d0f28d2728914114998c15)), closes [#6](https://github.com/lfarci/flouz/issues/6)
- implement commands/export.ts (closes [#6](https://github.com/lfarci/flouz/issues/6)) ([2adfde9](https://github.com/lfarci/flouz/commit/2adfde9eb79b58d1b3050cac85d1a82579a0092b))
- implement commands/import.ts — CSV import with dedup and progress ([305e2cb](https://github.com/lfarci/flouz/commit/305e2cb90b2c0eb52a85055d363be07f95ed09e7)), closes [#4](https://github.com/lfarci/flouz/issues/4)
- implement commands/import.ts (closes [#4](https://github.com/lfarci/flouz/issues/4)) ([3083ccd](https://github.com/lfarci/flouz/commit/3083ccd60f1709ef746af1d38e5775d933db4133))
- implement commands/list.ts — transaction table display ([49af39b](https://github.com/lfarci/flouz/commit/49af39b48e2afc79ff42089bd5d6174676bc8e99)), closes [#5](https://github.com/lfarci/flouz/issues/5)
- implement commands/list.ts (closes [#5](https://github.com/lfarci/flouz/issues/5)) ([f2d297d](https://github.com/lfarci/flouz/commit/f2d297d075d1e5557e33e2bdbed81dc3577ae9af))
- implement db/queries.ts (closes [#2](https://github.com/lfarci/flouz/issues/2)) ([90b8bdd](https://github.com/lfarci/flouz/commit/90b8bdddbca5d62aff3dad3ee3c29b9e4de88935))
- implement db/queries.ts with typed query helpers ([c8bdb08](https://github.com/lfarci/flouz/commit/c8bdb083dcacc45a871c8a56494a7630631abe6a)), closes [#2](https://github.com/lfarci/flouz/issues/2)
- implement db/schema.ts (closes [#1](https://github.com/lfarci/flouz/issues/1)) ([e7599e7](https://github.com/lfarci/flouz/commit/e7599e74f1c8ada7f200b78a89d62ee537052fc1))
- implement db/schema.ts with categories and transactions tables ([2f5d229](https://github.com/lfarci/flouz/commit/2f5d229d41db71a925dfa1c7f6d2563744a7a097)), closes [#1](https://github.com/lfarci/flouz/issues/1)
- implement parsers/bank.ts — bank CSV parser ([3bbf82d](https://github.com/lfarci/flouz/commit/3bbf82d98bd5668c95b967c22892f7cf4b9ac131)), closes [#3](https://github.com/lfarci/flouz/issues/3)
- implement parsers/bank.ts — bank CSV parser ([ed55210](https://github.com/lfarci/flouz/commit/ed55210f94dcf21d31b54eff2a27ebdefc23b1c3)), closes [#3](https://github.com/lfarci/flouz/issues/3)
- implement parsers/bank.ts (closes [#3](https://github.com/lfarci/flouz/issues/3)) ([dcd4032](https://github.com/lfarci/flouz/commit/dcd4032bc1520b838727fcfeaabd8b945fcc52ad))
- register import, list, export commands in src/index.ts ([b48995c](https://github.com/lfarci/flouz/commit/b48995cdca5cb37d79158212018fb880fb8ab24d))

### Bug Fixes

- default db path to ~/.config/flouz/flouz.db ([c3d1d5a](https://github.com/lfarci/flouz/commit/c3d1d5aae81956a33ed61a3814a556a1cc468f48))

## [1.2.0](https://github.com/lfarci/flouz/compare/v1.1.0...v1.2.0) (2026-03-22)

### Features

- add -v/--version flag reading version from package.json ([1fabc80](https://github.com/lfarci/flouz/commit/1fabc80089ae429d77f52f2b78a75a4df47b9435))

## [1.1.0](https://github.com/lfarci/flouz/compare/v1.0.0...v1.1.0) (2026-03-22)

### Features

- add global install support via bun link ([9fbee53](https://github.com/lfarci/flouz/commit/9fbee53f25444a5152c4d2c3264641757a3c40f0))
- **config:** add persistent CLI configuration with db-path support ([111bf88](https://github.com/lfarci/flouz/commit/111bf88e4dcbf638a23b993093917e09ea5ed644))

## 1.0.0 (2026-03-22)

### Features

- implement commands/export.ts — dump transactions to CSV ([765c1bf](https://github.com/lfarci/flouz/commit/765c1bfb1b4b6d13b2d0f28d2728914114998c15)), closes [#6](https://github.com/lfarci/flouz/issues/6)
- implement commands/export.ts (closes [#6](https://github.com/lfarci/flouz/issues/6)) ([2adfde9](https://github.com/lfarci/flouz/commit/2adfde9eb79b58d1b3050cac85d1a82579a0092b))
- implement commands/import.ts — CSV import with dedup and progress ([305e2cb](https://github.com/lfarci/flouz/commit/305e2cb90b2c0eb52a85055d363be07f95ed09e7)), closes [#4](https://github.com/lfarci/flouz/issues/4)
- implement commands/import.ts (closes [#4](https://github.com/lfarci/flouz/issues/4)) ([3083ccd](https://github.com/lfarci/flouz/commit/3083ccd60f1709ef746af1d38e5775d933db4133))
- implement commands/list.ts — transaction table display ([49af39b](https://github.com/lfarci/flouz/commit/49af39b48e2afc79ff42089bd5d6174676bc8e99)), closes [#5](https://github.com/lfarci/flouz/issues/5)
- implement commands/list.ts (closes [#5](https://github.com/lfarci/flouz/issues/5)) ([f2d297d](https://github.com/lfarci/flouz/commit/f2d297d075d1e5557e33e2bdbed81dc3577ae9af))
- implement db/queries.ts (closes [#2](https://github.com/lfarci/flouz/issues/2)) ([90b8bdd](https://github.com/lfarci/flouz/commit/90b8bdddbca5d62aff3dad3ee3c29b9e4de88935))
- implement db/queries.ts with typed query helpers ([c8bdb08](https://github.com/lfarci/flouz/commit/c8bdb083dcacc45a871c8a56494a7630631abe6a)), closes [#2](https://github.com/lfarci/flouz/issues/2)
- implement db/schema.ts (closes [#1](https://github.com/lfarci/flouz/issues/1)) ([e7599e7](https://github.com/lfarci/flouz/commit/e7599e74f1c8ada7f200b78a89d62ee537052fc1))
- implement db/schema.ts with categories and transactions tables ([2f5d229](https://github.com/lfarci/flouz/commit/2f5d229d41db71a925dfa1c7f6d2563744a7a097)), closes [#1](https://github.com/lfarci/flouz/issues/1)
- implement parsers/bank.ts — bank CSV parser ([3bbf82d](https://github.com/lfarci/flouz/commit/3bbf82d98bd5668c95b967c22892f7cf4b9ac131)), closes [#3](https://github.com/lfarci/flouz/issues/3)
- implement parsers/bank.ts — bank CSV parser ([ed55210](https://github.com/lfarci/flouz/commit/ed55210f94dcf21d31b54eff2a27ebdefc23b1c3)), closes [#3](https://github.com/lfarci/flouz/issues/3)
- implement parsers/bank.ts (closes [#3](https://github.com/lfarci/flouz/issues/3)) ([dcd4032](https://github.com/lfarci/flouz/commit/dcd4032bc1520b838727fcfeaabd8b945fcc52ad))
- register import, list, export commands in src/index.ts ([b48995c](https://github.com/lfarci/flouz/commit/b48995cdca5cb37d79158212018fb880fb8ab24d))
