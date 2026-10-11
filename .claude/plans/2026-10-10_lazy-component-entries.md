# Lazy component entries (opt-in code-splitting for entriesGenerator)

> **Status: implemented, pivoted from this plan's original design.** Sections 1 and
> 4 below (a global `BuildEntriesOptions.lazyComponents` flag) were NOT built.
> Instead, per-component `@registryLazy` JSDoc opt-in was built — the item this
> plan originally listed as "out of scope for v1". See "What actually shipped"
> at the end of this file for why and what differs from the design below.

## Problem

`entriesGenerator.ts` generates one static `import { ComponentName } from '...'` per
discovered component (line ~564). Every `dsl-*-app` eagerly bundles its entire
component catalogue into the main chunk regardless of which components a given
page actually uses. Reported by app-core (via cross-session message): their main
chunk is ~1MB (300KB gzip), past Rollup's 500KB warning threshold, and will grow
with their larger catalogue.

Confirmed in source: `BuildEntriesOptions` only has `usePackageImports` — no
lazy/dynamic-import option exists today.

## Design

### 1. New opt-in flag: `BuildEntriesOptions.lazyComponents?: boolean` (default `false`)

Opt-in, not default-on — changes bundle-splitting behavior and requires a
`Suspense` ancestor (added unconditionally in step 3, so this is safe either way,
but default-off avoids surprising existing consumers with new chunk-loading
network waterfalls on first run).

### 2. `entriesGenerator.ts` codegen change

When `lazyComponents: true`, replace the per-component static import with:

```ts
const ComponentName = React.lazy(() =>
  import('<importPath>').then(m => ({ default: m.ComponentName }))
)
```

instead of:

```ts
import { ComponentName } from '<importPath>'
```

No change needed to `generateSimpleEntry()` — it already emits `<ComponentName .../>`
as JSX, and JSX works identically against a `React.lazy()`-wrapped reference.
Type-only prop references (`import('path').ComponentNameProps['x']`) are untouched
since those are type-space, not runtime imports.

### 3. `GenericPageRunner.tsx`: unconditional `<Suspense>` wrapper

Wrap the rendered page tree in `<Suspense fallback={suspenseFallback ?? null}>`.
Added unconditionally (not gated behind `lazyComponents`) so:
- it's a no-op when nothing suspends (today's eager-import consumers),
- it's forward-compatible if a future consumer mixes lazy and eager entries.

New optional prop: `GenericPageRunnerProps.suspenseFallback?: React.ReactNode`
(default `null` — host app controls the loading UI, consistent with "no silent
defaults" — document that `null` means no visible loading state unless the host
sets one).

### 4. Vite plugin wiring

`entriesGenerator()` plugin factory takes an options object today only via
`usePackageImports` auto-detection. Add a plugin-level option:

```ts
entriesGenerator({ lazyComponents: true })
```

threaded into `buildOptions` alongside `usePackageImports`.

### 5. Tests

- `entriesGenerator.test.ts`: new case asserting codegen output for
  `lazyComponents: true` matches the `React.lazy(...)` pattern instead of a
  static import.
- `GenericPageRunner.test.tsx`: new case asserting a `Suspense` boundary exists
  and `suspenseFallback` renders while a lazy import is pending (use a
  controllable mock dynamic import / `vi.doMock`).

### 6. Docs

Update `.claude/docs/dsl-renderer-consumer-reference.md` (via `write-doc` skill)
with the new `lazyComponents` flag, the `suspenseFallback` prop, and the
tradeoff (first interaction with a lazily-loaded component triggers a network
fetch — not free, just deferred).

## Explicitly out of scope for v1

- Per-component granularity (e.g. a `@registryLazy` JSDoc tag to lazy-load only
  some components). All-or-nothing via one flag is enough to solve app-core's
  stated problem (whole catalogue in one chunk) without new authoring surface.
- Preloading/prefetch heuristics (e.g. lazy-load but prefetch on hover/route
  transition). Can be a follow-up once `lazyComponents` ships and real usage
  data exists.

## Open question for Wadeck before implementing

None blocking — this is a self-contained, backward-compatible opt-in. Only
decision point: confirm `suspenseFallback` defaulting to `null` (silent, no
spinner) is acceptable, since CLAUDE.md generally wants explicit opt-in UX
rather than silent defaults. Alternative: make `suspenseFallback` required when
`lazyComponents: true` is set — adds a tiny bit of friction but matches the
"no silent configuration" house rule more strictly.

