# Threat Model -- UI Component Context Variants

**Version:** 1.0
**Date:** 2026-09-12
**Methodology:** STRIDE

## Scope

This threat model covers the design and distribution of context-aware UI components
in a published npm package consumed by internal applications.
Primary concerns are API surface stability, accessibility regressions, and unintended
visual/behavioral changes when components are used outside their intended context.

## Assets

What we are protecting:

| Asset | Sensitivity | Owner |
|---|---|---|
| Public component API (props, exports) | High -- breaking changes affect all consumers | dsl-ui package |
| Accessibility contract (ARIA roles, keyboard nav) | High -- regressions are silent but serious | dsl-ui package |
| Visual consistency across consuming apps | Medium | design system |

## Threat actors

| Actor | Motivation | Capability |
|---|---|---|
| Consumer developer | Misuses a context variant outside its intended context | High -- full access to component props |
| Package update | New variant silently changes default behavior | Medium -- bundled in consuming app |

## STRIDE analysis

### Spoofing
*(not applicable -- no identity involved in a UI component library)*

### Tampering
*(pending -- decisions around prop overrides and style escapes)*

### Repudiation
*(not applicable)*

### Information Disclosure
*(low risk -- no sensitive data handled by button variants)*

### Denial of Service
*(not applicable)*

### Elevation of Privilege
*(pending -- decisions around whether context wrappers can inject behavior consumers cannot override)*

## Mitigations

| ID | Threat category | Threat description | Mitigation | Status | Decision # |
|---|---|---|---|---|---|
| T-01 | Tampering | Consumer overrides context-variant styling in unpredictable ways | Define which style tokens are public API vs internal | Open | - |
| T-02 | Elevation of Privilege | A context wrapper silently changes button behavior (e.g. submit vs button type) | Context must never change semantic HTML attributes without explicit opt-in | Open | - |

## Open security questions

<!-- Q: Should NavBar context ever change button[type]? -> see Open Questions #6 in _index.md -->
