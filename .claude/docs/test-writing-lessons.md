# Test-writing lessons

What the 2026-10-24 mutation campaigns showed to be weak in our tests. Check each item before committing a test.

## Pre-commit checklist

1. **Red first.** Watch a regression test fail on the old code, otherwise it may guard nothing. `GenericPageRunner.pageIdentity.test.tsx`, `generatedEntries.remount.test.tsx` (the latter failed with `'a'` instead of `'abc'` on the old generator).
2. **`toStrictEqual` when absence matters.** `toEqual` ignores `undefined`-valued keys, so a stray `"undefined"` var passed. `pageRunner/useBrains.contract.test.ts` (`$vars` assertion).
3. **Assert per item, not counts.** Counting buttons passes with an inverted condition; check which row's button is disabled. `DataTableActionPending.test.tsx` ("only the clicked row").
4. **Assert the message AND the behaviour that continues.** Spy on `console.warn/error`/the thrown message (component, key, suggestion), then check what still happens (request sent, render unchanged).
5. **Pin values that must never change, or compare to an independent implementation.** `initials.test.ts` pins palette indices (a module must not change colour between releases); `registryHash.test.ts` checks against a reference FNV-1a with published vectors.
6. **Both sides of `??` / `||`, and each falsy value** (`''`, `0`, `null`, `undefined`, `false`). `chartFormat.test.ts`, `UrlParamContext.test.tsx`.
7. **Boundaries.** `>=` vs `>`, TTL edge, first/last element, off-by-one, empty list. `pageRunnerUtils.units.test.ts` (TTL boundary).
8. **Off/disabled modes have no side effect.** Assert nothing is read from storage/URL, nothing registered, no timer, and that stored state is untouched. `AbDockEmpty.test.tsx` (`localStorage` keeps `collapsed` while nothing renders).
9. **Late async results.** Overlapping loads, resolution after unmount or after the input changed, timer cleanup on unmount. `useSourceLoader.concurrency.test.ts` (a stale answer must not overwrite the newer one), `useOpticalCenter` tests.
10. **Deterministic clock.** `vi.useFakeTimers()` and explicit advances, never real sleeps: `GenericPageRunner.loading.test.tsx` (`shouldAdvanceTime: true` when promises must still flow), `notifier.test.tsx`, `pageRunnerUtils.units.test.ts`, `useSourceLoader.behaviour.test.ts`.
11. **"No remount" means the same DOM element.** `toBe(input)` on the element, plus `isConnected`, focus and typed text. `generatedEntries.remount.test.tsx`.
12. **A guard that compares a list with itself never fires.** Feed the failing input (the `$type` guard-rail in `entriesGenerator` was dead code for this reason; see `entriesGenerator.pipeline.test.ts`).
13. **Generated code: typecheck AND run AND drift-test.** Strict + `noUnusedLocals/Parameters` typecheck of real generated entries (`generatedEntries.typecheck.test.ts`), runtime behaviour through the real generator, and a test that fails when the committed output is stale (`known-keys.test.ts`, `schemas/generatedNodeSchemas.drift.test.ts`).
14. **Windows paths.** Feed `/`, `\` and drive-letter case. `build/pathUtils.test.ts` (`isPathInside`).
15. **Assert semantics, not incidental CSS.** Prefer roles, `aria-*`, `inert`, disabled state, text, DOM order. `BulkActionsToolbar.test.tsx` checks `inert` (tab order), not a class; the `'bottom'` batch bar is checked with `compareDocumentPosition` (`DataTableBehavior.test.tsx`). Asserting a class is fine only when that class IS the contract (a token the theme guarantees), and then assert the specific token, not the whole string.
16. **Restore every global you replace.** `window.location`, `navigator.clipboard`, timers, env: restore in `afterEach`, not at the end of the test (a failing test skips it). `pageRunner/useBrains.contract.test.ts` once left `window.location` replaced for the rest of the file. `vitest.config.ts` now sets `restoreMocks`, `unstubEnvs` and `unstubGlobals` centrally and `test-setup.ts` returns to real timers after each test; that covers `vi.spyOn`/`vi.stubGlobal`, not direct assignment.
17. **A documented key needs a test on every entry path.** Row, batch and form actions each ignored a different key (`confirm`, `reloadSources`, `strictParams`) because only one path was tested. List the paths, test each one.

## Equivalent mutants

Do not write tests for them; classify with a one-line reason in the PR or report:

- cosmetic constants (icon size, `sideOffset`, a pulse duration);
- unreachable guards (a ref that is never null, `error instanceof Error` when the library always throws one);
- `return undefined` vs `return;`, `??` vs `||` on strings where `''` and `undefined` behave the same;
- logic duplicated by a neighbour (a second invalidation of an already invalidated cache).

## When mutation testing is still worth it

Logic-heavy pure code: generators, parsers, URL/path helpers, formatters, hashes, schema mapping, or right after refactoring them. Not for markup or cosmetics.

- `@stryker-mutator/core`, `@stryker-mutator/vitest-runner` and `@vitest/coverage-v8` are root devDependencies since `d2411c9`. No Stryker config is committed yet: create one per package.
- Run ONE campaign at a time (they are expensive) with a single vitest worker.
- The 2026-10-24 campaigns used ad-hoc, sampled scripts (some files sampled at 100-300 mutants), so scores are indicative. The scripts lived outside the repo (`C:/tmp/mut-A-scripts/`, `C:/tmp/mutate-*.mjs`) and may be gone.
- Line/branch coverage was never measured before Stryker and `@vitest/coverage-v8` were installed.
