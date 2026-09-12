# Context Survey -- UI Component Context Variants

**Version:** v0.2
**Last updated:** 2026-09-12
**Status:** Draft

## Overview

Empirical survey of Button component usage AND layout container components across four internal applications:
- `agent-fleet/packages/web-frontend` (cva + Radix Slot, 6 variants, 8 sizes)
- `wdrive/web` (`Btn`, 7 variants, 2 sizes, no context providers)
- `assistant/frontend` (`Button`, 4 variants, 3 sizes, no context providers)
- `capability-framework/packages/dsl-ui` (`_Button`, 8 variants, 2 sizes, most mature system)

---

## Part 1 -- Button Usage by Context

### C-1: Navigation (nav bar, sidebar, breadcrumb)

| Project | Props used | Consistent? |
|---|---|---|
| agent-fleet | `variant="ghost"`, `size="sm"` or `size="default"` (mobile-conditional) | Yes |
| wdrive | `variant="ghost" size="sm"` + className padding overrides | Yes |
| assistant | `variant="ghost"` (no size) for hamburger; `<Link>` for desktop nav | Mostly |
| capability-framework | `variant="ghost" size="sm"` in breadcrumbs and tabs | Yes |

**Signal:** `ghost + sm` is universal for nav. No project deviates. The nav context is already solved without any mechanism.

---

### C-2: Form actions (save / cancel pair)

| Project | Submit | Cancel | Consistent? |
|---|---|---|---|
| agent-fleet | `variant="default"` (implicit) via `FormActions` | must pass `variant="outline"` explicitly | No |
| wdrive | default primary, `type="submit"` | `variant="secondary"` (most) OR `variant="ghost"` (ScopeManager) | No |
| assistant | `variant="primary" type="submit"` | `variant="secondary"` (pages) OR `variant="ghost"` (modals) | No |
| capability-framework | `ButtonSave` (always primary, auto-submit, reads FormContext) | `ButtonCancel` (always ghost) | Yes -- only project with this solved |

**Signal:** The most problematic context. Every project except capability-framework has cancel variant drift (secondary vs ghost). `ButtonSave` / `ButtonCancel` backed by `FormContext` is the only working solution found.

---

### C-3: Dialog / modal confirm-cancel

| Project | Confirm | Cancel | Consistent? |
|---|---|---|---|
| agent-fleet | `variant="default"` or not specified | `variant="outline"` in `Dialog` footer | Partial |
| wdrive | default primary or danger | `variant="secondary"` or `variant="ghost"` | No |
| assistant | `variant="primary"` or `variant="danger"` | `variant="ghost"` (modals) or `variant="secondary"` (pages) | No |
| capability-framework | `ConfirmDialog` accepts `confirmVariant?: 'danger' | 'primary'` | hardcoded `variant="secondary"` (ConfirmDialog), ghost (DialogForm) | Partial |

**Signal:** Destructive confirmation uses `danger` consistently. Cancel is the inconsistency.

---

### C-4: Table / data-grid row actions

| Project | Safe actions | Destructive | Size | Consistent? |
|---|---|---|---|---|
| agent-fleet | (not explicit) | `variant="destructive" size="sm"` repeated 5+ times | sm | Yes, copy-pasted |
| wdrive | `variant="secondary" size="sm"` | `variant="danger-outline" size="sm"` | sm | Yes, copy-pasted |
| assistant | `variant="secondary"` | `variant="danger"` | `size="small"` | Yes, copy-pasted |
| capability-framework | `variant={action.variant ?? 'ghost'} size="sm"` via DataTable | `variant="danger" size="sm"` | sm | Yes -- DataTable encapsulates it |

**Signal:** `size="sm"` is universal in table rows. capability-framework's DataTable is the only one that injects it -- others all copy-paste.

---

### C-5: Inline link-style (button that looks like a hyperlink)

| Project | Pattern | Named variant? |
|---|---|---|
| agent-fleet | `variant="link"` exists as named variant | Yes |
| wdrive | `variant="ghost" size="sm" className="p-0 font-normal text-primary hover:underline"` -- 7 files | No -- copy-paste hack |
| assistant | uses actual `<a>` / `<Link>` elements | Not applicable |
| capability-framework | `variant="link" size="sm"` -- consistently in info cards | Yes |

**Signal:** 2/4 projects independently arrived at a named `link` variant. wdrive has 7 copy-paste workarounds. Clearest "missing variant" signal.

---

### C-6: Icon-only buttons

| Project | Pattern |
|---|---|
| agent-fleet | `size="icon"` / `size="icon-sm"` / `size="icon-xs"` as explicit size props |
| wdrive | `variant="ghost" size="sm"` + className padding overrides |
| assistant | `variant="ghost"` (no size), relies on icon-as-child sizing |
| capability-framework | No dedicated icon size; `RefreshButton` bypasses `_Button` entirely |

**Signal:** Icon-only buttons need square proportions. agent-fleet is the only project with a proper solution.

---

### C-7: Tab / segmented controls

