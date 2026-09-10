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

```tsx
import pageYaml from './dsl/pages/items.yaml?raw';  // ?raw required
import { GenericPageRunner } from '@wadeck-app/dsl-renderer';
import { appRegistry } from './registry.js';

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
/>
```

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
| `@registryBind formData onChange` | Wrapped with FormContext accessor |
| Everything else | `resolveExpressionValue(node['propName'], ctx)` |

Skipped props: `className`, `style`, `ref`, `key`, `aria-*`, `data-*`.

Components without `@registryCategory` are silently skipped — no warning.

---

## Generated files

Both files are auto-generated at `vite dev` / `vite build` start and committed to the repo.

| File | Generator | Do not edit |
|------|-----------|-------------|
| `src/generated/entries.tsx` | `entriesGenerator` | ✓ |
| `src/generated/page-types.ts` | `pageTypesGenerator` | ✓ |

---

## Pitfalls

- `@registryCategory` missing -> component silently excluded from registry.
- `__baseUrl` not stripped when merging `defineRoutes` results -> TypeScript errors on the merged object.
- YAML files require `?raw` Vite suffix — no plugin needed, just the suffix.
- `dsl.config.yaml` must be adjacent to `vite.config.ts` — `entriesGenerator` auto-discovers it there.
- A URL in `$sources` that doesn't match the contract generates `@ts-expect-error` in `page-types.ts`, failing the TypeScript build.
- `src/generated/` is committed so editors have types without running the dev server; do not gitignore it.
