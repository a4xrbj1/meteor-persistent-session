### [Unreleased] - 2026-09-01 - dependency modernization (build tooling only)

No change to the shipped package. Verified by rebuild rather than asserted: with
`.meteor/local/isopacks/a4xrbj1_persistent-session` deleted and the app rebuilt, the served
`/packages/a4xrbj1_persistent-session.js` is byte-identical before and after
(sha256 `9e12fa97...85f6`, 32,166 bytes). The package version is therefore deliberately NOT bumped -
`frontend/.meteor/versions` pins 0.5.0 and a bump would force a coupled app rebuild for zero
behavioural delta.

**Changed - devDependencies brought to current.**
- `typescript` `~4.5.5` -> `^6.0.3`. 4.5.5 was published 2022-01-20 and is the LAST 4.5 patch, so the
  `~4.5.5` range had nothing left to move to; the pin was frozen, not merely old. 6.0.3 was published
  2026-04-16 and is what `frontend` - the only consumer - already runs. Deliberately NOT 7.0.2
  (published 2026-07-08): it is the native Go port, the largest behavioural delta in the compiler's
  history, and the consuming repo is not on it. Aligning with the consumer beats leading it.
- `@types/meteor` `^2.7.1` -> `^2.9.11` (published 2026-02-03). A minor bump inside the existing
  caret.

Both clear the 7-day supply-chain quarantine by a wide margin - 137 and 210 days respectively.
Neither needed the CVE fast-path.

**Fixed - the type-check silently stopped seeing Meteor's ambient globals under TypeScript 6.**
Upgrading the compiler produced 42 errors, every one of them in `tests/client/persistent_session.ts`
and every one `TS2304: Cannot find name 'Tinytest'` or the `TS7006` implicit-any that follows from
it. `lib/` was clean throughout. Diagnosed with `tsc --explainFiles` rather than guessed: TypeScript 6
loads only the module declaration files actually imported - `ejson`, `meteor`, `reactive-dict`,
`session`, `tracker`, `random`, plus transitive `blaze`/`ddp`/`mongo` - and never loads
`@types/meteor/index.d.ts`, whose `/// <reference>` chain is the ONLY thing that brings in the
`globals/*.d.ts` files. `Session` kept resolving because the test IMPORTS it from `meteor/session`;
`Tinytest` is ambient-only, so it vanished. `tsconfig.json` now names the package explicitly with
`"types": ["meteor"]`, which restores the reference chain. Proven in both directions: 42 errors
without it, exit 0 with it. The same explicit-`types` form is already the established pattern in this
workspace (`admin/jsconfig.json` uses `types: ["node", "mocha"]`).

**Fixed - three vulnerabilities in the build toolchain, two of them high.**
`npm audit` went 3 -> 0:
- `ip` HIGH, GHSA-2p57-rm9w-gvfp, SSRF via improper categorization in `isPublic`
- `socks` HIGH, inherited from `ip`
- `mongodb` MODERATE, GHSA-vxvm-qww3-2fh7, driver may publish events containing authentication data

All three descended from one root: `@types/meteor` -> `mongodb ^4.3.1` -> `socks` -> `ip`. Note that
bumping `@types/meteor` did NOT fix this on its own - 2.9.11 still declares `mongodb ^4.3.1`.
Regenerating the `lockfileVersion: 1` lockfile (written by npm 6, still claiming `version: 0.0.0`) is
what let `socks` float 2.6.2 -> 2.8.9, and 2.8.x dropped the `ip` dependency entirely.

**Changed - `.npmrc` added with `omit=optional`, to stop the toolchain pulling the AWS SDK.**
Regenerating the lockfile also grew the tree 30 -> 53 packages, because `mongodb@4.17.2` declares
`@aws-sdk/credential-providers` as an OPTIONAL dependency for AWS IAM auth and npm installs optional
dependencies by default. That added 22 AWS SDK / smithy packages to a toolchain whose entire job is
reading `.d.ts` files - it never opens a MongoDB connection, let alone authenticates to one. Since
`package.js` declares no `Npm.depends`, none of it could ever ship, but it is still install-time
supply-chain surface for no benefit. `node_modules` now holds 17 top-level entries with no
`@aws-sdk` and no `@smithy`, while `mongodb` itself stays because `@types/meteor` reads its type
definitions. `tsc` still exits 0 and `npm audit` still reports 0.

