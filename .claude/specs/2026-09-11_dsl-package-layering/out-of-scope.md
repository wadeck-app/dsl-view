# Out of Scope -- DSL Package Layering

Items listed here are **explicitly excluded** from this spec.
Raising an excluded item as a requirement is a change-of-scope conversation, not a design question.

## Excluded items

### CSS-in-JS vs. utility-first CSS decision
**Reason:** Styling *implementation* (Tailwind, emotion, CSS Modules, etc.) is a separate decision from *layering*. This spec assumes one styling approach is chosen; the spec does not prescribe which.

**Covered by:** Separate styling infrastructure spec (future).

### Backward compatibility with capability-framework
**Reason:** This spec designs the ideal architecture forward. Migration of existing consumers is a separate roadmap item and does not constrain the design.

**Covered by:** Deprecation and migration plan (future).

### Runtime performance optimization for theme switching
**Reason:** Multi-theme UI at runtime (e.g., dark mode toggle) is orthogonal to package layering. Layering can support it, but does not require it.

**Covered by:** Runtime theme switching spec (future, if needed).

### Component documentation and Storybook structure
**Reason:** Documentation mirrors the architecture but is not part of the architecture decision. Once layering is decided, docs follow naturally.

**Covered by:** Documentation and build tooling spec (future).

## How to challenge scope
If you believe an item should be in scope, open a new discussion with the rationale.
Do not modify this file silently -- scope changes must be acknowledged as a versioned decision.
