# Showcase app-module for dsl-view

Status: proposal, nothing built. Audience: human reviewers and the dsl-view agent.

## Goal

One app-module that shows every dsl-ui component, the page structures and the interactions dsl-view supports, running in a real app-core with the real renderer. Replaces "read inventory.md and guess" with "open the page and see it".

## Decisions

| Point | Choice | Why | Reverse by |
|---|---|---|---|
| Location | `showcase/app-module-showcase` in this repo, outside the npm workspaces | A workspace would change `package-lock.json` and the `npm ci` of the publish CI; it must change in the same commit as a component (same rule as `inventory.md`); contains no business logic, so it passes `guiding-principles.md` scope | Move the folder to its own repo |
| Module id | `showcase` | Prefix for routes and any `showcase:` components | Rename id before first registration |
| Views | YAML only, no `dsl-components` | A showcase that needs custom React proves nothing about the DSL | none |
| Data | Backend with in-memory fake data, reset on restart | `$sources`, `$actions`, polling, ETag/304 and errors need real routes | Replace with fixtures |
| Dependency range | `dslLib.shared` on `@wadeck-app/dsl-ui` set to the version that introduced the newest shown component | app-core refuses a module whose shell is older (`module-authoring.md`) | Widen range |
| Run | `app-core-cli dev ./showcase/app-module-showcase --watch --port 4871` (4850 is the real app-core) | Documented path, real shell | none |

## Page map

Side menu groups (`groupLabel`), one page each unless noted.

| Group | Pages | Shows |
|---|---|---|
| Start | Overview | `PageHeader`, `StatTile` grid linking to every page, count of components covered |
| Components | controls, display, form, layout, navigation, overlay, table (7 pages) | Every registry component of the matching `inventory.md` category, each in a `Card` with title, live render, props table, and its YAML |
| Page structures | Dashboard, List + detail, Form page, Wizard, Tabbed page, Settings | See below |
| Interactions | Data loading, Actions and feedback, Variables and brains, Dialogs, Filters and URL, Theming, Experiments | See below |
| States | Loading, empty, source error, toast stress | Skeleton/Spinner/FetchSpinner, empty table, `$sourceErrors`, long-word error toast |

### Page structures

| Page | Components and module features |
|---|---|
| Dashboard | Widgets with `width`/`height`, `StatTile`, `Chart`, `TimeSeriesChart`, `SparklineView`, navbar and overlay widgets |
| List + detail | `DataTable` (sort, search, pagination, row actions, bulk actions, expansion) to route `/items/:id` with `Breadcrumb`, `BackLink`, pages below pages |
| Form page | `Form`, all `Field*`, `UnsavedBadge`, `ButtonSave`/`ButtonCancel`, validation errors from the backend |
| Wizard | `Stepper` with a form per step |
| Tabbed page | `PageTabs` through the manifest `tab` group, `count` indicators on tabs and menu entries |
| Settings | `Section`, `Switch`, `CompactSelect`, `ThemePicker`, `Collapsible` |

### Interactions

| Page | Mechanism |
|---|---|
| Data loading | `$sources` with params from `$urlParam`/`$route`, polling, ETag/304 route, `RefreshButton`, `LiveToggle` |
| Actions and feedback | `$actions` success and error notifications, `notify: false`, `ActionButton`, `DeleteButton`, a route that fails on demand (503 with a long message) |
| Variables and brains | `$vars`, `$outputs`, `$brains` chain between two components |
| Dialogs | `Dialog`, `DialogForm`, `ConfirmDialog`, `Drawer`, `Popover`, `ContextMenu`, `Tooltip` |
| Filters and URL | `FilterBar`, `FilterChips`, `SearchBar`, `Pagination` writing the URL, persisted filter |
| Theming | `ThemeScope` nested light/dark, accent colour (`AccentScope`) |
| Experiments | `AbTest` with two variants |
| Slots | `ExtensionSlot`: needs a second tiny module to contribute; phase 4, optional |

## Naming and playground (every example, every page)

Each example is one `Card` with the same frame, so a screenshot or a bug report identifies what it shows:

| Part | Content |
|---|---|
| Title | Registry name in monospace (`DataTable`), category and tags from `inventory.md` (`display`, `tag field`) |
| Render | The live component, as the DSL renders it |
| Controls | One control per prop worth playing with, bound to page `$vars`; the render reads them as `$vars.<prop>` |
| Current node | The node as authored with the current control values, read-only, copyable |
| Props | Name, type, default, one line each |

Business-demo pages use the same frame around each region, titled with the component names it uses, so the page structure stays legible.

Controls by prop type (existing dsl-ui components only):

