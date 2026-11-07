# Product Vision — dsl-view

## Current state
Two published packages:
- `@wadeck-app/dsl-renderer` — YAML DSL runtime engine and Vite build plugins for declarative React page authoring.
- `@wadeck-app/dsl-ui` — generic React UI components (DataTable, DialogForm, FieldText, etc.) consumed by renderer-built pages.

Target use case: admin and internal tooling pages defined in YAML, eliminating hand-written React component trees for data-driven UIs.

## Planned / signalled directions
- Shipped: `npm run generate-node-schemas` in `dsl-ui` generates the per-component Zod node schemas (`src/schemas/generated-node-schemas.ts`), `known-keys.json` ships the component key manifest for CLIs, and `compileDslDocument`/`compileDslPagesDir` (`dsl-renderer/build/dslCompiler`) run static DSL checks in CI. Not built: a JSON Schema export (no `toJSONSchema` or equivalent in `packages/*/src` or `scripts`) so editors and validators outside this toolchain can understand the YAML DSL.
- `ContractAdapter` interface is pluggable (ZodContractAdapter is provided); multiple backend contract formats are a natural extension point.
- Brain system (`$brains`) supports HTTP, var mutations, navigation, chaining, polling — already present; continued expansion of action types is expected.

## Purpose
The reusable component library (`dsl-ui`) and the DSL framework (`dsl-renderer`) shared by all of the owner's applications. A feature belongs here only if it is generic: no product vocabulary, no endpoint or data shape of one application (see "Scope of dsl-ui" in `guiding-principles.md`).

## Roadmap
Set 2026-11-07 from the owner's statement of purpose, the requests received so far and the open items found while closing the old plans. Order is priority; each line says what is open, not what is nice to have.

1. **Consumer experience of the library** (the main customer is an agent building an app).
   - Keep `.claude/docs/inventory.md` and the consumer reference true: a stale or wrong row is not caught by `dsl-ui/component-in-inventory`.
   - Consistent silent-fallback policy for an unlisted select value: `FieldSelect` and `PageSizeSelect` still show the first option silently, `CompactSelect` shows `Unknown: <value>` (only with `urlParam`).
   - Dev reports vs production: a wrong configuration is reported in development only; decide whether any must also surface in production.
2. **Robustness against the host app.** Components that rely on a plain `text-*` line height break when an app loads another stylesheet re-declaring it (`FigureRow` needed `!leading-[1.2]`); audit the geometry-critical components. `AppShell` top bar overflowing the page at 500 px was reported by a consumer and is not investigated.
3. **Authoring tooling.** A JSON Schema export of the node schemas (for editors and validators outside this toolchain); harden `generate-node-schemas` against prose after `@default` in a prop JSDoc.
4. **Charts and dashboards.** `Chart` and `TimeSeriesChart` overlap: align `xFormat: time` over several days (same ambiguity the new chart fixed with date-bearing ticks). `TimeSeriesSyncProvider` cannot be added from YAML, so two page runners on one page share a sync group unless they use different `syncGroup` names.
5. **Quality gates.** The `violations check` baseline is 306 (245 errors) in old files; reduce it so a new violation is visible. Local rule tests run on `node:test` through `violations test`.
6. **Review of single-consumer components** still in `dsl-ui`: `LiveToggle`, `FetchSpinner`, `CronBuilder` (keep or move out, per the scope rule).

Not planned: anything in `out-of-scope.md`; domain components (they are incubated in the requesting project's library, marked `@dsl-view-candidate`, and proposed only when mature and generic).