**Changed - the test harness moved off two dead runners onto Meteor 3.x-native tooling.**
The suite could not run at all on Meteor 3. CI drove it with `@zodern/mtest`, whose last commit is
2022-02-23 and which depends on `puppeteer ^13.4.0` - it predates Meteor 3.0 entirely. Meteor's own
`test-in-console` is not a substitute: measured here, it boots the app and then waits for a browser
to connect, so `--once` never terminates. Both were replaced with the stack the rest of this
workspace already uses:

- `tinytest` -> `meteortesting:mocha`, in `package.js` `Package.onTest` ONLY. `Package.onUse` is
  untouched, so nothing changes for consuming apps and no test package can reach an app bundle.
- headless browser -> `playwright` 1.62.1, the same driver `workspace/e2e` runs. Chosen over
  `puppeteer` on two counts: it is the existing workspace standard, and puppeteer's current release
  (25.9.0, published 2026-08-25) sits right on the edge of the 7-day supply-chain quarantine while
  playwright 1.62.1 (2026-07-30) clears it by a month.
- `@types/mocha` 10.0.10 added, and `"mocha"` appended to the tsconfig `types` array, because the
  same TypeScript 6 ambient-loading behaviour documented above applies to `describe` and `it`.

The 21 tests were ported one-for-one: **21 `Tinytest.add` blocks -> 21 `it()` blocks, and 62
`test.equal` calls -> 62 `equal()` calls**, with the `@ts-expect-error` and `@ts-ignore` pragmas
preserved in place. Assertions use a local `equal()` helper built on `EJSON.equals` rather than
chai, because a Meteor package resolves npm imports only through `Npm.depends`, which is
package-scoped - adding chai would make an assertion library a RUNTIME dependency of a package that
currently ships none at all. `EJSON.equals` is exactly what Tinytest compared with, so the ported
assertions keep their original deep-equality meaning.

Verified by running the real pipeline rather than a simulation of it:
`TEST_BROWSER_DRIVER=playwright meteor test-packages --once --driver-package meteortesting:mocha
--release 3.5.1 ./` gives **21 passing, SERVER FAILURES: 0, CLIENT FAILURES: 0, exit 0**. Proven in
the other direction too - corrupting one expected value yields **19 passing, 2 failing, exit 1** - so
the harness reports failure loudly instead of exiting 0 on a broken run.

**Changed - CI rewritten for the Meteor 3.x world.**
`.github/workflows/test.yml` pinned Node 16.x for its type-check job and Node 12.x for its test job,
used `actions/checkout@v3` and `actions/setup-node@v3`, and ran a Meteor release matrix from 1.8.2 to
2.6 - none of which the consuming app has used for over a year. It now runs Node **24.x** on both
jobs (matching `frontend/.nvmrc`, which pins v24.15.0), `actions/checkout@v7` and
`actions/setup-node@v7` (current majors, read from the GitHub API rather than assumed), npm caching,
and a single Meteor **3.5.1** matrix entry - the release `workspace/frontend` actually runs.

**Removed - `.versions`.**
A generated Atmosphere lockfile fossil that still named `itgenio:persistent-session@0.4.12`,
`meteor@1.11.5`, `typescript@4.9.5` and `tinytest@1.2.3`. It predates even the ferjep fork, is
referenced by nothing in this repo, and describes a package name we no longer publish under. Meteor
regenerates it on `meteor publish` if it is ever needed again.

