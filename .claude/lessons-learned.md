# Lessons learned

<!-- Last updated: 2026-09-02T18:34:19.074Z -->

## Recurring feedback

## Agent errors

<!-- session 5610612a 2026-09-02 -->
- Multiple deferred tools attempted without first fetching schemas via ToolSearch — find-project, write-doc, goldfish marked "NOT YET KNOWN" despite being called; agents should query tool availability before invocation.

## Documentation gaps

<!-- session 5610612a 2026-09-02 -->
- File organization for consumer reference docs evolved through iterations (AGENT.md → README.md → .claude/docs/dsl-renderer-consumer-reference.md) instead of being decided upfront; no clear convention documented for where package-scoped consumer guides live in this repo.

## Known constraints

<!-- session 5610612a 2026-09-02 -->
- Consumers in capability-framework mirror source files from dsl-view for dev-time HMR; documentation should make sync pattern explicit to avoid confusion about which repo is authoritative after changes.