| Project | Pattern |
|---|---|
| agent-fleet | Separate `TabButton` with its own CVA, NOT extending Button |
| wdrive | Raw `<button>` -- 9 files; comment: "Btn does not support adjacent segment layout" |
| assistant | Uses library tabs (Radix/shadcn) |
| capability-framework | `PageTabs` uses ghost buttons with active underline |

**Signal:** Tabs are a genuinely separate component, not a button variant. wdrive's 9 raw-button bypasses are the strongest evidence.

---

### C-8: Bulk action toolbar

No project injects button context into a bulk action bar. All rely on per-action prop passing. Toolbars contain heterogeneous actions (primary duplicate, danger delete, secondary deselect) that cannot share a single variant default.

---

## Part 2 -- Layout Container Survey

### Container inventory by project

| Container | agent-fleet | wdrive | assistant | dsl-ui (cap-fw) |
|---|---|---|---|---|
| `PageHeader` (title left, actions right) | Yes (ReactNode slot) | No -- hand-rolled per page | Yes (ReactNode slot) | Yes (3 rendering modes) |
| `DialogFooter` / dialog action row | Yes (Radix, responsive flex) | No -- hand-rolled `flex justify-end gap-2` EVERYWHERE | No -- no footer sub-component | Yes (flex end + border-t) |
| `FormActions` / form action row | Yes (config-array, no injection) | No -- hand-rolled | No -- hand-rolled | Yes (flex + `Form` provides context) |
| `BulkActionBar` | Yes (CVA, float bottom) | No | Yes (SCSS, float bottom) | No |
| `ActionBar` | No | No | No | Yes (layout-only, `mt-8 flex gap-4`) |
| `Toolbar` | No | No | No | No |
| `CardActions` | No | No | No | No |
| `SidebarNav` | Yes | Inline in `App.tsx` | Yes (`MainLayout`) | No |
| `PageTabs` | No | `ScopeTabs` (semi-custom) | No | Yes |

**Prop injection by container:**
- **Only dsl-ui** uses React Context for prop injection: `Form` publishes `FormContext`; `ButtonSave`/`ButtonCancel` consume it to auto-wire `type=submit` and `disabled`.
- **Only dsl-ui's `Dialog`** publishes `DialogCloseContext` so buttons can close without prop drilling.
- All other projects: containers are layout-only (flex/gap); child buttons receive all props explicitly from callers.

---

## Part 3 -- Cross-Project Synthesis

### Three failure modes, mapped to evidence

**Failure 1 -- Missing named variants** (fix: add to `_Button` CVA)
- `variant="link"`: wdrive has 7 copy-paste workarounds. agent-fleet and capability-framework already have it.
- `size="icon"` / `size="icon-sm"`: 3/4 projects use className hacks for icon-only buttons.

**Failure 2 -- Missing semantic sub-components** (fix: thin wrappers that hardcode role)
- `ButtonCancel` drift: all 3 non-cap-fw projects show secondary vs ghost inconsistency, often within the same codebase.
- `DeleteButton` / `DangerButton`: agent-fleet repeats `variant="destructive" size="sm"` verbatim 5+ times for table delete actions.
- `ButtonSave` with FormContext auto-wiring: only capability-framework has this; it completely eliminates the inconsistency.

**Failure 3 -- Missing layout containers** (fix: add named layout components)
- wdrive has the most severe gap: no `PageHeader`, no `DialogFooter`, no `FormActions` -- every modal hand-rolls `flex justify-end gap-2`.
- assistant has no `FormActions` or `DialogFooter`.
- No project (including dsl-ui) has `Toolbar`, `CardActions`, or `TableRowActions` as a layout container.

### What dsl-ui already has (the strongest foundation)

dsl-ui is the only project with all three layers:
1. Named variants: `link`, `danger-outline`, `success`, `ghost`, `neutral`
2. Semantic sub-components: `ButtonSave`, `ButtonCancel`, `ButtonAction`, `ChipButton`
3. Context-wired layout containers: `Form` (FormContext), `Dialog` (DialogCloseContext), `DialogForm` (composite)

**What dsl-ui is still missing:**
- `size="icon"` (or equivalent explicit sizing)
- `TableRowActions` container that injects `size="sm"`
- `Toolbar` / `CardActions` layout container
- `PageHeader` layout container that can accept action buttons
- Tab / segmented control as a separate component

### The complete contract per layout context

| Container | Button size | Allowed variants | HTML type | Who should enforce |
|---|---|---|---|---|
| NavBar / sidebar | xs or sm | ghost only | button | Convention (already consistent) |
| ActionBar / Toolbar | sm | primary + secondary + danger | button | ActionBar layout component |
| Form footer | md | primary (submit) + ghost (cancel) | submit + button | FormContext (already done) |
| Dialog footer | md | danger/primary + secondary | button | DialogContext |
| Table row | sm | ghost + danger/danger-outline | button | DataTable column renderer |
| Page header | md or lg | primary CTA | button | PageHeader layout component |
| Card actions | sm | secondary + ghost | button | CardActions layout component |
| Toast | sm | ghost (undo/dismiss) | button | Toast component |
| Inline link | sm | link only | button | `variant="link"` (named variant) |

