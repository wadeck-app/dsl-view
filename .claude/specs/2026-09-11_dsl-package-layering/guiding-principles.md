# Guiding Principles -- DSL Package Layering

These principles take priority in every design decision.
Any option that conflicts with a principle must be raised as an open question -- never silently accepted.

## Principles

### P-1: Design flexibility must not degrade over time
Applications should be able to diverge in visual design without forking dsl-ui.

**Why:** Current coupling of styling in dsl-ui means every app inherits the same design system. Long-term this creates pressure to accumulate "theme overrides" and one-off styling, leading to maintenance debt. New apps should not pay for decisions made for earlier apps.

### P-2: Unit testing must remain practical
Components should be testable in isolation without heavy visual regression tooling or design-system dependencies.

**Why:** Unstyled components can be tested for behavior (render state, prop interaction) without coupling to CSS frameworks. Styled variants introduce visual testing burden.

### P-3: Maintenance surface area must be transparent
The cost of adding a new layer, theme, or component variant must be immediately visible and quantifiable.

**Why:** Hidden costs (hidden test files, cascading rebuilds, version coordination across N packages) accumulate silently. Architecture should make effort explicit.

### P-4: Consumer onboarding must not require understanding the full layering story
A new app should be able to import components from a single entry point without deciding "which theme variant" or "which layer" to target.

**Why:** Complexity at the consumer API level transfers learning overhead to every new project. The layers should be invisible to the user; the consumer surface should be simple.

### P-5: dsl-ui is the canonical design system; fork only when justified
dsl-ui combines atomic components with integrated styling. It is not separated into unstyled components + theme packages. Applications consume dsl-ui directly; if an app needs a radically different visual direction, fork and maintain it independently.

**Why:** Premature layering adds maintenance cost and versioning complexity with no immediate benefit. A single, cohesive design system is simpler to test, document, and evolve. The layering can be deferred until you have 2+ apps with genuinely divergent design requirements. By then, you will have real data about maintenance cost.

## Decisions established

Decision #1: No layering. dsl-ui is the complete design system (atomic + styled). Applications fork if needed.

*(Approved 2026-09-11)*
