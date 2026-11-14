# showcase

An app-module (`app-module-showcase`, id `showcase`) that shows every dsl-ui registry component with live controls. Plan: `.claude/plans/2026-11-14_showcase-app-module.md`.

| Path | Content |
|---|---|
| `app-module-showcase/` | The module. `src/dsl-views/components-*.yaml` are generated; `home.yaml` is hand-written. |
| `scripts/generate-views.mjs` | Writes the generated views from `.claude/docs/inventory.md` and dsl-ui's shipped node schemas. |
| `scripts/samples.json` | Per-component overrides: `defaults`, `controls` (optional free props to expose), `props` (literal props for required non-scalar props), `skip`. |

Outside the module folder on purpose: `app-core-cli check` rejects any extra folder at the module root.

## Commands

```sh
# dsl-ui must be built first (the generator reads packages/dsl-ui/dist)
node showcase/scripts/generate-views.mjs
node --test showcase/scripts/generate-views.test.mjs   # fails when a generated view is stale
app-core-cli check showcase/app-module-showcase
app-core-cli dev showcase/app-module-showcase --watch --port 4871   # 4850 is the real app-core
```

## Frames

Each component gets a `Card` whose header tags are its registry name, category and folder. Controls are derived from the node schema: enum to `FieldSelect`, boolean to `Switch`, string to `FieldText`, number to `FieldNumber`, all bound to page `$vars`. Enums and booleans start at their first value, which is not always the component's own default. An optional free string or number is left unset unless listed under `controls`.

A component with a required prop that is not a scalar (a list, a node) is "described only" until `samples.json` gives it a literal `props` entry. The generator prints the counts.

## Not wired yet

- CI: the staleness test and `app-core-cli check` run by hand only.
- Business demo, interaction pages and states pages from the plan.
