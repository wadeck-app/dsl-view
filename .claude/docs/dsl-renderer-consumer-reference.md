# @wadeck-app/dsl-renderer — Consumer Reference

Complete reference for building apps with `@wadeck-app/dsl-renderer`. For framework internals, see the root `CLAUDE.md`.

## Core concepts

- **DSL page** — a YAML file declaring `$route`, `$sources`, `$actions`, `$vars`, `$brains`, and a node tree.
- **Node** — any YAML object with a `$type` key; maps to a registered React component.
- **Contract** — TypeScript module using `defineRoutes()` + Zod that declares API route shapes.

---

## Page YAML spec

```yaml
$route: /path/:id               # react-router-dom pattern; omit if page has no route
$navLabel: My Page              # optional nav label
$navOrder: 1                    # optional nav ordering

$vars:
  myVar: defaultValue           # local reactive state, mutable via $ctx.setVar brain

$sources:
  items: GET /api/items/        # shorthand: method + URL
  item:                         # object form
    url: GET /api/items/{id}
    params:
      id: $route.id             # param resolved from ctx ($vars, $route, $urlParam, $source.*)
    poll: 10s                   # re-fetch every 10s
    pollWhen: $vars.isLive      # only poll when this expression is truthy
    cache: 30s                  # cache response for 30s ("30s", "5m", etc.)

$actions:
  create: POST /api/items/      # shorthand
  update:                       # object form
    url: PATCH /api/items/{id}
    resultKey: updatedItem      # store response in ctx under this key
    reloadSources: true         # reload all sources after action; or [name1, name2]
    confirm: Delete this item?  # window.confirm text before executing

$brains:
  onSelect:
    $brain: $brains.$ctx.setVar       # built-in: set a $var
    varName: selectedId
    value: $outputs.table.rowClick
    # other built-ins: $ctx.navigate, $ctx.reload, $http.get/post/patch/put/delete
  fetchDetail:
    $brain: $brains.$http.get
    url: GET /api/items/{id}
    id: $vars.selectedId              # reactive input — brain re-runs when this changes
    $outputs: [name, description]     # capture response fields into $brains.fetchDetail.*
    $reload: [items]                  # reload sources after brain executes
  chainExample:
    $chain:
      - id: step1
        $brain: $brains.$http.post
        url: POST /api/auth/token
        $outputs: [token]
      - id: step2
        $brain: $brains.$ctx.setVar
        varName: authToken
        value: $chain.step1.token
    $reload: [items]

# Node tree starts here — all keys below are component props
$type: PageContent
sections:
  - $type: DataTable
    $id: table                        # enables $outputs.table.*
    rows: $sources.items
    # ...
```

---

## Node special keys

| Key | Effect |
|-----|--------|
| `$type` | Required — maps to registry component name |
| `$id: myId` | Enables `$outputs.myId.*` references elsewhere on the page |
| `$if: $vars.show` | Skip rendering when expression is falsy |
| `$outputs: { event: [field1] }` | Publish component events to ctx as `$outputs.myId.event` |
| `$context.expose: { newKey: ctxKey }` | Re-expose ctx keys under different names for children |

---

## Expression syntax (prop values)

Any string starting with `$` in a node prop is resolved at render time.

| Expression | Resolves to |
|------------|-------------|
| `$sources.name` | Full source response object |
| `$sources.name.field` | Field from source response |
| `$vars.key` | Page var |
| `$route.param` | URL route param |
| `$urlParam.name` | URLSearchParams value (inside `$sources.params` only) |
| `$outputs.id.event` | Published component output |
| `$brains.id.field` | Brain result field |
| `$ctx.key` | Raw value from ctx |
| `$props.key` | From `ctx['$props']` |

Inside `$sources.params`, `$source.name.field.sub[0]` (singular, dot-path + array index) resolves a nested field from another source's response.

---

## Contract definition

```ts
import { z } from 'zod';
import { defineRoutes } from '@wadeck-app/dsl-renderer';

export const MY_ROUTES = defineRoutes({
  '/api/items/': {
    GET:  { response: ItemListSchema },
    POST: { body: CreateItemSchema, response: ItemSchema },
  },
  '/api/items/:id': {
    PATCH:  { params: IdParamSchema, body: UpdateItemSchema, response: ItemSchema },
    DELETE: { params: IdParamSchema, response: z.object({ success: z.boolean() }) },
  },
});

// Merging multiple defineRoutes results — strip __baseUrl first or TypeScript errors result:
const { __baseUrl: _, ...myRoutes } = MY_ROUTES;
const { __baseUrl: __, ...otherRoutes } = OTHER_ROUTES;
export const ALL_ROUTES = { ...myRoutes, ...otherRoutes };
```

