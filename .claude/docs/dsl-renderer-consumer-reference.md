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
    pollWhen: $urlParam.live    # polls unless the param is absent, empty, 0 or false; other expressions are logged and ignored (it polls)
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

Two pages declaring the same `$route` fail the build, naming both files; so do routes differing only by param name (`/w/:id` vs `/w/:workerId`), which match the same URLs. Pages without `$route` are skipped. `GenericPageRunner` remounts (vars, outputs, brains, source data, action feedback all reset) when a route param changes (`/workers/001` to `/workers/002`) or when the document changes (`yamlText` text or `compiled` artifact), so no consumer-side keyed wrapper is needed, even when one element stays mounted and only swaps the document (`/jobs/new` to `/jobs`, both without params). Re-rendering the same document, polling and query-string changes never remount. Optional `pageKey` overrides the document part of the identity: the page remounts exactly when it changes.

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
      onActionError={(error, { action, kind }) => toast.error(error.message)}   // optional, see below
    />
  </RouterProvider>
</BrowserRouter>
```

**Row and batch actions** (a DataTable `action:` item, a bulk action):
- `{key}` in the action `url` is filled by dsl-renderer before the fetcher is called, from the clicked row, then route params, then URL search params. Values are percent-encoded. The fetcher receives the final URL (and still `{ id }` as `params` for hosts that read it).
- A `{key}` with no value fails loudly: no request is sent, the error names the action, the placeholder and the row keys.
- A failure (HTTP error, missing placeholder) is reported to the notifier (see below), to `onActionError` and to `console.error`, never as an unhandled rejection.
- `$actions` handlers called from a Form (`$ctx.<name>`) are lenient by default: `{key}` values come from the route, the query string and the form data, are substituted as given (no encoding, so a value you already encoded is not encoded twice), and an empty or missing one becomes an empty string with a one-time `console.warn`. Add `strictParams: true` to the action to get the row-action behaviour instead: values are percent-encoded and an empty or missing placeholder fails before any request with a named error, shown by the notifier. Switch an action only after removing any manual encoding of its values.

**Action feedback** (every `$actions` call that sent a request, and every failed `$brains` entry):
- Success -> `{ kind: 'success', message }`, failure -> `{ kind: 'error', message, status? }`, both with `action` = the `$actions` name or brain id. The failure message is the fetcher's `Error.message` (put the actionable server text there); `status` is the Error's numeric `status` when present.
- No host setup needed: without a notifier the runner shows an inline banner above the page (`role="status"` for success, auto-dismissed after 5 s; `role="alert"` for errors, dismissed by the user). Feedback is never console-only.
- To route feedback to your toast stack, wrap the runner (or the whole app) once:

```tsx
<NotifierProvider notify={({ kind, message }) => (kind === 'error' ? toast.error(message) : toast.success(message))}>
  <GenericPageRunner ... />
</NotifierProvider>
```

  dsl-ui's `ToastProvider` fits this mapping: `toast.error` stays until dismissed and is `role="alert"`; success and info auto-dismiss after 4 s and are `role="status"`.

  Types: `Notify = (n: Notification) => void`, `Notification = { kind: 'success' | 'error'; message: string; status?: number; action?: string }`. A provider replaces the banner. Widgets use `useNotifier()`, which throws outside a runner or provider. `onActionError` still fires for row and batch failures, in addition to the notifier.
- No feedback for an action that sent no request (no `url`, or `confirm` declined).
- Per-action keys in `$actions.<name>` (unknown keys are a compile-time error and a `console.error` at runtime):

| Key | Effect |
|---|---|
| `successMessage` | Success text. Default `Done`. A `message` string in the JSON response overrides it. |
| `errorPrefix` | Failure text becomes `<prefix>: <message>`. |
| `notify: false` | No feedback for this action. Failures still reach `console.error` and `onActionError`. |
| `strictParams: true` | Form handlers (`$ctx.<name>`) only: encode `{key}` values and fail on an empty or missing one (see above). |

- A `$brains` entry accepts `$notify: false` to keep its failure out of the feedback (still published as `$brains.<id>.$error`).
- Double submit: while an action runs, a repeated call of the same action (same row for row actions) is ignored with a console warning. `$ctx.$actionPending.<name>` is `true` while it runs, e.g. `disabled: $ctx.$actionPending.clearEntry` on a button. `$ctx.$actionPendingRows.<name>` lists the row ids in flight for that action (`*` for a batch call). DataTable follows both by default: a row button is disabled and `aria-busy` only for its own row (or every row during a batch call), and the batch button follows `$actionPending`. A host that passes only `actionPending` keeps the per-action-name behaviour.
- A failed named handler (`$ctx.<name>`) still rejects after notifying, so a form keeps its values.

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
| `children: React.ReactNode \| ((…) => React.ReactNode)` (FieldWrapper) | Same as above: YAML can only author the node form. The label/ARIA props FieldWrapper clones onto its first child do not reach a nested DSL node's input, so wire labels on the field itself (`FieldText label:`) rather than through FieldWrapper in YAML. |
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

**Resetting `page` when a filter changes.** `SearchBar`, `CompactSelect` and `PageSizeSelect` accept `resetUrlParams: [page]`: those keys are deleted in the same URL update as the control's own key (one `replace` navigation, other params kept). Not applied by default, so without it a filter change on `page=3` leaves `page=3` and the table shows an empty page.

```yaml
- $type: SearchBar
  urlParam: event
  resetUrlParams: [page]
