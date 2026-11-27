# Scope model: contexts, state, commands and specialized children

Supersedes the bar-by-bar plan in `2026-11-27_dependency-tree-target.md`, which only dealt with the *look* of button bars. Facts below come from the code on 2026-11-27 (file:line checked by an exploration pass, spot-checked for Form and DataTable).

## 1. What exists today

| Scope | State a child can read | Commands | Gap |
|---|---|---|---|
| Form | `formData`, `hasChanges`, `isPending` (`form/Form.tsx:4-9`) | `onChange` | No validity, no messages, no "submittable". Errors exist only as a per-field prop (`FieldWrapper` `error`), never fed to the form. A rejected submit is a `console.error`. |
| Batch selection (DataTable) | `selectedIds` only (`table/DataTable.tsx:77-82`) | toggle, clear | A button never sees the rows. `batchActions` = `{label, action, variant, keepSelection}`: no applicability, no disabled, no reason. The page gets rows only at click. |
| Row actions | nothing (the row is closed over by DataTable) | none | `condition` is one row-field name or `!field`; no per-row disabled, no reason. |
| Dialog, Drawer | the close function | close | No pending, no dirty, no blocked. Nobody under `components/` calls `useDialogClose`. |
| Bars (ActionBar, CardActions, DialogFooter, NavBar, TableRowActions) | size, default variant | none | Look only. |
| Buttons | `disabledReason` on 6 of 10 | n/a | `ButtonLink`, `RefreshButton`, `ButtonCancel`, `ChipButton` cannot say why they are disabled. |
| YAML | `$if` (hide) | n/a | No node-level enablement; `disabled: $expr` is a per-component prop. |

Consequence: a scope cannot tell its children what is going on, so a child cannot adapt, so the page author hand-wires `disabled` everywhere. The generic-`Button` problem is a symptom; the missing state is the cause.

## 2. The model

Every scope that matters provides **three channels**. A child reads what it needs and nothing else.

```
                +-------------------- SCOPE (Form, Selection, Row, Dialog, Drawer, Page, Shell) --------------------+
                |  LOOK      size, density, default variant         how children are drawn                         |
                |  STATE     read-only facts, an open record         what is true now                               |
                |  COMMANDS  functions                               what can be done                              |
                +-----------------------------------------------+------------------------------------------------+
                                                                |
        specialized children (thin, tagged for this scope)      v
        read STATE + COMMANDS, compute one AVAILABILITY:   { enabled | disabled(reason) | hidden }
                                                                |
                         page author overrides the LOGIC with an expression over the scope state
                         (YAML: `$form`, `$selection`, `$row`, `$dialog`, in the ctx of the subtree)
```

- **Availability** is one shared shape resolved in the base `Button`, so every button (link, refresh, cancel, chip included) shows a disabled state with its reason the same way. Priority: hidden, then disabled (first reason wins), then enabled.
- **Defaults come from the scope; the page may override** with `enabledWhen: <expr>` plus `disabledReason: <text>` (hiding stays `$if`). The page owns the business logic, the scope owns the plumbing.
- Scope state reaches YAML by extending the ctx of the scope's subtree (the mechanism `AbTest` already uses), and reaches React by a hook.

## 3. Scopes, state, children

### Form
- State: `status` (pristine | dirty), `pending`, `validity` (valid | invalid | unknown), `messages: [{severity: info | warning | error, field?, text}]`, derived `blocking` (any error), `submittable` (dirty, valid, not pending), `warnings` (count).
- Commands: `submit`, `reset`.
- Sources of messages: fields (`FieldWrapper` `error` registers itself), a form-level `validate` expression, and the server response of a rejected submit (today a `console.error`).
- Children and behaviour:
  - `ButtonSubmit`: disabled while `blocking` (reason = the first error text) or pending; with warnings it stays enabled and shows the count; label `pendingLabel` while pending.
  - `ButtonSave`, `ButtonCancel`, `ButtonReset`: same availability source.
  - `FormMessages`: renders the list by severity (error, warning, info), one place, accessible live region.
  - `UnsavedBadge`: reads `status`.
- Extending later (a new severity, a per-step validity) adds a key; children that do not know it ignore it.

### Batch selection (the bar over a selected set)
- State: `ids`, `rows` (the items), `count`, `total`. Commands: `clear`, `selectAll`.
- `BatchButton` declares which items it applies to: `appliesTo: <expr over $item>` (or a field name) and `mode`:
  - `all`: enabled only when every selected item applies; otherwise disabled with the reason "2 of 5 selected cannot be archived".
  - `some`: enabled when at least one applies, acts on the applicable subset, label shows "Archive (3 of 5)".
- The handler receives `{ applicable, skipped }`, so the page never recomputes it. The page decides the logic by the predicate; the table only plumbs.
- Today's `batchActions` stays as a shorthand over `BatchButton`.