**Known and deliberately NOT changed - `api.versionsFrom(['1.8.2', '1.12', '2.3', '3.0'])`.**
CI now exercises Meteor 3.5.1 only, so the 1.8.2 / 1.12 / 2.3 entries are a compatibility claim that
nothing in this repo checks. They were not verified before this change either - the runner that
nominally covered them, `@zodern/mtest`, has been dead since 2022 and never supported Meteor 3.x -
so this makes an existing gap visible rather than creating one. The list is left intact because
narrowing it is a BREAKING change for any consumer on Meteor 1.x/2.x, which is a bigger decision
than a CI fix; `package.js` now carries a comment stating plainly that 1.x/2.x support is legacy and
unverified. Narrowing to `['3.0']` remains open.

### [0.5.0] - 2026-09-01 - forked to `a4xrbj1:persistent-session`

Forked from `ferjep:persistent-session@0.4.13` and renamed to `a4xrbj1:persistent-session`.

**Why the fork.** The package sits on the login-persistence path of a production application, and
its upstream is effectively unmaintained: `ferjep` had two commits in two and a half years, the most
recent (2025-02-11) merely relaxing a `versionsFrom` constraint. Its own upstream `itgenio` last
changed code on 2024-02-19, and the chain above that (`cult-of-coders`, 2021; `u2622`, now deleted
from GitHub) is older still. A three-deep fork chain with a single maintainer and no activity is not
a dependency to leave under a session layer.

**Fixed - persistent keys were silently dropped for any named dict.**
`store()` wrote the persistent and authenticated key LISTS to `__PSKEYS__` / `__PSAKEYS__` while
`getPSKeys()` / `getPSAKeys()` read them back from `__PSKEYS__<dictName>` / `__PSAKEYS__<dictName>`.
The two only coincide for the default `Session`, whose `_dictName` is the empty string - which is
why this survived so long. For every other dict the key list came back empty on reload and all of
its persistent and authenticated values were lost. Both writes are now namespaced to match the
readers. No migration is needed: the mismatched data was never readable.

**Fixed - one bad localStorage entry silently aborted the whole expiry sweep.**
`amplify.clearExpired()` wrapped its entire loop in a single `try` with an empty `catch (error) {}`.
A single unparseable value stopped the sweep from that entry onward, silently - and
`JSON.parse(localStorage.getItem(key) ?? '')` throws on a missing key, because `''` is not valid
JSON. This matters most exactly where it hurts most: `clearExpired()` is the recovery path
`store()` calls after a quota-exceeded write, so the one moment the cache most needed pruning was
the moment a single bad entry could stop it, causing the retry to fail as well. Each entry is now
parsed in its own `try`, an unparseable entry is reclaimed rather than ignored, and removal still
happens after the scan because `localStorage` is index-addressed and deleting mid-walk renumbers the
remaining entries.

**Unchanged.** The public API, storage format and data versions are identical to 0.4.13. This is a
drop-in replacement; only the package name changes.

### [0.4.8]

* TypeScript
* Only supports Meteor 1.8.2+
* Add exports

### [0.4.4](https://github.com/okgrow/meteor-persistent-session/compare/v0.4.3...v0.4.4)

 * Fix #32 - setDefaultPersistent with an object doesn't persist data (Reported by [rslonik](https://github.com/rslonik)

### [0.4.3](https://github.com/okgrow/meteor-persistent-session/compare/v0.4.2...v0.4.3)

 * Fix #48 - console.log messages (Reported by [themeteorchef](https://github.com/themeteorchef)

### [0.4.2](https://github.com/okgrow/meteor-persistent-session/compare/v0.4.1...v0.4.2)

 * Fix `Session.clear` issues, #42/#44 [PR #46](https://github.com/okgrow/meteor-persistent-session/pull/46) by [mhinton](https://github.com/mhinton)
 * Fix #37 - Values turned into strings (Reported by [lorensr](https://github.com/lorensr))
 * Fix #45 - 0.3.5 and 0.4.\* are incompatible (Reported by [freiit](https://github.com/freiit))

