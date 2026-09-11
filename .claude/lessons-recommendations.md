# Recommendations

<!-- consolidated 2026-09-11 -->
Looking at the lessons learned to extract actionable recommendations.

## Documentation
- [ ] Document the convention for consumer reference docs location (`.claude/docs/` for package-scoped guides)
- [ ] Document the source mirroring pattern between dsl-view and capability-framework, clarifying that dsl-view is authoritative and capability-framework copies are for HMR only

## Process
- [ ] Always use ToolSearch to fetch deferred tool schemas before attempting to invoke them
