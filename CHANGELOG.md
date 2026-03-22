# Changelog

## [1.3.0](https://github.com/lfarci/flouz/compare/v1.2.0...v1.3.0) (2026-03-22)


### Features

* add -v/--version flag reading version from package.json ([1fabc80](https://github.com/lfarci/flouz/commit/1fabc80089ae429d77f52f2b78a75a4df47b9435))
* add global install support via bun link ([9fbee53](https://github.com/lfarci/flouz/commit/9fbee53f25444a5152c4d2c3264641757a3c40f0))
* **config:** add persistent CLI configuration with db-path support ([111bf88](https://github.com/lfarci/flouz/commit/111bf88e4dcbf638a23b993093917e09ea5ed644))
* implement commands/export.ts — dump transactions to CSV ([765c1bf](https://github.com/lfarci/flouz/commit/765c1bfb1b4b6d13b2d0f28d2728914114998c15)), closes [#6](https://github.com/lfarci/flouz/issues/6)
* implement commands/export.ts (closes [#6](https://github.com/lfarci/flouz/issues/6)) ([2adfde9](https://github.com/lfarci/flouz/commit/2adfde9eb79b58d1b3050cac85d1a82579a0092b))
* implement commands/import.ts — CSV import with dedup and progress ([305e2cb](https://github.com/lfarci/flouz/commit/305e2cb90b2c0eb52a85055d363be07f95ed09e7)), closes [#4](https://github.com/lfarci/flouz/issues/4)
* implement commands/import.ts (closes [#4](https://github.com/lfarci/flouz/issues/4)) ([3083ccd](https://github.com/lfarci/flouz/commit/3083ccd60f1709ef746af1d38e5775d933db4133))
* implement commands/list.ts — transaction table display ([49af39b](https://github.com/lfarci/flouz/commit/49af39b48e2afc79ff42089bd5d6174676bc8e99)), closes [#5](https://github.com/lfarci/flouz/issues/5)
* implement commands/list.ts (closes [#5](https://github.com/lfarci/flouz/issues/5)) ([f2d297d](https://github.com/lfarci/flouz/commit/f2d297d075d1e5557e33e2bdbed81dc3577ae9af))
* implement db/queries.ts (closes [#2](https://github.com/lfarci/flouz/issues/2)) ([90b8bdd](https://github.com/lfarci/flouz/commit/90b8bdddbca5d62aff3dad3ee3c29b9e4de88935))
* implement db/queries.ts with typed query helpers ([c8bdb08](https://github.com/lfarci/flouz/commit/c8bdb083dcacc45a871c8a56494a7630631abe6a)), closes [#2](https://github.com/lfarci/flouz/issues/2)
* implement db/schema.ts (closes [#1](https://github.com/lfarci/flouz/issues/1)) ([e7599e7](https://github.com/lfarci/flouz/commit/e7599e74f1c8ada7f200b78a89d62ee537052fc1))
* implement db/schema.ts with categories and transactions tables ([2f5d229](https://github.com/lfarci/flouz/commit/2f5d229d41db71a925dfa1c7f6d2563744a7a097)), closes [#1](https://github.com/lfarci/flouz/issues/1)
* implement parsers/bank.ts — bank CSV parser ([3bbf82d](https://github.com/lfarci/flouz/commit/3bbf82d98bd5668c95b967c22892f7cf4b9ac131)), closes [#3](https://github.com/lfarci/flouz/issues/3)
* implement parsers/bank.ts — bank CSV parser ([ed55210](https://github.com/lfarci/flouz/commit/ed55210f94dcf21d31b54eff2a27ebdefc23b1c3)), closes [#3](https://github.com/lfarci/flouz/issues/3)
* implement parsers/bank.ts (closes [#3](https://github.com/lfarci/flouz/issues/3)) ([dcd4032](https://github.com/lfarci/flouz/commit/dcd4032bc1520b838727fcfeaabd8b945fcc52ad))
* register import, list, export commands in src/index.ts ([b48995c](https://github.com/lfarci/flouz/commit/b48995cdca5cb37d79158212018fb880fb8ab24d))


### Bug Fixes

* default db path to ~/.config/flouz/flouz.db ([c3d1d5a](https://github.com/lfarci/flouz/commit/c3d1d5aae81956a33ed61a3814a556a1cc468f48))

## [1.2.0](https://github.com/lfarci/flouz/compare/v1.1.0...v1.2.0) (2026-03-22)


### Features

* add -v/--version flag reading version from package.json ([1fabc80](https://github.com/lfarci/flouz/commit/1fabc80089ae429d77f52f2b78a75a4df47b9435))

## [1.1.0](https://github.com/lfarci/flouz/compare/v1.0.0...v1.1.0) (2026-03-22)


### Features

* add global install support via bun link ([9fbee53](https://github.com/lfarci/flouz/commit/9fbee53f25444a5152c4d2c3264641757a3c40f0))
* **config:** add persistent CLI configuration with db-path support ([111bf88](https://github.com/lfarci/flouz/commit/111bf88e4dcbf638a23b993093917e09ea5ed644))

## 1.0.0 (2026-03-22)


### Features

* implement commands/export.ts — dump transactions to CSV ([765c1bf](https://github.com/lfarci/flouz/commit/765c1bfb1b4b6d13b2d0f28d2728914114998c15)), closes [#6](https://github.com/lfarci/flouz/issues/6)
* implement commands/export.ts (closes [#6](https://github.com/lfarci/flouz/issues/6)) ([2adfde9](https://github.com/lfarci/flouz/commit/2adfde9eb79b58d1b3050cac85d1a82579a0092b))
* implement commands/import.ts — CSV import with dedup and progress ([305e2cb](https://github.com/lfarci/flouz/commit/305e2cb90b2c0eb52a85055d363be07f95ed09e7)), closes [#4](https://github.com/lfarci/flouz/issues/4)
* implement commands/import.ts (closes [#4](https://github.com/lfarci/flouz/issues/4)) ([3083ccd](https://github.com/lfarci/flouz/commit/3083ccd60f1709ef746af1d38e5775d933db4133))
* implement commands/list.ts — transaction table display ([49af39b](https://github.com/lfarci/flouz/commit/49af39b48e2afc79ff42089bd5d6174676bc8e99)), closes [#5](https://github.com/lfarci/flouz/issues/5)
* implement commands/list.ts (closes [#5](https://github.com/lfarci/flouz/issues/5)) ([f2d297d](https://github.com/lfarci/flouz/commit/f2d297d075d1e5557e33e2bdbed81dc3577ae9af))
* implement db/queries.ts (closes [#2](https://github.com/lfarci/flouz/issues/2)) ([90b8bdd](https://github.com/lfarci/flouz/commit/90b8bdddbca5d62aff3dad3ee3c29b9e4de88935))
* implement db/queries.ts with typed query helpers ([c8bdb08](https://github.com/lfarci/flouz/commit/c8bdb083dcacc45a871c8a56494a7630631abe6a)), closes [#2](https://github.com/lfarci/flouz/issues/2)
* implement db/schema.ts (closes [#1](https://github.com/lfarci/flouz/issues/1)) ([e7599e7](https://github.com/lfarci/flouz/commit/e7599e74f1c8ada7f200b78a89d62ee537052fc1))
* implement db/schema.ts with categories and transactions tables ([2f5d229](https://github.com/lfarci/flouz/commit/2f5d229d41db71a925dfa1c7f6d2563744a7a097)), closes [#1](https://github.com/lfarci/flouz/issues/1)
* implement parsers/bank.ts — bank CSV parser ([3bbf82d](https://github.com/lfarci/flouz/commit/3bbf82d98bd5668c95b967c22892f7cf4b9ac131)), closes [#3](https://github.com/lfarci/flouz/issues/3)
* implement parsers/bank.ts — bank CSV parser ([ed55210](https://github.com/lfarci/flouz/commit/ed55210f94dcf21d31b54eff2a27ebdefc23b1c3)), closes [#3](https://github.com/lfarci/flouz/issues/3)
* implement parsers/bank.ts (closes [#3](https://github.com/lfarci/flouz/issues/3)) ([dcd4032](https://github.com/lfarci/flouz/commit/dcd4032bc1520b838727fcfeaabd8b945fcc52ad))
* register import, list, export commands in src/index.ts ([b48995c](https://github.com/lfarci/flouz/commit/b48995cdca5cb37d79158212018fb880fb8ab24d))