- $type: CompactSelect
  urlParam: status
  resetUrlParams: [page]
  ariaLabel: Status
  options: [...]
```

`resetUrlParams` without `urlParam`, or containing the control's own `urlParam`, throws. A custom `UrlParamService` host must honour `set(key, value, { remove })`; `useOptionalUrlParam(key, { resetUrlParams })` is the hook form.

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

`compileDslDocument`/`compileDslPagesDir` (from `@wadeck-app/dsl-renderer/build/dslCompiler`, Node-only) pre-parse a page's YAML and run the DSL's *static* checks — unknown `$type`, unknown `$`-directive, unknown key, `nodeSchema` failures — ahead of time, so a broken page fails CI instead of showing a red error box to a user.

Unknown keys (`unknown-key`, error) come from `knownKeys` on each generated registry entry: the keys the render actually reads (`children` props are read from `items`). A registry entry without `knownKeys` (hand-written, or generated by an older `entriesGenerator`) yields an `unchecked-keys` warning instead of a silent skip.

The same check runs in `DslRenderer` in development (same `NODE_ENV` guard as the unknown-`$`-directive alert), for pages that run without the compiler: a `console.warn` naming the component, the key, a suggestion (`children` -> `items`, closest known key) and the known keys, plus the keys of `itemKeys` props such as DataTable `columns`. It never changes what renders. Runtime has no node path, so a warning appears once per component type + key per page load; a hand-written entry without `knownKeys` gets one "keys not checked" line per type. Both checks share `src/nodeKeyCheck.ts`.

Shape errors, all `error`, all because the node would render nothing:

| Code | Meaning |
|---|---|
| `invalid-node` | A slot item (or the whole page, e.g. an empty file) is not a map. |
| `missing-type` | A map in a slot, or the page itself, has no `$type`. |
| `invalid-slot` | A slot (`items`) is neither a list nor an expression string; `items:` with nothing under it counts. |

An invalid YAML file makes `compileDslDocument` throw `[dslCompiler] <file>: invalid YAML - …` (the file name js-yaml does not give). `$actions` keys the compiler does not know are `unknown-action-key` errors.

Build-time generators (Vite plugins) fail or warn loudly instead of skipping:

- `entriesGenerator` warns when a configured package has no components directory, and when a page `$type` matches no scanned component (ignore it for components you register by hand; `ExtensionSlot` and `<module>:<Name>` are not reported). Test, spec and stories files are never scanned.
- `routesGenerator` fails when two page filenames map to the same import identifier (`a-b.yaml`, `a_b.yaml`).
- `dsl.config.yaml` that is invalid YAML or not a map fails with its path. A `contracts` package installed under the app's `node_modules` is imported through its `package.json` entry (`exports["."]` import/default, `module`, `main`).
- Hot updates regenerate files on Windows too: the watched-path check normalises separators and drive-letter case.

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

### Validating without a registry (CLIs)

A tool with no React and no generated `entries.tsx` can check built-in keys from the manifest shipped by `dsl-ui`:

```ts
import manifest from '@wadeck-app/dsl-ui/known-keys.json' with { type: 'json' };
import { findUnknownKeys } from '@wadeck-app/dsl-renderer/build/unknownKeys';

