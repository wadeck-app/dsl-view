# dsl-view

Published source for `@wadeck-app/dsl-renderer` and `@wadeck-app/dsl-ui`.

## Packages

| Package | Purpose |
|---------|---------|
| `packages/dsl-renderer` | Runtime renderer + Vite build plugins + type utilities |
| `packages/dsl-ui` | Generic React UI components (DataTable, DialogForm, FieldText, etc.) |

Build each package: `npm run build` inside its directory.

## Subpath exports (`@wadeck-app/dsl-renderer`)

| Import path | Content |
|-------------|---------|
| `@wadeck-app/dsl-renderer` | Runtime: `defineRoutes`, `createRegistry`, `DslRenderer`, `GenericPageRunner`, `resolveExpressionValue`, `renderChildren`, type utilities |
| `.../build/entriesGenerator` | Vite plugin that generates `src/generated/entries.tsx` |
| `.../build/pageTypesGenerator` | Vite plugin that generates `src/generated/page-types.ts` |
| `.../build/adapters/ZodContractAdapter` | `ContractAdapter` implementation for `defineRoutes`/Zod contracts |
| `.../build/ContractAdapter` | `ContractAdapter` interface |
| `.../build/urlNormalizer` | URL normalization utility |
| `.../build/dslCompiler` | Node-only: `compileDslDocument`/`compileDslPagesDir` — pre-compiles YAML + runs static DSL checks for CI |

## Key source files

| File | Role |
|------|------|
| `src/engine/DslRenderer.tsx` | Core recursive node renderer |
| `src/engine/GenericPageRunner.tsx` | Page lifecycle: source loading, action dispatch, vars, brains |
| `src/engine/useBrains.ts` | Brain execution engine ($http.*, $ctx.*, $chain, polling) |
| `src/build/entriesGenerator.ts` | Vite plugin scanning components for `@registryCategory` JSDoc |
| `src/build/pageTypesGenerator.ts` | Vite plugin validating YAML `$sources` against contract types |
| `src/build/dslCompiler.ts` | Compiles a DSL page to a `CompiledDslArtifact` + static diagnostics (Node-only, imports `fs`) |
| `src/registryHash.ts` | `computeRegistryFingerprint` — isomorphic registry shape hash, used to detect a stale compiled artifact |

## Canonical consumer

The sibling `capability-framework` repo (same parent workspace directory as this repo, name not path - its absolute location varies per machine/user) - check there for real-world usage patterns (contracts package, custom UI library, app setup, YAML examples).

capability-framework consumes the real published `@wadeck-app/dsl-renderer` / `@wadeck-app/dsl-ui` packages, tracking the `latest` dist-tag. dsl-view's CI publishes a new `latest` build on every push to `main`, so changes here reach consumers within about a minute — no local linking needed.

Note: `.github/workflows/publish.yml` calls `wadeck-app/ci-templates`'s `compute-version` action, which can in principle publish under a different dist-tag (e.g. for breaking changes) — but only when a manual `version` input is supplied via `workflow_dispatch`. On a normal push to `main` (no manual input), the action's `else` branch hardcodes `dist_tag=latest` regardless of any breaking-change flag — confirmed 2026-10-11 by reading `compute-version/action.yml` directly. There is currently no dist-tag-based signal that would warn an unpinned `latest` consumer of a breaking change.

capability-framework's own `packages/dsl-renderer/` and `packages/dsl-ui/` directories - orphaned leftovers from before an Aug 2026 migration (commit `26ad35d`), never wired into its npm `workspaces` array - were deleted entirely in a 2026-10-11 cleanup. If you see either referenced again there, it's a regression, not a second source of truth to reconcile with.

## Consumer documentation

`.claude/docs/dsl-renderer-consumer-reference.md` - complete reference for agents building apps that consume these packages.

`.claude/docs/inventory.md` - every dsl-ui component (registry name, category, key props, when to use it), so a consuming agent picks one instead of hand-rolling. **Keep it up to date in the same change** that adds, renames, removes or repurposes a component (new `@registryCategory` component = new row). The `dsl-ui/component-in-inventory` violation fails `violations check` when an annotated component is not named in backticks there; it does not catch stale or wrong rows, so re-read the row when you change a component's props or purpose.

## Local violation rules

Rules live in `.violations/rules/`. Their tests must use `node:test` + `node:assert/strict` (what `violations rules create` scaffolds): `violations test` compiles each `*.test.ts` and runs `node --test` on it, and vitest is not supported there (it fails with a bare "test failed"). Run `violations test --local` from the repo root after touching a rule.

Pitfall: `violations test` rewrites a quoted relative `.js` path literal (a `./` followed by a name and `.js`, in quotes) as an import specifier, even inside a template string, so the string becomes a `file://` URL. Build such strings by concatenation, as `no-unexported-component` does.

## Agent reference docs

| Doc | Description |
|---|---|
| `.claude/guiding-principles.md` | YAML-surface rules, `@registryCategory` pitfalls, build constraints + session lessons |
| `.claude/docs/theming.md` | Tokens, `ThemeScope` vs `ThemeContext`, subtree nesting, why `dark:` variants are banned |
| `.claude/out-of-scope.md` | What this project explicitly does not cover |
| `.claude/product-vision.md` | Roadmap: JSON Schema direction, pluggable ContractAdapter |
| `.claude/threat-model.md` | Silent failure risks and guardrail threats |
| `.claude/docs/test-writing-lessons.md` | Pre-commit checklist for tests, from the mutation-testing campaigns (read before writing tests) |
