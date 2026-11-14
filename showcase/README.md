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

## Hand-written pages

| Page | Shows |
|---|---|
| Overview | Entry points |
| Assets | `DataTable`, row actions, `DialogForm` create/edit, delete confirmation |
| Asset (route `/assets/:id`) | `Form` with optimistic locking (`version`, HTTP 409, "Simulate another user saving"), manifest tabs (Details, History) |
| Loan request | `Stepper` wizard on page variables |
| Settings | `Tabs`, `Collapsible`, `Switch`, `ThemePicker` |
| States | Error toasts (short, long path, 100-character word), source failure, loading, empty list |
| Dashboard widget | `StatTile` sized by the manifest (`width`, `height`) |

## Not done yet

- Reservations page (`FieldAsyncSelect`, `DateRangePicker`), server-side list filters (blocked by the optional-placeholder finding in the plan), interaction pages ($brains, filters in the URL, `AbTest`, theming).
- CI: the staleness test and `app-core-cli check` run by hand only.