// skipType: app-local `<moduleId>:<Name>` components are not in the manifest.
const diagnostics = findUnknownKeys(parsedYamlDoc, manifest, { skipType: (t) => t.includes(':') });
```

`findUnknownKeys` is the same walk `compileDslDocument` uses (a registry is also a valid manifest). `known-keys.json` is regenerated with `npm run generate-known-keys` in `packages/dsl-ui`; a test fails when it is stale.

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

## A/B experiments in views (`AbTest`, `AbExperiments`)

A view declares a test with the `AbTest` node; the host mounts ONE dock for all of them.

```yaml
$type: AbTest
id: tab-style            # letters, digits, _ and -; names localStorage `ab.<id>` and the URL parameter
label: Tab style         # row name in the dock
initial: pill            # reference variant; must be a key of `variants`
variants:
  pill: { label: Pill, hint: Tinted pill behind the active tab., view: { $type: Tabs, ... } }
  ring: { label: Ring, hint: Outline ring around the active tab., view: { $type: Tabs, ... } }
```

Host (once, near the root; React, not YAML):

```tsx
import { AbExperiments } from '@wadeck-app/dsl-ui';
<AbExperiments enabled={settings.experiments}>{app}</AbExperiments>   // `tests={[...]}` adds useAbTest tests to the same dock
```

| Situation | Behaviour |
|---|---|
| `enabled` false, or omitted outside a development build | Every `AbTest` renders `initial`. Storage and URL are never read. No dock. |
| `enabled` true | Chosen variant renders; choice kept in `localStorage ab.<id>`; `?ab.<id>=<variant>` wins for that page load without being stored; other tabs sync. |
| No `AbExperiments` in development | Stored choice applies, nobody can change it; warned once. Outside development: `initial`, silent. |
| Same id, identical declaration, in two places | One dock row, one choice (e.g. a repeated widget). |
| Same id, different declaration (or same id as a host `useAbTest`) | `console.error` naming the id; the second is not in the dock. |
| Bad declaration (unknown `initial`, no variants, variant without `label`/`hint`/`view`) | `console.error` plus an `alert` box, never a guessed variant. |
| `AbTest` inside a variant | Allowed, with its own id; its row exists while its variant is shown. |
| `AbExperiments` inside `AbExperiments` | `console.error`; only the outer dock exists. |

- Host tests declared deeper than the `AbExperiments` mount: call `useRegisterAbTests([test, ...])` where `useAbTest` is called. A new array each render is fine; rows are removed on unmount or when a test leaves the array. Same duplicate-id rule as above; without `AbExperiments` it warns once in development.
- Folding the dock (`AbDock` and `AbExperiments`): the chevron on its top edge, or Escape while the focus is inside it, folds it into an `A/B (N)` pill (N counts every test, hidden rows included); the pill unfolds it. Choices stay applied while folded. State in `localStorage ab.collapsed` (`open` / `collapsed`), synced across tabs; an unknown stored value warns `[ab]` and stays open. Escape elsewhere on the page does nothing.
- The build-time check (`compileDslDocument`, `findUnknownKeys`) walks `variants.*.view` and rejects unknown keys at both levels (`mapSlots` metadata, from `@mapSlot view` on the prop). It does not check that `initial` is a variant; the renderer does.
- Non-initial variants ship in the view: nothing confidential in them. `enabled` hides the tool, it does not shrink the bundle.
- Needs `@wadeck-app/dsl-renderer` and `dsl-ui` generated registries from the same release: an older generator lacks `mapSlots`, so the nested views go unchecked without a message.
- A module that uses `AbTest` in its views must declare a `dslLib.shared` range on `@wadeck-app/dsl-ui` that excludes shells without it (see app-core `module-authoring.md`).

## Chart

```yaml
$type: Chart
data: $sources.series
xAxisKey: ts
xAxisType: time          # real timestamps; `category` shows the value as is
xFormat: time            # date (default) | time (HH:MM) | datetime; viewer's LOCAL time zone; warns on `category`
yFormat: number          # bytes (DEFAULT) | number
yUnit: "%"               # optional suffix on every Y tick and tooltip value
variant: sparkline       # default | sparkline
showLegend: false        # default true; false for sparkline
height: 80
series:
  - { key: events, name: Events, type: bar, yAxisId: left }   # no `color` -> theme palette