### Row
- State: `row`, `index`, `pending` (this row). `RowActionButton`: `enabledWhen`/`disabledReason` over `$row`; `condition` stays as an alias for the field-name form.

### Dialog and Drawer
- State: `open`, `pending`, `dirty` (a hosted Form reports up), `blocked`. Commands: `close`, `confirm`.
- `DialogButton`: `closesDialog`, disabled while `pending`. `Dialog` renders `actions` through `DialogFooter` (the look channel for the dialog scale).

### Bars (ActionBar, CardActions, NavBar, TableRowActions, header bar)
- Look only, plus the slot tag so a bar accepts the child made for it. This is the previous plan, now one layer of the model, not the model.
- An override of the look (a button asking for its own `size`) is allowed only with a stated reason: `overrides: { size: "why" }`; without it the bar wins and the author is told.

### Page and shell
- Page state already exists (`$sources`, `$vars`, loading and error of a source): `RefreshButton` and `ActionButton` read the source state for pending and error.
- Shell: header trail (`HeaderActionsContext`, done), toasts, router. These are **host capabilities**, see section 4.

## 4. Declared dependencies, checked before render

A component states what it needs and gives; the compiler and the showcase generator read it; a missing need is a message, not a blank page.

| Declaration | Meaning | Check |
|---|---|---|
| `@provides` (context + state keys) | what a scope offers | exists today for contexts |
| `@requires` (context) | needs a scope above | `missing-context` warning, exists |
| `@requiresOneOf urlParam | value+onChange` | either/or props (SearchBar) | new `missing-prop-group` diagnostic; the generator marks the frame not playable or supplies one side |
| `@requiresCapability header-actions-slot` | needs a host feature | new `missing-capability`, given `hostCapabilities: string[]` like `providedContexts` |

Capability names: kebab-case strings, additive, a view lists what it requires and the shell lists what it offers (proposal for app-core: `capabilities: string[]` in the shell settings). Mismatch gives one explicit message at registration naming the view and the capability.

Already done as the safety net: `showcaseFrames.smoke.test.tsx` renders every generated showcase frame with the host providers (it found SearchBar and FieldReadOnly).

## 5. Antifragility (what the structure must gain from stress)

- **Subtract first.** The generic `button` tag leaves every slot; fewer, sharper contracts beat more options.
- **Additive-only contracts.** State is an open record; a child reads only the keys it needs and treats a missing key as "unknown", never as failure. A new scope or a new state key breaks nothing.
- **Barbell.** A tiny stable core (Look, State, Commands, Availability) and many replaceable thin leaves.
- **Failure is contained and informative.** Today one component that throws blanks the whole page (SearchBar did). A per-node error boundary in dev shows a boxed message naming the component and the prop, the rest of the page stays; in production the node is dropped and reported. Every disabled control shows its reason to the end user.
- **Every incident becomes a test.** A shared conformance suite that each specialized child of a scope must pass: reads scope state, shows a reason when disabled, ignores unknown state keys, reports clearly when mounted outside its scope.
- **Migration with skin in the game.** `placement: 'warning'` for every new constraint, never a silent fallback.

## 6. Order of work (each step: failing test first, measure on the real views of the 9 repos, warning mode, publish)

| # | Step | Reach |
|---|---|---|
| 1 | Availability in the base `Button`; `disabledReason` for `ButtonLink`, `RefreshButton`, `ButtonCancel`, `ChipButton`; `enabledWhen` | additive |
| 2 | Per-node error boundary (dev box, prod drop + report) | additive, fixes the blank-page class |
| 3 | Form state (validity, messages, submittable), `FormMessages`, `ButtonSubmit`; fields feed messages | additive; Form.actions tightening later |
| 4 | Selection state with rows, `BatchButton` (`appliesTo`, `mode`), `$selection` in ctx | `batchActions` stays |
| 5 | Row state, `RowActionButton`, `$row` in ctx | `condition` stays |
| 6 | Dialog/Drawer state, `DialogButton`, `Dialog` through `DialogFooter` | additive |
| 7 | Declarations: `@requiresOneOf`, `@requiresCapability`, compiler and generator; capability list agreed with app-core | new diagnostics as warnings first |
| 8 | Bars as the look channel: slot + tag per bar, `overrides` with a reason (the previous plan, reduced) | warning mode |

## 7. Decisions to take

1. Scope names in the YAML ctx: `$form`, `$selection`, `$row`, `$dialog`.
2. `BatchButton` default `mode`: `all` (safe, an action never silently skips items) is recommended; `some` is opt-in.
3. Form validation: fields and a form-level `validate` both feed one message list (recommended) versus a single source.
4. Capability list format for app-core: array of kebab-case strings in the shell settings.
