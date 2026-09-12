# Guiding Principles -- UI Component Context Variants

These principles take priority in every design decision.
Any option that conflicts with a principle must be raised as an open question -- never silently accepted.

## Principles

### P-1: Button is the interaction primitive
A button is defined as: a clickable element with hover effect, pressed effect, focus management, and an event handler.
Icon-only, text-only, and icon+text are **shapes** of a button -- not separate interaction primitives.
Thin wrappers that enforce a specific shape (e.g. `IconButton` requiring `aria-label`) are acceptable; parallel implementations that duplicate the interaction model are not.
**Why:** Prevents a proliferation of independent "button-like" components that diverge in focus behavior, keyboard handling, and ARIA support over time.

### P-3: "More but not less" is not a decision -- it is an obvious choice
When Option A costs modestly more than Option B but does NOT reduce future possibilities (Option B remains achievable after A ships), choose A without consultation.
Only surface a decision when the options involve a genuine trade-off: one closes a door, costs significantly more, or introduces irreversible complexity.
**Why:** Consulting on obvious choices wastes the product owner's time and creates decision fatigue on questions that have no real downside.

### P-2: Explicit props always win over context defaults
Any prop explicitly provided by the YAML author or JSX caller takes precedence over any value injected by a container context.
A container context provides a sensible default; it never overrides a deliberate author choice.
**Why:** Context injection is invisible at the call site. Unexpected overrides from an ancestor container would be a debugging nightmare and a DX violation.
<!-- Format for each:
### P-N: <Name>
<One sentence: the rule.>
**Why:** <The motivation -- a past incident, a constraint, a non-negotiable requirement.>
-->