```

- `yFormat` defaults to `bytes` (1753 -> "1.7 KB") because byte charts exist (wdrive disk usage). A count must set `yFormat: number` (1753 -> "1.8K", locale-aware). Bytes ticks use the same formatter as the `bytes` table column: values under 1 KB now read "512 B" (they were bare "512"), `TB` exists, negatives scale ("-2.0 KB"), and 1048575 reads "1.0 MB" instead of "1024.0 KB".
- `sparkline` = no grid, no axes, no legend, tooltip kept, tight padding; the series still bind to their axes, which are only hidden.
- A series without `color` takes the next entry of a theme palette (`--color-primary-solid`, then success, warning, danger, purple, cyan, orange), so it follows light and dark. An explicit `color` is used as is.

## DataTable columns

```yaml
$type: DataTable
columns:
  - { field: event, label: Event, mono: true, truncate: true }          # ellipsis + full text as tooltip
  - { field: state, label: State, nowrap: true,
      badge: { completed: success, failed: danger, pending: warning } } # cell value -> Badge variant
  - { field: at, label: At, format: datetime }                          # datetime | date | time | bytes | ms | httpMethod | httpStatus
  - { field: tries, label: Tries, width: 12, sortable: true }           # width in Tailwind units (12 = 3rem)
  - { type: actions, items: [{ label: Clear, action: clearEntry, variant: danger-outline, condition: "!locked" }] }
  - { type: link, to: "/modules/flow/executions/{executionId}", icon: external-link,
      label: Open details, position: start }                              # icon-only link, rows stay non-clickable
  - { field: event, label: Event, href: "/modules/queue/history?event={event}" }  # the cell value is a link
```

- Column keys: `field` (alias `key`), `label`, `width`, `truncate`, `nowrap`, `mono`, `muted`, `sortable`, `format`, `badge`, `href`, `external`. Actions column: `type`, `items`, `width`; item keys: `label`, `action`, `variant`, `condition`. Link column: `type`, `to`, `label`, `icon`, `position`, `external`, `width`.
- Any other column key is an error: `compileDslDocument` / `findUnknownKeys` report it with the column path, and `DataTable` logs it once with `console.error`. Earlier versions dropped everything but `field`/`label` silently, so `width`, `truncate`, `mono`, `muted`, `format` and `sortable` start taking effect on pages that already declared them.
- An actions column is `type: actions`. `$type: actions` (older wdrive pages) was never recognised: the column rendered as an empty data column; it is now reported.
- Default wrapping is unchanged: a plain column breaks anywhere (`break-all`). In a narrow container use `nowrap` (never wraps, the column widens), `truncate`, or `width`.
- `badge`: values missing from the map stay plain text; a variant other than `default | primary | success | warning | danger | info` logs an error and shows the neutral variant.
- `format` renders in the viewer's locale and local time zone.

## Links: `StatTile`, `Badge`, `DataTable`

```yaml
- { $type: StatTile, label: Failed (24h), value: $sources.stats.failed, href: "/modules/queue/history?status=failed" }
- { $type: Badge, label: Relay connected, variant: success, href: /modules/queue/webhooks }
```

- `href` makes the whole tile or badge a real `<a>`: router navigation without a page load, middle-click, new tab and copy link work. The `aria-label` is `label: value` (tile) or the badge label. Without `href` nothing changes.
- An internal target must be an absolute app path with a single leading `/`. `external: true` opens an `http:`, `https:` or `mailto:` URL in a new tab with `rel="noopener noreferrer"`.
- A target that breaks these rules (`javascript:`, `data:`, `//host`, a relative path) is ignored: the non-link form renders and an error is logged once naming the component.
- Table templates (`to`, column `href`, and `navigateTo`) fill `{field}` from the row's own fields, percent-encoded (an id `a/b?c` stays one segment). A row whose placeholder is missing or empty gets no link (plain value, or no icon) and an error is logged once with the row's keys; there is never an empty path segment. A `navigateTo` row click with a missing field does nothing and logs the same error, instead of opening a half-filled path.
- A template that is just one placeholder (`navigateTo: '{href}'`, `to: '{href}'`, `{url}`) takes the whole target from the row, unencoded; internal targets must still be an absolute app path (not `//host`), and `external: true` targets are scheme-checked (http, https, mailto). Earlier versions spliced `navigateTo` values unencoded: pre-encode nothing, or the value is encoded twice.
- Link column `icon` names: `arrow-right`, `chevron-right`, `external-link` (default), `eye`, `file-text`, `info`, `link`, `list`, `search`. An unknown name logs an error listing them and shows `external-link`. `label` is required (accessible name and tooltip; "Open" is used with a warning when missing).
- `position: start` places the link right after the expansion chevron; link clicks do not trigger row clicks.
- Registries generated before this version do not know the new keys: regenerate `entries.tsx` and restart the dev server fully.

