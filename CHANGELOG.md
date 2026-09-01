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