---

## Part 3b -- The DSL Dimension (critical re-analysis)

### How buttons work in the DSL pipeline

Pages are defined in YAML. The `DslRenderer` recursively renders `$type` nodes.
Buttons are YAML nodes -- the consumer never writes JSX. Three patterns observed:

**Pattern 1: `ButtonAction` in a named slot (page header, dialog)**
```yaml
- $type: PageHeader
  title: Books
  headerActions:
    - $type: ButtonAction
      label: New Book
      action: openCreate    # resolves to ctx['openCreate'] at runtime
```

**Pattern 2: Form-bound buttons (`ButtonSave`, `ButtonCancel`)**
```yaml
- $type: Form
  fields: [...]
  actions:
    - $type: ButtonSave     # reads FormContext: auto-submit, isPending, hasChanges
    - $type: ButtonCancel
```

**Pattern 3: Table row actions (NOT DSL nodes)**
```yaml
- type: actions             # DataTable column config, NOT a $type node
  items:
    - label: Edit
      action: openEdit
    - label: Delete
      action: deleteBook
      variant: danger       # plain object prop, not a DSL registry lookup
```
Table row actions are plain objects rendered internally by `DataTable`. They never pass through `DslRenderer`. `DataTable` defaults to ghost; caller marks `variant: danger` explicitly. Already solved.

### The key architectural insight (corrected)

**React Context IS the general pattern. `Form` is the blueprint, not an exception.**

`DslRenderer` passes a single flat `ctx` object to ALL children -- this is the DSL action/data wiring.
But React component context is a separate, orthogonal mechanism: any container component (`Form`, `ActionBar`, `DialogFooter`, `TableRowActions`) can wrap its children in a React Context Provider and children read it.
`ButtonSave` using `useFormContext()` is the intended model for the whole system -- both for logic (hasChanges, isPending) and for style (size, allowed variants).

This means:
- An `ActionBar` SHOULD publish `ActionBarContext` with `{ size: 'sm', defaultVariant: 'ghost' }`.
- A `DialogFooter` SHOULD publish `DialogContext` with its sizing defaults.
- `_Button` reads these contexts to apply defaults; explicit props from the YAML author always win.
- The YAML author can and should use `variant:` and `size:` -- they are first-class DSL props. The context just provides the default so the author does not have to repeat them on every node.

**Corrected mental model:**
- DSL `ctx` (flat root object) = action wiring (handlers, vars, outputs)
- React Context (from container components) = style and behavior defaults for children
- Explicit YAML props (`variant: danger`, `size: sm`) = author override of context defaults

### Existing $type taxonomy

| $type | Registry tags | Context source | Already exists? |
|---|---|---|---|
| `ButtonAction` | `button action` | `action:` string resolves to ctx handler | Yes |
| `ButtonSave` | `button form-specific` | `useFormContext()` -- auto-submit, isPending, hasChanges | Yes |
| `ButtonCancel` | `button form-specific` | `onCancel` prop only | Yes |
| `DangerAction` | `button action` (proposed) | `action:` string, hardcoded `variant="danger"` | No |
| `IconButton` | `button` (proposed) | standalone, no context | No |

### What this means for the spec

The `$type` proliferation approach (one $type per visual role: `DangerAction`, `NavAction`, etc.) is NOT the right direction:
- YAML authors can and should use `variant:` and `size:` as overrides -- these are not implementation details to hide
- The right mechanism to avoid repetition is a **container context providing defaults**, not a taxonomy of named types
- `ButtonSave` / `ButtonCancel` remain valid because they wire **logic** (FormContext: isPending, hasChanges, type=submit) -- not just style
- A `DangerAction` $type would provide no logic value and just duplicate `ButtonAction` with a hardcoded prop

The real question is: **which containers should publish a React Context, and what defaults does each context provide?**

---

## Part 4 -- Industry Reference Patterns

### Material UI
`ButtonGroup` injects `size`/`color`/`variant` into child buttons via context (React.Children.map + cloneElement).
`IconButton` is a separate component, not a variant of `Button`.
`Fab` (floating action button) is also separate.

### shadcn/ui
No context injection. Recommends `variant="ghost"` + `asChild` for nav links.
`buttonVariants` is exported as a CVA function so containers can apply button styling to non-button elements.
No `ButtonGroup` equivalent.

### Ant Design
`Button` has `htmlType` prop for form context (maps to `type` attribute).
`Button.Group` provides border-collapse layout (not prop injection).
`Toolbar` and `Space` are layout-only.

### Radix UI
Pure primitives. No prop injection. Recommends composition via `asChild`.
Form submit is handled by `Form.Submit` which is a separate component.

### Takeaway
The industry is split: MUI injects props; shadcn/Radix use composition. Both converge on:
- Icon buttons as a separate component (not a variant)
- Tab/toggle as a separate component
- Form submit as either a separate component or an explicit `htmlType` prop
- No "universal context provider" that handles all container types
