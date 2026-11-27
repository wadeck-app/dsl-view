# Component dependency tree: target and plan

Status: narrowed to the look of bars; the broader model (state, commands, availability, declared dependencies) is `2026-11-27_scope-model-holistic.md`, which supersedes the scope of this file. Nothing below is implemented unless stated. The current state is in `2026-11-27_dependency-tree-current.md`. Principle: `guiding-principles.md`, "Containers constrain their children" (a container that provides a context accepts only the specialized children made for it; the child reads the context; options that depend on the container live on the child).

Names are proposals, to confirm.

## Target tree

```
PageHeader.headerActions --> HeaderActionBar [HeaderActionContext] --> HeaderButton
ActionBar (bottom of a page or section)
  renamed BottomActionBar,    [ActionBarContext] --> ActionButton (text, link, icon)
Dialog
|-- trigger ................. DialogTrigger-tagged buttons only
`-- actions ................. DialogFooter (= the DialogActionBar) [DialogActionContext] --> DialogButton (closesDialog, ...)
Form.actions ................ FormActionBar? [FormContext] --> ButtonSave, ButtonCancel, ButtonSubmit (new)
Card footer ................. CardActions [CardActionContext] --> CardButton
Row actions ................. TableRowActions [RowActionContext] --> RowActionButton (icon, danger-outline)
```

Rules:
- one tag per bar; a button carries only the tag(s) of the bars it is made for; the generic tag `button` leaves every slot;
- the specialized children are thin components over the base `Button`, each exposing only the props of its context (a `DialogButton` has `closesDialog`, an `ActionButton` does not);
- `Dialog` renders `actions` through `DialogFooter`.

## Order of work

| Step | What | Measured impact on the real views of 9 repos |
|---|---|---|
| 1 | `Dialog.actions` rendered in `DialogFooter`; `DialogFooter` gets its slot and tag | none (no view uses `Dialog.actions` with a non-button) |
| 2 | Tag per bar; `ActionBar.items` takes `ActionButton` only | 0 views |
| 3 | `ButtonSubmit` (label, variant, pending label; reads `FormContext.isPending`, not `hasChanges`). `ButtonSave` cannot replace the task "confirm delete" form: fixed `primary`, disabled when nothing changed | new component |
| 4 | `Form.actions` takes form-specific children only | 31 `ButtonAction` uses (task 16, project 15): migrate with `placement: 'warning'`, then error |
| 5 | Header, card, row, nav bars: slot + tag + specialized child | to measure per bar |
| 6 | Test: every container that provides a context declares a slot, and every slot tag is carried by a component built for that container (extends `slotVocabulary.test.ts`) | n/a |

Each step: failing test first, measure on the real views, `placement: 'warning'` for migrations, regenerate manifests, then publish. Owners are told only when their views are affected.

## Decisions needed

1. Distinct thin component per bar (recommended) or one `ActionButton` carrying several tags.
2. Names: `BottomActionBar` rename of `ActionBar` (keep `ActionBar` as alias?), `HeaderActionBar`, `DialogButton`, `HeaderButton`, `CardButton`, `RowActionButton`, `ButtonSubmit`.
3. Whether `Form.actions` keeps `ActionBar` nested or gets its own bar.

## Overriding a context

A button may override its bar's size, but it must be justified. Proposal: `size` on a button inside a bar is honoured only together with a `sizeReason` string; without it the bar size applies and the author gets one development warning naming the bar. The compiler reports a `size` without `sizeReason` on a bar child as a warning.

Local, not pushed: every override is ignored with a warning (`ButtonContext` `lockSize` and `owner`, the five bar providers, `controls/ButtonContextLock.test.tsx`). 14 existing tests in the bar test files assert the old rule and need rewriting once the override design is agreed.