## `Markdown`

```yaml
- { $type: Markdown, text: $ctx.row.log, maxHeight: 20rem }   # as a DataTable `expansion`: the clicked row is `$ctx.row`
- { $type: Markdown, text: $sources.notes.body, collapsed: true }
```

- Props: `text`, `maxHeight` (CSS value, scrolls inside a keyboard-focusable region), `collapsed` (starts folded to a short preview with a "Show more" toggle, `aria-expanded`), `allowImages`.
- Safe by construction, for untrusted text such as logs or model output: raw HTML is shown as text, never parsed; links open in a new tab with `rel="noopener noreferrer"` and only for `http:`, `https:`, `mailto:` (anything else, including relative paths and `javascript:`/`data:`, keeps the text without an anchor).
- Images are not loaded by default (the request would leak that the page was opened, and any data in the URL): the alt text shows as `[image: alt]`. `allowImages: true` opts in (`loading="lazy"`, no referrer); `javascript:`/`data:` sources never load.
- GFM tables and task lists work (checkboxes are read-only). Fenced code is a monospace block with a "Copy code" button that copies the code exactly; without the clipboard API, or when it rejects, the button shows "Copy failed" and the reason is logged.
- A missing `text` (data not loaded yet) renders nothing; a non-string `text` logs an error and renders nothing.
- `@registryLazy`: generated entries load it in its own chunk, because `react-markdown` + `remark-gfm` weigh about 154 kB minified (48 kB gzip). A static `import { Markdown } from '@wadeck-app/dsl-ui'` bypasses that: the package has no `sideEffects` flag, so use the registry for the lazy chunk.
- Registries generated before this version do not know the node: regenerate `entries.tsx` and restart the dev server fully.

## Loading, refreshing and failed loads

A component must not say "empty" before its data has arrived. No YAML is needed:

| Page state | ctx | `DataTable` / `StatTile` / `Pagination` |
|---|---|---|
| First load pending | `$initialLoading: true` | `DataTable`: skeleton rows with the table's own columns (header stays, one `role="status"` "Loading...", `aria-busy`). `StatTile`: skeleton. `Pagination`: renders nothing (no "Page NaN"). |
| Refetch (filter, page, poll, `RefreshButton`, action reload) | `$refreshing: true` | Rows stay. `DataTable` sets `aria-busy` and dims the rows slightly after 300 ms (a fast poll never flashes). |
| Loaded, nothing returned | both `false` | `emptyMessage`. |
| Load failed | `$initialLoading` goes `false` | The failure is reported through the notifier (`Could not load the data: <message>`, with `status`); a poll that keeps failing with the same message is reported once. The table then shows its `emptyMessage`: read the notification, not the table. |

- Defaults come from `@ctxDefault`: `DataTable.loading` and `StatTile.loading` read `$initialLoading`, `DataTable.refreshing` reads `$refreshing`. An explicit `loading:` / `refreshing:` in the YAML wins. `@ctxDefault <key>` names a differently-spelled ctx entry.
- `ctx.loading` (true on any non-polled load, including `reloadSources` actions) is unchanged; bind it only if you want a skeleton on action reloads.
- `Skeleton` takes `decorative` (no status role, for a parent that announces once) and honours `prefers-reduced-motion`.

`RefreshButton` re-runs the page's sources with the same loader as the poll timer; it does not touch the poll interval.

```yaml
- $type: HorizontalStack
  items:
    - $type: SearchBar
      urlParam: event
    - $type: RefreshButton
      source: history        # a $sources key; omit it to refresh every source of the page
      label: Refresh         # accessible name and text, default "Refresh"
```