## What actually shipped (pivot from the design above)

Mid-implementation, Wadeck pushed back on an all-or-nothing global flag: real
measurement (temporarily removing `Chart.tsx` from app-core's build) showed
`Chart`/recharts alone accounts for ~40% raw / ~38% gzip of the ~1MB bundle —
the weight is concentrated in one component, not spread evenly across the
catalogue. Lazy-loading *every* component for that would add Suspense/async
ceremony to 90+ components to fix what one component causes.

Shipped instead:

- **`@registryLazy` JSDoc tag**, opt-in per component (same pattern as
  `@registryCategory`/`@registryTags`/`@registryBind`), not a global
  `BuildEntriesOptions` flag. Only `Chart.tsx` is tagged today.
- Codegen wraps each lazy component's own output in **its own `Suspense`**
  (`fallback={null}`, hardcoded, not configurable) — not just the page-level
  one. A code-review caught that a single page-level `Suspense` would blank
  the *entire* page while one chart's chunk loads; scoping it per-component
  means only that component's slot blanks.
- `GenericPageRunner`'s page-level `Suspense`/`suspenseFallback` prop still
  exists, but is a no-op for generated `@registryLazy` entries — they never
  reach it because they contain their own loading/error state (see
  `LazyBoundary` below).
- Resolved the open question above: `suspenseFallback` is no longer silent.
  Not passing it (`undefined`) renders an internal warning component that
  `console.warn`s once while the fallback is actually visible. Passing `null`
  explicitly opts out of the warning. This satisfies "no silent config" without
  forcing every consumer to supply a spinner.
- Added a shared `LazyBoundary` component (`src/engine/LazyBoundary.tsx`,
  exported from the package root), pairing a `Suspense` with an error boundary.
  Each generated `@registryLazy` entry wraps its own output in `LazyBoundary`,
  so a rejected chunk `import()` (stale hash after redeploy, network blip)
  only errors that component's slot — not the whole page.
- First attempt put a second, near-duplicate error-boundary class directly in
  `GenericPageRunner` as a page-level "backstop." Review correctly caught two
  problems and it was removed entirely: (1) a React error boundary catches
  *any* descendant rendering error, not just lazy-chunk failures, so an
  unrelated bug anywhere on the page would get silently mislabeled "Failed to
  load a page component" and hidden from the user — the opposite of
  CLAUDE.md's "fail loudly" rule; (2) it duplicated `LazyErrorBoundary`'s logic
  instead of reusing it. `GenericPageRunner` now only provides the page-level
  `Suspense` (a legitimate backstop for a hand-authored `React.lazy` entry
  with no `Suspense` ancestor at all) — never an error boundary. A
  hand-authored entry wanting the same error containment generated entries get
  must wrap itself in the exported `LazyBoundary`, same as codegen does.

Not revisited: whether the generated per-component `Suspense`'s hardcoded
`fallback={null}` should also be configurable. Left as a deliberate,
undocumented-to-the-user implementation detail for v1 — the blank window is
local to one component's slot and typically brief (small chunk, likely
already warm from the browser cache after first load), unlike the page-level
case this plan was written to fix.

### Second review round: the no-silent-fallback warning was in the wrong place

The `GenericPageRunner`-level "warn if `suspenseFallback` not passed" component
(added above) can never fire for a `@registryLazy` entry: `LazyBoundary`'s own
inner `Suspense` (`fallback={null}`, hardcoded) is the nearer ancestor and
resolves the suspension first, so the outer page-level `Suspense`/warning never
even sees it. The warning only ever fired for a hand-authored entry bypassing
`LazyBoundary` entirely — not the sanctioned, generated path the whole feature
exists for. The doc's "warns once in dev console" claim was simply false for
the one case readers would assume it covered.

Fixed by moving the warning into `LazyBoundary` itself — its `Suspense`
fallback is now a tiny component that `console.warn`s once while a
`@registryLazy` component's chunk is pending, instead of the hardcoded
silent `null`. `GenericPageRunner`'s own warning stays, now accurately scoped
to its real (narrow) case: a hand-authored `React.lazy` entry with no
`Suspense`/`LazyBoundary` of its own.
