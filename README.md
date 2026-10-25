# dsl-view

Generic YAML-driven UI for React apps. Published packages:

| Package | Purpose |
|---|---|
| `@wadeck-app/dsl-renderer` | Runtime renderer, page runner, Vite build plugins, compiler |
| `@wadeck-app/dsl-ui` | Generic React components (DataTable, Form, Chart, AppShell, ...) |

Consumer reference (every option, behaviour, version history): `.claude/docs/dsl-renderer-consumer-reference.md`.

## Working on components as a consumer

You may build and fork components in your own project (its own dsl-lib / components folder) and keep them there as long as you need. Only mature, generic ones move into dsl-view.

dsl-view stays agnostic of application logic: it adopts a component only if it contains **no business or domain logic**. Rejection is normal; the component then simply stays in your project.

### 1. Mark a candidate

Tag the component so a grep lists every candidate:

```tsx
/**
 * @dsl-view-candidate status: incubating
 * @registryCategory ...
 */
export function MyComponent() {}
```

- `status: incubating` while it evolves; `status: ready-to-propose` once it meets the criteria below.
- Local registry entries keep their own names. Do not reuse a name dsl-ui exports.
- Find them all: `grep -r "@dsl-view-candidate" src`.

### 2. Maturity criteria (all required before proposing)

- No business or domain logic: no product vocabulary in the name, props, copy, endpoints or data shapes. A convenient or already-used component still fails this test.
- Generic props only; used by more than one project, or an obviously generic pattern.
- Theme tokens only, no Tailwind `dark:` variants (`.claude/docs/theming.md`).
- Accessible semantics and keyboard behaviour.
- Odd input degrades with one dev warning instead of crashing (dsl-view's registry sweep requires it).
- Tests per `.claude/docs/test-writing-lessons.md`, a story, and docs.

App-specific variants stay yours: register your own column formats with `registerColumnFormat` and filter rules with `registerFilterPredicate` instead of adding domain formats to dsl-ui (see "Behaviour changes by version" in the reference).

### 3. Propose

Message the dsl-view owner session, or open a PR, with the component, tests, story and the consumer evidence (who uses it, why it is generic). dsl-view reviews it against `.claude/guiding-principles.md` ("Scope of dsl-ui") and may refuse it or ask you to keep it local.

### 4. After adoption

dsl-view announces the published version. Delete your local copy and import from `@wadeck-app/dsl-ui`; regenerate `entries.tsx` and fully restart the dev server.