---

## Build setup

### `vite.config.ts`

```ts
import { entriesGenerator } from '@wadeck-app/dsl-renderer/build/entriesGenerator';
import { pageTypesGenerator } from '@wadeck-app/dsl-renderer/build/pageTypesGenerator';
import { ZodContractAdapter } from '@wadeck-app/dsl-renderer/build/adapters/ZodContractAdapter';
import { ALL_ROUTES } from 'my-contracts-pkg';

const contractAdapter = new ZodContractAdapter(
  ALL_ROUTES,          // route object
  'ALL_ROUTES',        // export name as string (for generated type expressions)
  'my-contracts-pkg',  // npm package name (for generated imports)
  'my-contracts-pkg',  // helperImportSource (optional) — package from which RouteResponse etc. are imported; defaults to 3rd arg
);

export default defineConfig({
  plugins: [
    react(),
    entriesGenerator(),
    pageTypesGenerator({ adapter: contractAdapter }),
  ],
});
```

### Routes: `routesGenerator`

`$route` lives only in the page YAML. `routesGenerator()` (from `@wadeck-app/dsl-renderer/build/routesGenerator`, add it to `plugins`) emits `src/generated/routes.ts` with route data only; `App.tsx` stays hand-written and maps over it:

```tsx
import { dslRoutes } from './generated/routes.js';

{dslRoutes.map(r => (
  <Route key={r.route} path={r.route} element={<GenericPageRunner yamlText={r.yamlText} registry={appRegistry} fetcher={fetcher} />} />
))}
// r.navLabel / r.navOrder (optional) feed the nav; r.source is the YAML filename.
```

Nav keys: `$navLabel` (string, or `false` to hide), `$navOrder` (number), `$navVisible` (`false` hides the nav entry but keeps the route). `navVisible` is always emitted (default `true`); `navLabel` is absent when hidden. Every other `$nav<Name>` key lands in `navExtra` as `{ name: value }` (`$navBadge` -> `navExtra.badge`), unvalidated, its meaning owned by the consumer's `App.tsx`. A wrongly typed `$navLabel`/`$navOrder`/`$navVisible` fails the build, but a misspelled extra key (`$navLable`) just becomes an extra entry, so check `navExtra` key names on the consumer side.

`dslRoutes` is typed `readonly DslRouteEntry[]` (the interface is exported from the generated file), not an `as const` union, so filtering or sorting on optional fields like `navOrder` type-checks without a consumer-side re-declaration.

Two pages declaring the same `$route` fail the build, naming both files; so do routes differing only by param name (`/w/:id` vs `/w/:workerId`), which match the same URLs. Pages without `$route` are skipped. `GenericPageRunner` remounts when a route param changes (`/workers/001` to `/workers/002`), so no consumer-side keyed wrapper is needed; query-string changes do not remount.

### `dsl.config.yaml` (adjacent to `vite.config.ts`)

```yaml
packages:
  "@alias": my-dsl-ui-package   # additional component packages to scan; dsl-ui is always included

contracts:
  - package: "my-contracts-pkg"
    export: ALL_ROUTES
    adapter: zod
```

---

## Registry wiring

```ts
// src/registry.ts
import { createRegistry } from '@wadeck-app/dsl-renderer';
import { allEntries } from './generated/entries.js';

export const appRegistry = createRegistry(allEntries);
```

---

## Runtime

`RouterProvider` (from `@wadeck-app/dsl-ui`) must wrap the app, inside a react-router `BrowserRouter` — required for any `urlParam`-backed component (`Pagination`, `PageSizeSelect`, anything using `useUrlParam`/`useOptionalUrlParam`). Omitting it doesn't degrade gracefully: the page throws `useOptionalUrlParam(...) requires UrlParamContext` and renders blank.