| Prop type | Control |
|---|---|
| boolean | `Switch` |
| enum / variant / size | `CompactSelect` or `RadioGroup` |
| string | `FieldText` |
| number | `FieldNumber` or `Slider` |
| list of strings | `FieldTags` |
| date | `FieldDate` |
| node slot (children, icon) | a `CompactSelect` choosing among a few predefined nodes |

A "Reset" button restores the defaults.

### One source for views, controls and source panel

Writing about a hundred frames by hand drifts from the components. Proposal: a description file per category (`$type`, props with type, default, allowed values, sample content) and a script that emits the YAML views. The script lives outside `src/` (the layout rule allows only `.yaml/.yml/.json` in `dsl-views`); its output is committed so `app-core-cli check` sees plain views. A test regenerates and compares, so a stale view fails CI. The same description feeds the "Current node" panel and settles the "show the YAML" question below.

Whether the props could be read from the generated registry (`propSchema`, `knownKeys`) instead of being described by hand is not verified; it would remove the duplicated prop list.

Not in scope here: a renderer-wide overlay that labels every node of any page with its `$type`. That is a dsl-view feature (a dev mode in `DslRenderer`), a separate decision; the showcase labels its own frames only.

Playground depth, by priority: components with several visual props first (`Badge`, `Tag`, `Button*`, `Progress`, `StatTile`, `Chart`, `DataTable`, `Dialog`, `Stepper`, `Tooltip`, `AppShell`-adjacent layout), simple ones get a render and a props table without controls. The coverage test counts both.

## Business demo: equipment loans

A fictional, neutral domain inside the module only (nothing business-shaped goes into dsl-ui). Two entities in the in-memory backend: `assets` (name, category, status, quantity, tags, purchase date, `version`) and `reservations` (asset, borrower, date range, status). Goal: show whole workflows, not isolated widgets.

| Page | Shows | Components and mechanisms |
|---|---|---|
| Assets | Searchable, sortable, paged table with status tags, row actions, bulk actions, expandable history row | `DataTable`, `FilterBar`, `FilterChips`, `Tag`, `TableRowActions`, `BulkActionsToolbar`, `$actions` |
| Create asset | Popup creation, validation errors returned by the backend shown on the fields | `DialogForm`, `FieldText`, `FieldNumber`, `FieldSelect`, `FieldTags`, `FieldDate` |
| Edit asset | Full-page edit, unsaved-changes badge, cancel, save | `Form`, `UnsavedBadge`, `ButtonSave`, `ButtonCancel`, `Breadcrumb` |
| Concurrent edit | Optimistic locking: the form carries `version`, the backend answers 409 when it moved, the page shows the failure and offers a reload | see below |
| Delete | Confirmation, then refresh, with an undo-free explanation | `ConfirmDialog`, `DeleteButton` |
| Reservations | Master-detail: pick an asset (async select), choose a date range, list existing reservations | `FieldAsyncSelect`, `DateRangePicker`, `DataTable` |
| Approval | Multi-step request with a review step | `Stepper`, `Form` per step |
| Activity | Audit trail of changes and a trend of loans over time | `DataTable` expansion, `TimeSeriesChart`, `RelativeDate` |

### Optimistic locking

Not a dsl-view feature: I found no support for it in the renderer or the docs (grep of `pageRunner` and the consumer reference). The showcase demonstrates it as a convention built from existing pieces, and any gap it exposes is reported to the owner of that piece, not hidden.

1. Every asset carries an integer `version`; the backend increments it on each write.
2. The edit form keeps `version` in its data and sends it back with the save.
3. The backend rejects a save whose `version` is stale with 409 and a message naming the current version.
4. A "simulate another user" button calls a route that bumps the version, so the conflict is reproducible in one click.
5. The failure reaches the user through the action notification. A reload button re-fetches the source.

Checked in the browser (2026-11-15), `asset-edit.yaml` against the in-memory backend:
- `Form` submits every key of its `initialData`, displayed or not: `version` reached the backend with no hidden field.
- A 409 is shown as an error toast, `Action "saveAsset" failed (HTTP 409): <backend message>`; the user's edits stay and "Unsaved changes" remains.
- After any successful action, every source of the page reloads (not only the listed `reloadSources`; an empty `reloadSources: []` stops it). A changed `initialData` then replaces the user's unsaved edits in the `Form`, silently: typing "keep-me" then running another action put the old value back. So a background refresh can erase an edit before the conflict is ever detected. The demo's "Simulate another user" button sets `reloadSources: []` to reproduce what a second browser tab does.

## Keeping it complete

