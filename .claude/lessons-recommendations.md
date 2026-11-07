# Recommendations

<!-- consolidated 2026-09-11, closed out 2026-11-07 -->

## Documentation
- [x] Convention for consumer reference docs location: `.claude/docs/` for package-scoped guides. Documented in `CLAUDE.md` ("Consumer documentation", "Agent reference docs").
- [x] dsl-view is authoritative, capability-framework copies are for HMR only. Documented in `.claude/guiding-principles.md` ("Source authority"); the orphaned copies in capability-framework were deleted (`CLAUDE.md`, "Canonical consumer").

## Process
- Dropped: "fetch deferred tool schemas with ToolSearch before invoking them" is a user-level Claude Code rule, not a project convention, so it does not belong here.
