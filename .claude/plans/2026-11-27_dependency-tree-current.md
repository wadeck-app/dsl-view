# Component dependency tree: current state

Source: `packages/dsl-ui/src/known-keys.json` (generated from `@slot`, `@registryTags`, `@registryCategory`, `useContext`/Provider detection), 2026-11-27, 98 components, 17 with a declared slot. The target is in `2026-11-27_dependency-tree-target.md`.

Legend: `[ctx]` = context the container provides. `ANY` = the slot takes atomic, composite and disposition, i.e. every component.

```
PAGE LEVEL
PageContent
`-- sections ........ ANY
Section | VerticalStack | HorizontalStack | Card | Collapsible
`-- items ........... ANY

PAGE HEADER
PageHeader
`-- headerActions ... tag [button, action]  --> the 8 generic buttons (see "button family")

DIALOGS
Dialog   [DialogCloseContext]
|-- trigger ......... tag [button]           --> the 8 generic buttons
|-- items ........... ANY
`-- actions ......... tag [button]           --> the 8 generic buttons     (Dialog renders them in its own div, NOT in DialogFooter)
DialogFooter   [ButtonContext, size md]      (registered, tags dialog-footer; used by nobody inside Dialog; no slot declared)
ConfirmDialog
`-- message ......... tag [content]           --> PageContent, Section
DialogForm
`-- fields .......... tag [field]             --> the 23 field components

FORMS
Form   [FormContext]
|-- fields .......... tag [field]             --> 23 field components (FieldText, FieldSelect, Switch, Slider, ...)
`-- actions ......... tag [action-bar, form-specific, button]
                      |-- ActionBar
                      |-- ButtonSave, ButtonCancel, UnsavedBadge    (form-specific, need FormContext)
                      `-- ActionButton, ButtonAction, ButtonLink, DeleteButton, IconButton, RefreshButton   (generic)

BARS (each provides ButtonContext: size + default variant)
ActionBar        size sm   items ... tag [button] --> the 8 generic buttons
CardActions      size sm   (no slot declared)
DialogFooter     size md   (no slot declared)
NavBar           size sm, ghost   (no slot declared)
TableRowActions  size sm, ghost   (no slot declared)

TABLES
DataTable   [DataTableSelectionCtx, DataTableFilterCtx]
|-- filtersTop ...... tag [filter]            --> ChipButton, FilterBar, FilterChips, SearchBar
|-- filters ......... tag [filter]            --> same
`-- columns (itemKeys, not a node slot)

OTHER
ToastProvider [ToastContext]  items .. tag [layout, content] --> AbTest, HorizontalStack, SplitLayout, Tabs, VerticalStack, PageContent, Section
AbTest [AbParentContext]      variants (map slot of views)
ChipButton, FieldWrapper      items .. tag [atomic]
Tooltip                       items .. tag [atomic, composite]
Drawer, Tabs, PageTabs        no slot declared
```

## Button family (what every `button` slot accepts today)

```
tag [button]
|-- ActionButton     runs a $actions entry
|-- ButtonAction     plain button, onClick
|-- ButtonLink       navigation
|-- RefreshButton    $refresh
|-- IconButton       icon only
|-- DeleteButton     danger
|-- ButtonSave       (form-specific, needs FormContext)
`-- ButtonCancel     (form-specific)
```

## Contexts

| Context | Provided by | Read by |
|---|---|---|
| `ButtonContext` | ActionBar, CardActions, DialogFooter, NavBar, TableRowActions | the base `Button` only, so every button in every bar |
| `FormContext` | Form | ButtonSave, UnsavedBadge |
| `DialogCloseContext` | Dialog | not visible in the registry |
| `DrawerCloseContext` | Drawer | not visible in the registry |
| `DataTableSelectionCtx`, `DataTableFilterCtx` | DataTable | not visible in the registry |
| `ToastContext` | ToastProvider (the app puts it in its shell) | FieldReadOnly |
| `RouterContext`, `UrlParamContext` | RouterProvider (app shell) | DataTable |
| `ThemeContext`, `AbExperimentsContext` | the app shell | ThemePicker, AbTest |
| `AbParentContext` | AbTest | AbTest (nested) |
| `HeaderActionsContext` | HeaderActionsProvider (app shell) | HeaderActionsSlot, HeaderActions, PageHeader `placement: trail` |

## What is wrong

1. **One generic tag for every bar.** `ActionBar`, `Dialog.trigger`, `Dialog.actions`, `PageHeader.headerActions` and `Form.actions` all take the same 8 buttons. `ButtonSave`/`ButtonCancel`, which only make sense in a `Form`, are accepted in an `ActionBar`, a `Dialog` and a `PageHeader`.
2. **`ButtonContext` is shared, not specialized.** It carries size and default variant only. No bar gives its buttons an option of its own.
3. **`Dialog` does not use `DialogFooter`.** The dialog's actions sit outside the one bar that owns the dialog scale.
4. **Four bars declare no slot** (`CardActions`, `DialogFooter`, `NavBar`, `TableRowActions`): nothing is checked inside them.
5. **`Form.actions` was loosened to `button` on 2026-11-27** so the 31 `ButtonAction` uses in task and project keep compiling. That contradicts the principle.
6. **A button's own `size` beats the bar's** (`size ?? ctxSize`), and `IconButton` defaults to 36px. A fix exists locally, not pushed (see the target file, "Overriding a context").
7. **Context-dependent props are visible everywhere** because the base component is shared.

## Not covered

- App-local components (`<module>:<Name>`).
- Slots that exist only as React `children` without `@slot`: invisible to the compiler.
- Readers of `DialogCloseContext` and other contexts outside the registry.