```tsx
import pageYaml from './dsl/pages/items.yaml?raw';  // ?raw required
import { GenericPageRunner } from '@wadeck-app/dsl-renderer';
import { RouterProvider } from '@wadeck-app/dsl-ui';
import { BrowserRouter } from 'react-router-dom';
import { appRegistry } from './registry.js';

<BrowserRouter>
  <RouterProvider>
    <GenericPageRunner
      yamlText={pageYaml}
      registry={appRegistry}
      fetcher={async (urlSpec, params?, body?, headers?) => {
        // urlSpec is e.g. "GET /api/items/" or "PATCH /api/items/{id}"
        // params contains substituted path vars
        // return the parsed response body
      }}
      getToken={() => Promise.resolve(localStorage.getItem('token'))}  // optional
      brainRegistry={{}}   // optional custom brains
      suspenseFallback={<Spinner />}   // optional, see below — irrelevant for generated @registryLazy entries
    />
  </RouterProvider>
</BrowserRouter>
```

`GenericPageRunner` always wraps its render tree in one page-level `<Suspense>`, but this is a no-op for generated `@registryLazy` entries — `LazyBoundary` (see above) already resolves their suspension locally before it ever reaches this outer boundary. `suspenseFallback` only matters for a hand-authored `ComponentRegistryEntry` using bare `React.lazy` with no `Suspense` ancestor of its own; omitting it warns once in the dev console (pass `null` explicitly to silence it).

There is deliberately no page-level error boundary: catching every rendering error (not just a failed lazy chunk) would mask unrelated bugs behind a misleading message. `LazyBoundary` already warns in the console when a `@registryLazy` component's chunk is loading (no visible fallback configurable per-component for v1) and catches a rejected import with a visible error scoped to that component's own slot. If you hand-author a `ComponentRegistryEntry` using `React.lazy` yourself, wrap its output in `LazyBoundary` for the same containment.

---

## Writing custom components

```tsx
/**
 * @registryCategory atomic
 * @registryTags field select
 * @registryBind formData onChange
 */
export function FieldSelectSource({ label, options, value, onChange }: FieldSelectSourceProps) {
  return <FieldSelect label={label} options={options} value={value} onChange={onChange} />;
}

interface FieldSelectSourceProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  /** @slot tag:icon */
  icon?: React.ReactNode;   // React.ReactNode -> renderChildren(node['icon'], registry, ctx)
}
```

### entriesGenerator prop classification

| Prop type | Generated render behavior |
|-----------|--------------------------|
| `React.ReactNode` (named prop) | `renderChildren(node['propName'], registry, ctx)` |
| `children: React.ReactNode` | `renderChildren(node['items'], registry, ctx)` — DSL key is `items` |
| `(node, ctx) => React.ReactNode` | A closure re-entering `renderChildren` per call, merging the caller's own extra ctx |
| `@registryBind formData onChange` | Wrapped with FormContext accessor |
| Everything else | `resolveExpressionValue(node['propName'], ctx)` |

Skipped props: `className`, `style`, `ref`, `key`, `aria-*`, `data-*`.

### `(node, ctx) => ReactNode` props — e.g. DataTable's `expansion`/`renderNode`

Unlike a plain `React.ReactNode` slot (resolved once, up front), this shape is a function the *component itself* calls, once per invocation, with its own extra ctx — e.g. `DataTable` calls `renderNode(expansion, { row })` once per expanded row, where `row` is the clicked row's data (not knowable at render time, only when the user expands that specific row).

```yaml
- $type: DataTable
  expansionCondition: payloadText
  expansion:
    $type: JsonViewer
    row: $ctx.row       # required — not auto-injected, "YAML declares all wiring" applies here too
    field: payloadText
    maxHeight: 20rem    # optional — caps height with internal scroll; omit for unbounded growth
```

`row` must be wired explicitly via `$ctx.row` — nothing injects it automatically. Before this was wired at the generator level, `renderNode` resolved via the generic `resolveExpressionValue(node['renderNode'], ctx)` path, which is always `undefined` (no YAML can author a function literal) — the expand toggle existed and clicked, but rendered nothing. Same bug class as the pre-fix `Pagination`/`PageSizeSelect` `urlParam` gap.

Components without `@registryCategory` are silently skipped — no warning.