### [0.4.1](https://github.com/okgrow/meteor-persistent-session/compare/v0.4.0...v0.4.1)

 * Fix reference error in `PersistentSession.equals` [PR #39](https://github.com/okgrow/meteor-persistent-session/pull/39) by [ryepdx](https://github.com/ryepdx)
 * Changed quotes to valid JSON [PR #40](https://github.com/okgrow/meteor-persistent-session/pull/40) by [aramk](https://github.com/aramk)

### [0.4.0](https://github.com/okgrow/meteor-persistent-session/compare/v0.3.4...v0.4.0)

 * Revert 6e4b58d
 * Add a weak dependency on `accounts-base`, fixes #9 (Reported by [aadamsx](https://github.com/aadamsx) and [afoda](https://github.com/afoda))
 * Added tests [PR #33](https://github.com/okgrow/meteor-persistent-session/pull/33) by [RobertLowe](https://github.com/RobertLowe)
 * Use `Tracker.autorun` to detect logout, rather than monkey-patching `Meteor.logout` [PR #33](https://github.com/okgrow/meteor-persistent-session/pull/33) by [RobertLowe](https://github.com/RobertLowe)
 * Permit namespacing and instantiation of custom PersistentSessions [PR #33](https://github.com/okgrow/meteor-persistent-session/pull/33) by [RobertLowe](https://github.com/RobertLowe)
 * Add support for `ReactiveDict`'s `all` and `equals` [PR #33](https://github.com/okgrow/meteor-persistent-session/pull/33) by [RobertLowe](https://github.com/RobertLowe)
 * Do not stringify values (amplify already does), fixes #31 [PR #35](https://github.com/okgrow/meteor-persistent-session/pull/35) by [mike182uk](https://github.com/mike182uk)

### [0.3.4](https://github.com/okgrow/meteor-persistent-session/compare/v0.3.3...v0.3.4)

 * Don't try to parse values that weren't explicitly set through Session, fixes #24 (Reported by [tcastelli](https://github.com/tcastelli))

### [0.3.3](https://github.com/okgrow/meteor-persistent-session/compare/v0.3.2...v0.3.3)

 * Support `Session.set` taking an object parameter [PR #25](https://github.com/okgrow/meteor-persistent-session/pull/25)

### [0.3.2](https://github.com/okgrow/meteor-persistent-session/compare/v0.3.1...v0.3.2)

 * Add dependance on ejson package, fixes #22 [PR #23](https://github.com/okgrow/meteor-persistent-session/pull/23) by [djhi](https://github.com/djhi)

### [0.3.1](https://github.com/okgrow/meteor-persistent-session/compare/v0.3.0...v0.3.1)

 * Fix issue with trying to evaluate unparsed EJSON value

### [0.3.0](https://github.com/okgrow/meteor-persistent-session/compare/v0.2.2...v0.3.0)

 * Changed `default_method` to "temporary", fixes #15 ([pull request #16](https://github.com/okgrow/meteor-persistent-session/pull/16) by [aramk](https://github.com/aramk))
 * Store values as EJSON, fixes #17 (Reported by [jamesgibson14](https://github.com/jamesgibson14))

### [0.2.2](https://github.com/okgrow/meteor-persistent-session/compare/v0.2.1...v0.2.2)

 * Handle case where a persistent value is set to 0 (Reported by [IndigoStarfish](https://github.com/IndigoStarfish))

### [0.2.1](https://github.com/okgrow/meteor-persistent-session/compare/v0.2.0...v0.2.1)

 * Fix typos

### [0.2.0](https://github.com/okgrow/meteor-persistent-session/compare/v0.1.4...v0.2.0)

 * Complete Overhaul
 * Convert package format to 0.9.0 Unipackage

### [0.1.4](https://github.com/okgrow/meteor-persistent-session/releases/tag/v0.1.4)

 * Fixed `Session.getDefault` (Reported by [valZho](https://github.com/valZho))
 * Fixed `Session.equals` (Reported by [manuelpaulo](https://github.com/manuelpaulo))
 * Fixed configuration example in README.md

### [0.1.3](https://github.com/okgrow/meteor-persistent-session/releases/tag/v0.1.3)

 * Initial release