- A test fails when a registry component named in `inventory.md` is not used in a showcase view (same idea as the `dsl-ui/component-in-inventory` rule). Adding a component then forces a showcase example.
- `app-core-cli check ./showcase/app-module-showcase` runs in CI.
- Tests follow `.claude/docs/test-writing-lessons.md`.

## Phases

| # | Content | Done when |
|---|---|---|
| 0 | Spike: module skeleton, one page, backend route, show-the-YAML mechanism, check that this repo's tooling accepts an `app-module-*` package | `dev` serves a page with a live render and its source |
| 1 | Generator and description files, shared frame, Overview, 7 component pages, coverage test | Every inventory component rendered in a named frame; the priority components have working controls |
| 2 | Backend fake data; List + detail, Form page, Dashboard | CRUD works end to end |
| 3 | Business demo: Assets, Create, Edit, Delete, Concurrent edit | Full create/edit/delete cycle, a 409 reproducible in one click |
| 4 | Interactions and States pages | Each mechanism triggerable from its page |
| 5 | Reservations, Approval, Activity, Wizard, Tabbed page, Settings, slots (optional) | Page map complete |

## Unverified, to settle in phase 0

- Whether the monorepo can host an `app-module-*` package: the `app-module/*` violation rules and `app-core-cli` dependency are not checked.
- Whether a prop can read `$vars.<x>` for every kind of prop (enum, number, list, slot): the generic path resolves expressions, but slots and bound props are not tested. A control that does not reach the component is a finding, not a workaround.
- Whether `$vars` set by a field outside a `Form` re-renders the example live (`$setVar` exists in the page context; the bound-field path is not tested).
- How to render the "Current node" text from `$vars`: generated at build time per control state is impossible, so it must be an expression (`$concat`) or a `JsonViewer` on the vars. Not verified that either gives readable output; fallback: show the authored YAML with the `$vars.` references, plus the vars as JSON.
- Whether the local app-core version in the workspace runs a module that imports no custom components (expected, not tested).
- CI cost: whether `check` and the coverage test fit the existing workflow.

## Out of scope

- Visual regression baselines (dsl-view has none).
- Custom React components in the showcase.
- Real business rules: the equipment-loan domain is a fiction that lives in this module only; its names, routes and data shapes never move into dsl-ui or dsl-renderer.
- Building optimistic locking into dsl-view: the showcase only demonstrates it; a built-in mechanism would be a separate decision.

## Phase 0 results (2026-11-15)

Spike in `showcase/app-module-showcase`: one page, one backend route, one playground frame (`Badge`). `app-core-cli check` passes; `dev --port 4871` serves it; read in a browser.

| Question | Result |
|---|---|
| Controls outside a `Form` drive node props live | Yes: `FieldText` and `FieldSelect` with `bind:` edit `$vars`, and `Badge` reads `label: $vars.label`, `variant: $vars.variant` |
| `$sources` and `$concat` on a module route | Yes |
| Module with no custom component runs in the local app-core | Yes |
| Enum option lists | Must come from the component's real type: `error` is not a `Badge` variant (`danger` is) and the badge silently fell back to the default look. Whether a warning reaches the console is not checked. |
| `Card` `header` | A single `Markdown` node rendered an empty header; a list with one `Tag` rendered. Cause not investigated (Markdown, or a single node instead of a list). Use the list form. |
| Not yet checked | `Form` submitting a hidden `version`; `Form` reset on reload; `$concat` for the "Current node" text; the generator; this repo's tooling on the module; CI cost |

## Findings on dsl-view while building (2026-11-15)

| Finding | Evidence | Status |
|---|---|---|
| A `$sources` url with an optional `{placeholder}` is skipped when the value is empty, so a list cannot take an optional `search` or `status` query param | `useSourceLoader` warning "path placeholder(s) resolved to empty"; the task module works around it with a backend-computed query string | Not changed; the showcase list has no server-side filter |
| After an action, all page sources reload, and a `Form` silently replaces unsaved edits when the reloaded data differs | Browser test above | Not changed; to report to the owner of `Form` / the page runner |
| `Card` header with a single `Markdown` renders empty | Phase 0 | Not investigated |
| An invalid enum value on `Badge` falls back to the default look | Phase 0 | Console warning not checked |
| A `FieldDate` bound value is an ISO datetime at local midnight (`2026-11-30T23:00:00.000Z` for 1 Dec in UTC+1), not a date | Reservations page, seen in the backend payload | Not changed; the demo stores what it gets and formats columns with `format: date` |
| A `$brains.$http.get` whose `{id}` comes from a page variable runs once at mount with the variable empty: the URL placeholder becomes an empty string (console warning) and the call goes to the collection URL | Interactions page, console in the real app-core | Not changed; no way found to hold the brain until the variable is set |
