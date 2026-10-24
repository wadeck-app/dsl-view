# Extract business components from dsl-ui

Rule: `dsl-ui` only ships generic UI components (see "Scope of dsl-ui" in `.claude/guiding-principles.md`). Inventory run 2026-10-24 over `packages/dsl-ui/src`; consumers searched in capability-framework, app-core, queue, task, orchestrator, agent-fleet (YAML `$type`, TSX imports, non-generated files only).

## Verdicts

| Component | Verdict | Evidence | Consumers |
|---|---|---|---|
| `InviteTokenWidget` | BUSINESS, extract | Invite tokens are a wdrive admin concept; props `inviteToken`, `onGenerateToken`; tags `token admin` | `capability-framework/packages/dsl-wdrive-app/src/dsl/pages/admin.yaml:49` only |
| `ShownFetchedCounter` (+ `utils/computeShownTotal`) | BORDERLINE, extract | Fixed copy "N shown / M fetched", defaults to a log API shape (`entries`, `total`) | `dsl-wdrive-app/.../logs.yaml:97,154` only |
| `StatusFilter` | BORDERLINE, extract | Default options are HTTP status families (`2xx`..`5xx`); generic part is covered by `FilterChips` `mode: single` | `dsl-wdrive-app/.../artifacts.yaml:139` only |
| `HttpMethodBadge`, `HttpStatusBadge`, DataTable `format: httpMethod` / `httpStatus`, `ColumnHelpers.httpMethod` / `httpStatus` | BORDERLINE, extract | HTTP-log vocabulary hard-wired in `DataTable.tsx` (the file header already says app-specific formats belong to the app) | `dsl-wdrive-app/.../logs.yaml:110,117`, `logs-advanced.yaml:31,38` only |
| `useVersionPoller` | BORDERLINE, extract | Backend contract baked in: `GET /api/version` returning `{ version }`, global `window.__APP_VERSION__`, fixed toast copy; not exported by the barrel, reached via `@dsl-ui/hooks/...` | `dsl-wdrive-app/src/main.tsx:5,13`, `dsl-agent-fleet-app/src/main.tsx:5,13` |
| `LiveToggle` | GENERIC, single consumer | Domain-neutral live/paused toggle; keep, re-evaluate if still one consumer | `dsl-wdrive-app/.../logs.yaml:67,147` |
| `FetchSpinner` | GENERIC, redundant | Domain-neutral; duplicates `Spinner`; deprecate in favour of `Spinner` | `dsl-wdrive-app/.../logs.yaml:73,153` |
| `CronBuilder` | GENERIC, single consumer | Cron is a generic scheduling control; no product vocabulary | `orchestrator/packages/dsl-lib-orch/src/components/JobForm.tsx:656` |
| `FilterChips`, `ChipButton`, `BackLink`, `ThemePicker`, `ColorPicker`, `UnsavedBadge`, `JsonViewer`, `RelativeDate` | GENERIC | Domain-neutral, several consumers or clearly reusable | orchestrator, dsl-ui-wdrive, app-core, queue, flow, task |
| `InlineEdit` | GENERIC, unused | Domain-neutral; no consumer found; keep | none |
| Everything else (form fields, overlays, layout, navigation, `Chart`, `Markdown`, `AppShell`, `AbDock`...) | GENERIC | No product vocabulary | n/a |

Not in dsl-ui (confirmed): `NavBadge`, `FileDropZone`, `FileNavigator`, `FilePreview` live in `capability-framework/packages/dsl-ui-wdrive`.

Housekeeping found: `PageHeader` exists twice (`components/display/PageHeader.tsx` and `components/layout/PageHeader.tsx`).

## Extraction steps (same for every row marked "extract")

1. Destination: `capability-framework/packages/dsl-ui-wdrive/src/components/` (`admin/` for `InviteTokenWidget`; `logs/` for `ShownFetchedCounter`, `StatusFilter`, the HTTP badges). `useVersionPoller` goes to a small shared module in capability-framework used by both apps' `main.tsx`.
2. Copy source, test and story files, switch imports to the destination's aliases, keep the `@registryCategory` JSDoc so the app's registry picks it up.
3. The consumer adopts its copy and confirms by message.
4. Remove from dsl-ui in one BREAKING commit: component files, barrel exports, `known-keys.json` and node schemas regenerated, a "Behaviour changes by version" row.

| Candidate | Source files in `packages/dsl-ui/src` |
|---|---|
| `InviteTokenWidget` | `components/controls/InviteTokenWidget.tsx`, `.test.tsx` |
| `ShownFetchedCounter` | `components/table/ShownFetchedCounter.tsx`, `.test.tsx`, `utils/computeShownTotal.ts`, `.test.ts` |
| `StatusFilter` | `components/table/StatusFilter.tsx`, `.test.tsx` |
| HTTP badges | `components/display/HttpMethodBadge.tsx`, `HttpStatusBadge.tsx`, plus the `httpMethod` / `httpStatus` branches and `ColumnHelpers` entries in `components/table/DataTable.tsx` (needs an app-registered column format hook in `DataTable` first, otherwise `format: httpStatus` breaks in wdrive) |
| `useVersionPoller` | `hooks/useVersionPoller.ts`, `.test.tsx` |

## Order

1. `InviteTokenWidget` first (smallest, clearest violation).
2. `ShownFetchedCounter`, `StatusFilter`.
3. HTTP badges once `DataTable` supports app-registered formats.
4. `useVersionPoller`.

Nothing is removed while a consumer still uses it.