`@registryLazy` — component is `React.lazy()`-wrapped and split into its own chunk instead of statically imported. Opt in per component, for ones with a heavy own dependency (e.g. `Chart`/recharts cut app-core's bundle ~40%). The generated entry wraps just that component's own output in `LazyBoundary` (exported from `@wadeck-app/dsl-renderer`), so both a loading chunk and a failed chunk load only affect its own slot, not the rest of the page.

---

## URL-param-backed components

`$sources` reactively refetches when a `params` value references `$urlParam.<key>` or `$route.<key>` (see `useSourceLoader`'s `searchParams`/`routeParams` watch) — but only a real react-router URL change triggers it, not a `$vars`/`$outputs` change. A component makes a click actually cause that refetch by writing the URL itself, via `useUrlParam`/`useOptionalUrlParam` from `@wadeck-app/dsl-ui`:

```tsx
import { useOptionalUrlParam } from '@wadeck-app/dsl-ui';

export function MyWidget({ urlParam, value, onChange }: { urlParam?: string; value?: number; onChange?: (n: number) => void }) {
  const [urlValue, setUrlValue] = useOptionalUrlParam(urlParam);
  const activeValue = urlParam ? Number(urlValue) : value;
  const change = urlParam ? (n: number) => setUrlValue(String(n)) : onChange;
  // ...
}
```

`useOptionalUrlParam(undefined)` returns `[null, noop]` — the component falls back to its own controlled `value`/`onChange` props, no `RouterProvider` needed for that call. Pass a real key — to either `useOptionalUrlParam` or the non-optional `useUrlParam` — and both throw without a `UrlParamContext` provider (i.e. outside `RouterProvider`). Both call react-router's `setSearchParams` under the hood (soft URL update, no reload), so `useSourceLoader`'s reactive watch picks it up.

This is the sanctioned mechanism for any `dsl-ui-*` component accepting a `urlParam: foo` YAML prop — use it instead of hand-rolling react-router plumbing per component. `Pagination` and `PageSizeSelect` are the first two adopters:

```yaml
- $type: Pagination
  urlParam: page        # 0-based, backed by ?page= in the URL
  total: $sources.rows.total
  size: $sources.rows.limit
- $type: PageSizeSelect
  urlParam: size         # backed by ?size= in the URL
  options: [25, 50, 100]
```

Omit `urlParam` to use either component in plain controlled mode (`page`/`onPageChange`, `value`/`onChange`).

---

## Generated files

Both files are auto-generated at `vite dev` / `vite build` start and committed to the repo.

| File | Generator | Do not edit |
|------|-----------|-------------|
| `src/generated/entries.tsx` | `entriesGenerator` | ✓ |
| `src/generated/page-types.ts` | `pageTypesGenerator` | ✓ |

dsl-renderer generates nothing else — in particular, not the app shell. `App.tsx` (routes, nav, layout) is hand-written by the consumer and lives at `src/App.tsx`, importing `@wadeck-app/dsl-renderer`/`@wadeck-app/dsl-ui` as plain bare package imports (no aliases, no relative paths into these packages) — confirmed in `orch-app`, `dsl-library-app`, `dsl-agent-fleet-app`. If an app adds its own local, unpublished generator for its App.tsx (e.g. `dsl-wdrive-app`'s `appGenerator.ts`), that output belongs under `src/generated/` too, for the same "do not edit" signal — it's an app-specific extension, not something dsl-renderer provides.

---

## Compiled DSL artifacts and check-dsl CI

`compileDslDocument`/`compileDslPagesDir` (from `@wadeck-app/dsl-renderer/build/dslCompiler`, Node-only) pre-parse a page's YAML and run the DSL's *static* checks — unknown `$type`, unknown `$`-directive, `nodeSchema` failures — ahead of time, so a broken page fails CI instead of showing a red error box to a user.

Not checked at compile time (need runtime `$sources` data): `ctxSchema`, and whether `$context.expose` references a ctx key that actually exists. `DslRenderer.tsx` still checks both of these at render, in dev, regardless of whether the page was compiled.

### `scripts/check-dsl.ts` (consuming app, not shipped by dsl-renderer)

```ts
import path from 'path';
import { compileDslPagesDir } from '@wadeck-app/dsl-renderer/build/dslCompiler';
import { appRegistry } from '../src/registry.js';

const { results, hasErrors } = compileDslPagesDir(path.join(__dirname, '../src/dsl/pages'), appRegistry);

for (const artifact of results) {
  for (const d of artifact.diagnostics) {
    console[d.severity === 'error' ? 'error' : 'warn'](`${artifact.sourcePath} ${d.nodePath} [${d.code}] ${d.message}`);
  }
}

process.exit(hasErrors ? 1 : 0);
```

Wire it into CI as its own step, e.g. `"dsl:check": "tsx scripts/check-dsl.ts"` in `package.json`, run before `npm run build`. There is no Vite plugin wrapper for this — it's a plain Node script, same model as `pageTypesGenerator` but invoked standalone instead of from `vite.config.ts`.

### Example: a page with an error

```yaml
# src/dsl/pages/items.yaml
$type: DataTbale        # typo — not a registered component
rows: $sources.items
```

```
src/dsl/pages/items.yaml $ [unknown-component-type] Unknown component type: DataTbale
```
Exit code `1`, build fails before deploy — instead of every user who opens this page seeing the red error box.

### Consuming a compiled artifact at runtime (optional)

`GenericPageRunner` accepts a pre-compiled artifact instead of `yamlText` — skips the per-mount YAML parse:

```tsx
import compiled from './dsl/pages/items.compiled.json';  // produced by your own build step from compileDslDocument()
import { GenericPageRunner } from '@wadeck-app/dsl-renderer';

<GenericPageRunner compiled={compiled} registry={appRegistry} fetcher={fetcher} />
```

Rules enforced by `GenericPageRunner` itself:
- Neither `yamlText` nor `compiled` passed → throws (programming error).
- `compiled.formatVersion` doesn't match the installed `@wadeck-app/dsl-renderer`'s `COMPILED_DSL_FORMAT_VERSION` → throws (artifact shape may be incompatible).
- `compiled.registryFingerprint` (from `computeRegistryFingerprint(appRegistry)` at compile time) doesn't match the current registry's fingerprint → `console.warn`, unconditionally (also in production), then renders anyway. This means an artifact compiled against an older/different registry is never silently stale — it warns every time, every environment, until recompiled.

The fingerprint is a structural hash (component names, categories, presence of `nodeSchema`/`ctxSchema`, `allowedChildren` keys) — best-effort drift detection, not a content hash of what's inside a schema. Changing what a `nodeSchema` validates internally, without adding/removing it, won't change the fingerprint or trigger the warning.

Packaging/distributing a `.compiled.json` artifact (zip, install, versioning) is **not** covered by dsl-renderer — that's app-core's domain. This only defines the artifact format and the two consumption points (`compileDslPagesDir` at build time, `compiled` prop at render time).

---

## Pitfalls

- `@registryCategory` missing -> component silently excluded from registry.
- `__baseUrl` not stripped when merging `defineRoutes` results -> TypeScript errors on the merged object.
- YAML files require `?raw` Vite suffix — no plugin needed, just the suffix.
- `dsl.config.yaml` must be adjacent to `vite.config.ts` — `entriesGenerator` auto-discovers it there.
- A URL in `$sources` that doesn't match the contract generates `@ts-expect-error` in `page-types.ts`, failing the TypeScript build.
- `src/generated/` is committed so editors have types without running the dev server; do not gitignore it.
- `compileDslPagesDir`/`compileDslDocument` only catch static DSL errors (`$type`, `$`-directives, `nodeSchema`) — a page can still fail at runtime on `ctxSchema` or a bad `$context.expose`, since those depend on `$sources` data not available at compile time.
- A compiled artifact's `registryFingerprint` mismatch only warns, it never blocks rendering — don't rely on it as a build gate; use `compileDslPagesDir`'s `hasErrors` in CI for that.
- Forgetting to wrap the app in `RouterProvider` (`@wadeck-app/dsl-ui`) throws `requires UrlParamContext` and renders blank, the moment any node uses `urlParam: foo` (`Pagination`, `PageSizeSelect`) — not optional once you use one of those.
- A `urlParam: foo` prop only does anything if the component itself calls `useUrlParam`/`useOptionalUrlParam` — passing it to a component that doesn't (most components, before this was introduced) silently resolves to a plain string prop with no wiring. Any page YAML written before this pattern existed (e.g. passing `urlParam:`/`default:` to a component whose props never included them) is stale and should not be copied as a working reference.
