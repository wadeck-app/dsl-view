# Threat Model -- DSL Package Layering

**Version:** 1.0
**Date:** 2026-09-11
**Methodology:** Architecture risk analysis (STRIDE adapted for design decisions)

## Scope

Package layering decisions affect:
- Consumer developer experience (onboarding complexity, API surface)
- Build time and dependency resolution
- Test suite maintenance and coverage
- Component reusability across applications
- Theme customization patterns and escape hatches

## Assets

What we are protecting:

| Asset | Sensitivity | Owner |
|---|---|---|
| Component reusability across apps | High | Architecture |
| Build speed and dependency graph | High | DevEx |
| Unit test efficiency | Medium | QA |
| Theme customization flexibility | Medium | Design/App teams |
| API surface simplicity | High | Consumer DX |

## Threat actors

| Actor | Motivation | Capability |
|---|---|---|
| New app developer | Ship quickly; adapt design to brand | Moderate: can fork or work around if API is hard |
| Maintainer | Keep test suite fast; reduce version coordination | High: controls package decisions |
| Design system owner | Enforce consistency; allow flexibility | High: controls theme packages |

## STRIDE analysis

### Spoofing
*(N/A -- no authentication or identity concerns in component layering)*

### Tampering
*(N/A -- no data integrity concerns at architecture layer)*

### Repudiation
*(N/A -- no accountability concerns)*

### Information Disclosure
*(N/A -- no secrets or access control at component layer)*

### Denial of Service (Silent Failures)

**Threat ID: T-01 -- Layering complexity silently causes apps to skip theming**

If layering is too complex (too many package boundaries, unclear versioning), app developers will accept the default theme rather than invest in customization. Result: design uniformity despite claimed flexibility.

**Threat ID: T-02 -- Versioning coordination across theme packages breaks silently**

If N theme packages (dsl-ui-admin, dsl-ui-marketing, etc.) all depend on dsl-atomic, and dsl-atomic changes breaking component shape, theme packages may silently continue to compile against stale type definitions, causing runtime failures in consuming apps.

### Elevation of Privilege
*(N/A -- no privilege model at component layer)*

## Mitigations

| ID | Threat category | Threat description | Mitigation | Status | Decision # |
|---|---|---|---|---|---|
| T-01 | Denial of Service (Silent Failure) | Layering complexity silently causes apps to skip theming | Consumer API must expose a single, obvious entry point for components + theme selection. Complexity hidden inside packages. | Open | TBD |
| T-02 | Denial of Service (Version Coordination) | dsl-atomic version changes break downstream theme packages silently | Locked semantic versioning with explicit version coordination; test matrix across theme packages. | Open | TBD |
| T-03 | Denial of Service (Test Skipping) | Unstyled components lack sufficient test coverage because visual testing is deferred to theme packages | Define unit test boundaries per layer; measure coverage; flag coverage drops as CI failure. | Open | TBD |

## Open security questions

Q1: How do we detect when a component is removed or reshaped in dsl-atomic before downstream themes break? -> see Open Questions #4 in _index.md

Q2: Should theme packages version together with dsl-atomic, or independently? -> see Open Questions #3 in _index.md

Q3: What prevents app developers from bypassing the layering (e.g., importing dsl-atomic directly instead of themed variant)? -> see Open Questions #2 in _index.md
