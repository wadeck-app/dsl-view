# Spec: DSL Package Layering

**Created:** 2026-09-11
**Version:** v0.1
**Status:** In Progress
**Iteration:** 1

## Summary

Decided to keep dsl-ui as a unified design system (atomic components + styling). This spec now focuses on component roadmap: identifying which components are blocking real applications, and prioritizing dsl-ui enhancements to eliminate duplicate code across 8 applications in Workspace_Tooling and Workspace_Other. Analysis revealed 2500-3000 LOC of duplicate table/form/overlay logic. Phase 1 roadmap: DatePickers + Drawer + Advanced DataTable patterns.

## Decision Log

| # | Decision | Status | Date | Rationale |
|---|---|---|---|---|
| 1 | No package layering. dsl-ui is the complete design system (atomic + styled). Applications fork if design needs diverge. | Resolved | 2026-09-11 | Complexity cost of layering outweighs benefit until 2+ apps have divergent design requirements. Single cohesive design system is simpler to maintain, test, and evolve. |

## Open Questions

| # | Question | Priority | Status |
|---|---|---|---|
| 1 | Should Phase 1 (DatePickers + Drawer + DataTable docs) be delivered all together, or split across phases? | P0 | Open |

## Modules / Sub-files

| File | Contents |
|---|---|
| `guiding-principles.md` | Core principles driving all decisions |
| `out-of-scope.md` | Explicitly excluded items |
| `threat-model.md` | Silent failure and architecture fragmentation risks |
| `component-audit.md` | Current component coverage analysis + industry research |
| `component-roadmap.md` | Prioritized list of components to add (TBD) |

## Changelog

| Version | Date | Summary |
|---|---|---|
| v0.1 | 2026-09-11 | Initial spec created; brainstorming mode activated |
