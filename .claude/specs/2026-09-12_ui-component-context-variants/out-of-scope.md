# Out of Scope -- UI Component Context Variants

Items listed here are **explicitly excluded**.
Raising an excluded item as a requirement is a change-of-scope conversation, not a design question.

## Excluded items

### Generalized capability / parent-context system

A generalized `useParentCapability(key)` mechanism where containers publish typed capability
slots (`density`, `orientation`, `editable`, `variant.default`, etc.) and any child component
queries only the capabilities it cares about -- independent of which specific container is in
the ancestor chain.

**Reason:** Strong concept but too broad for this plan. Requires decisions on: Shape 1 vs Shape 2
(single composite context vs separate per-capability contexts), reset-vs-extend semantics for
semantic boundaries, capability catalog ownership, TypeScript declaration merging strategy, and
devtools support. Premature to commit to this architecture before the simpler per-container
context pattern (Decision #2) has been validated in practice.

**Analogy noted:** This is essentially "CSS custom properties for JavaScript behavior" -- the cascade
and override semantics map 1:1. Worth revisiting once the basic container context pattern is stable.

**Covered by:** Future spec iteration. Seed ideas are in `context-survey.md` Part 3b.

## How to challenge scope
If you believe an item should be in scope, open a new discussion with the rationale.
Do not modify this file silently -- scope changes must be acknowledged as a versioned decision.
