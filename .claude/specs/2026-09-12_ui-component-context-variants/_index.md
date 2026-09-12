# Spec: UI Component Context Variants

**Created:** 2026-09-12
**Version:** v0.1
**Status:** In Progress -- v0.1 -- 7/7 questions resolved + additional obvious choices closed
**Iteration:** 1

## Summary

<!-- One paragraph: what this spec covers and why it exists. Fill in after first few decisions. -->

Investigates whether UI components (starting with Button) should have context-aware variants
depending on where they are used: forms, action bars, nav bars, dialogs, toolbars, etc.
Driven by analysis of real-world usage patterns across multiple internal applications.

## Decision Log

| # | Decision | Status | Date | Rationale |
|---|---|---|---|---|
| 1 | Build both layers simultaneously: Layer 2 (semantic sub-components: DeleteButton, IconButton, size="icon") AND Layer 1 (layout containers: PageHeader, TableRowActions, CardActions). Sequenced as a plan -- all items in scope. | Approved | 2026-09-12 | All four codebase surveys show evidence for both layers. Highest ROI items identified: size="icon", DeleteButton (Layer 2) + PageHeader, TableRowActions (Layer 1). User confirmed full scope. |
| 2 | Container context mechanism: use per-container React Context following the existing FormContext pattern. Each container that wants to influence children publishes its own typed context (e.g. ActionBarContext, NavBarContext, DialogContext). `_Button` and other components read specific contexts they care about; explicit props always win over context defaults. The generalized capability system (useParentCapability) is out of scope -- see out-of-scope.md. | Approved | 2026-09-12 | FormContext/ButtonSave is the proven pattern. Per-container context is simple, TypeScript-safe, and sufficient for this plan. Capability system parked for future. |
| 3 | IconButton is a thin wrapper over `_Button` (not a separate interaction primitive). `_Button` gains `size="icon" \| "icon-sm" \| "icon-xs"` in its CVA (square padding). `IconButton` wraps `_Button` with `size="icon"` as default and `aria-label` as a required prop. A button is defined as: clickable element with hover, pressed, focus management, and event handler. Icon-only / text / icon+text are shapes of a button -- all backed by `_Button`. | Approved | 2026-09-12 | User-stated principle: button = interaction primitive; shapes are not separate primitives. |
| 4 | Container context publishes ALL defaults that have a documented convention, even "no-op" ones -- explicit intent beats coincidental correctness. Density (`size`) published by: ActionBar (sm), NavBar (sm), TableRowActions (sm), CardActions (sm), DialogFooter (md -- explicit even though md is _Button default). DefaultVariant published ONLY by NavBar (ghost -- only unanimously consistent variant across all 4 projects). Variant is semantic; size is structural. All defaults are covered by tests. | Approved | 2026-09-12 | Option C + user direction: err toward more explicit defaults if tests cover them. DialogFooter size=md documents intent even as a no-op. |
| 5 | Q5 (CSS vs explicit context) resolved by Decision #2: React Context is explicit by definition. CSS ancestor selectors are excluded -- they cannot carry behavior or callbacks and would create an implicit dependency invisible to TypeScript. | Resolved | 2026-09-12 | Implied by Decision #2. |
| 6 | Q6 (ARIA implications of context injection) resolved by P-1 + Decision #3: context injects only size and defaultVariant (visual). ARIA roles, keyboard nav, and focus behavior are unaffected. The only ARIA concern is icon-only buttons, covered by IconButton requiring aria-label. | Resolved | 2026-09-12 | Context is visual-only (Decision #2 + T-02 constraint). No new ARIA decisions needed. |
| 7 | TabButton: in scope. A shape of the button family (P-1) with an `active` prop driving active-underline/background styling. Does not block a future full Tabs compound component (tablist + aria-selected + arrow-key nav). P-3 applies: additive, no doors closed. | Approved | 2026-09-12 | P-3: modest cost, does not reduce future options. wdrive 9-file bypass evidence. |
| 8 | `variant="link"` added to `_Button` CVA. Already exists in 2/4 projects independently. Additive. P-3 applies. | Approved | 2026-09-12 | P-3: obvious convergence. wdrive 7-file copy-paste workaround eliminated. |
| 9 | `DeleteButton` semantic sub-component: thin wrapper over `_Button` with hardcoded `variant="danger" size="sm"`. Passes `action:` through for DSL. Does not prevent direct `_Button variant="danger"` use. P-3 applies. | Approved | 2026-09-12 | P-3: additive. agent-fleet 5+ verbatim repeats of danger+sm eliminated. |
| 10 | All new consumer-facing components (IconButton, TabButton, DeleteButton, layout containers) get `@registryCategory` DSL registration. Additive, zero cost. P-3 applies. | Approved | 2026-09-12 | P-3: no downside to registering. DSL authors gain discoverability. |

## Open Questions

| # | Question | Priority | Status |
|---|---|---|---|
| 1 | Build both layers or prioritize one? | High | Resolved -- see Decision #1 |
| 2 | Which containers publish a React Context, and what defaults does each provide? | High | Resolved -- see Decision #2 |
| 3 | Should IconButton be a separate component or a size variant of _Button? | High | Resolved -- see Decision #3 |
| 4 | Which containers should inject props vs. be layout-only? | Medium | Resolved -- see Decision #4 |
| 5 | Should context be explicit (prop/wrapper) or implicit (CSS ancestor selector)? | Medium | Resolved -- see Decision #5 |
| 6 | What is the accessibility (ARIA) implication of context-aware buttons? | Medium | Resolved -- see Decision #6 |
| 7 | Tab/segmented control: separate component vs. variant vs. out of scope for now? | Medium | Resolved -- see Decision #7 |

## Modules / Sub-files

| File | Contents |
|---|---|
| `guiding-principles.md` | Core principles driving all decisions |
| `out-of-scope.md` | Explicitly excluded items |
| `threat-model.md` | Security threats and mitigations |
| `context-survey.md` | Empirical findings from codebase analysis |
| `component-hierarchy.md` | Proposed component tree and variant taxonomy |

## Changelog

| Version | Date | Summary |
|---|---|---|
| v0.1 | 2026-09-12 | Initial spec created |