- Disabled and spinning while it runs; the rows stay. A failed refresh (and an unknown `source`, which lists the page's sources) goes through the notifier, every time.
- Outside a `GenericPageRunner` it logs an error and stays disabled. The legacy `onClick` / `loading` props still work (wdrive's `$outputs: onClick`).
- Needs dsl-ui and dsl-renderer from the same release; with an older generated registry the button has nothing to call (the error above).

## Behaviour changes by version

First published version containing the change (`dsl-ui` and `dsl-renderer` share the version number). Regenerate `entries.tsx` and restart the dev server fully after upgrading.

| Version | Change a consumer can notice |
|---|---|
| `2026.10.19-113` | Row actions interpolate `{key}` from the row into the URL (percent-encoded); a missing value fails before any request. |
| `2026.10.19-114` | Every action reports through the Notifier; inline banner without a provider. |
| `2026.10.19-122` | `DataTable` columns honour `width`, `truncate`, `nowrap`, `mono`, `muted`, `sortable`, `format`, `badge`; unknown column keys are reported. |
| `2026.10.22-127` | `DataTable` / `StatTile` show skeleton rows while the first load runs (`$initialLoading`), never the empty message. |
| `2026.10.22-128` | `GenericPageRunner` remounts when the page document changes, not only on route params. |
| `2026.10.23-131` | `$actions.<name>.strictParams: true` opts a form action into encoding and the missing-placeholder error. |
| `2026.10.23-135` | `DataTable` action buttons are disabled and busy while their action runs. |
| `2026.10.23-136` | That busy state is per row (`$ctx.$actionPendingRows`). |
| `2026.10.24-137` | Bound form fields no longer remount on re-render (module-level `WithContext` wrappers in `entries.tsx`). |
| `2026.10.24-153` | `href` / `external` on `StatTile` and `Badge`; `DataTable` `type: link` column and column `href`. |
| `2026.10.24-158` | `Tabs` and `PageTabs` expose `tablist` / `tab` / `tabpanel` with arrow, Home and End keys: the tab buttons' role is `tab`, no longer `button` (update `getByRole('button', ...)` selectors). A closed `Drawer` is `inert`; `Drawer` / `Dialog` Escape calls the latest `onClose`. |
| `2026.10.24-161` | `Markdown` node (lazy, no raw HTML, images off by default). |
| `2026.10.24-165` | `DeleteButton` always renders `danger` / `sm`: a node's `variant` / `size` no longer win. A disabled `FieldMultiSelect` ignores keyboard and pill edits. |
| `2026.10.24-168` | `FieldAsyncSelect` shows "Could not load options" and logs the cause on a failed load. |

## Pitfalls

- `@registryCategory` missing -> component silently excluded from registry.
- `__baseUrl` not stripped when merging `defineRoutes` results -> TypeScript errors on the merged object.
- YAML files require `?raw` Vite suffix — no plugin needed, just the suffix.
- `dsl.config.yaml` must be adjacent to `vite.config.ts` — `entriesGenerator` auto-discovers it there.
- A URL in `$sources` that doesn't match the contract generates `@ts-expect-error` in `page-types.ts`, failing the TypeScript build.
- `src/generated/` is committed so editors have types without running the dev server; do not gitignore it.
- `compileDslPagesDir`/`compileDslDocument` only catch static DSL errors (`$type`, `$`-directives, `nodeSchema`) — a page can still fail at runtime on `ctxSchema` or a bad `$context.expose`, since those depend on `$sources` data not available at compile time.
- After upgrading `@wadeck-app/dsl-renderer`, restart the dev server process fully. Reported by app-core (not reproduced here): a long-running Vite process keeps the old `entriesGenerator` in memory, and a config-triggered restart rewrites `entries.tsx` in the old format (no `knownKeys`, `allowedChildren` keyed by `children`). Symptom: `unchecked-keys` warnings on built-ins. `entriesGenerator` cannot detect this itself: the stale code is the code that runs.
- Bound form fields (`@registryBind formData onChange`: `FieldText`, `FieldTextarea`, `CheckboxGroup`, `ColorPicker`, ...) remount on every re-render (focus lost, typed text and refs gone) with an `entries.tsx` generated before the fix: the `<Name>WithContext` wrapper was declared inside `render`. Regenerate `entries.tsx` with the fixed `entriesGenerator` and restart the dev server fully; the wrappers are then module-level functions in the generated file.
- A compiled artifact's `registryFingerprint` mismatch only warns, it never blocks rendering — don't rely on it as a build gate; use `compileDslPagesDir`'s `hasErrors` in CI for that.
- Forgetting to wrap the app in `RouterProvider` (`@wadeck-app/dsl-ui`) throws `requires UrlParamContext` and renders blank, the moment any node uses `urlParam: foo` (`Pagination`, `PageSizeSelect`) — not optional once you use one of those.
- A `urlParam: foo` prop only does anything if the component itself calls `useUrlParam`/`useOptionalUrlParam` — passing it to a component that doesn't (most components, before this was introduced) silently resolves to a plain string prop with no wiring. Any page YAML written before this pattern existed (e.g. passing `urlParam:`/`default:` to a component whose props never included them) is stale and should not be copied as a working reference.
