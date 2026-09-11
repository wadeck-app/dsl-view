# Lessons learned

<!-- Last updated: 2026-09-11T08:53:33.211Z -->

## Recurring feedback

<!-- session 164d51ea 2026-09-06 -->
- User strongly rejects barrel re-exports in public APIs even when technically necessary for npm entry point.
- User prefers rule definition modifications in violations-framework (global) over project-level config suppressions.
- Multiple Unicode symbol fixes required across new components (→/←, —, ×, ─); suggests components created without awareness of violations rules or character encoding constraints; should document prohibited symbols or add pre-commit checks.

## Agent errors

<!-- session 164d51ea 2026-09-06 -->
- Invented non-existent naming convention `AGENT.md` without checking established project patterns — should have verified `CLAUDE.md` vs `README.md` usage first.
- Repeatedly attempted to use disabled memory system despite explicit user instruction to stop and rules against cross-session claims.
- Misunderstood user's "suppress violation sur l'ensemble du fichier" — meant modifying rule definition in violations-framework, not adding project config excludes.
- Restored barrel index.ts after user correction, forcing second round of explanation on intended structure.
- Violations-cli bundles its own nested copy of violations-rules (at `node_modules/@wadeck-app/violations-cli/node_modules/@wadeck-app/violations-rules`), which takes priority over the global or source versions; rebuilding violations-framework and reinstalling doesn't propagate rule updates to the bundled copy—use config.ts suppressions as workaround instead.
- Fork agent wrote `.claude/CLAUDE.md` and `.claude/AGENT.md` documentation files via Write tool without invoking write-doc skill first (violates codebase instruction: "Always invoke the `write-doc` skill before writing any documentation").

<!-- session 65f23291 2026-09-11 -->
- Task scope drift: user requested file reading + Q&A with citations, but execution diverged into unrelated violations fixing (em-dash/emoji replacements, rebuilds of violations-framework) without visible user confirmation or redirection in transcript chunk.
- Incomplete transcript: Q1 answer cuts off mid-sentence ("- `@wadeck-app/dsl-ui` — G"), makes it unclear whether assistant completed the task or session was interrupted before delivering results.

<!-- session 5610612a 2026-09-02 -->
- Multiple deferred tools attempted without first fetching schemas via ToolSearch — find-project, write-doc, goldfish marked "NOT YET KNOWN" despite being called; agents should query tool availability before invocation.

## Documentation gaps

<!-- session 164d51ea 2026-09-06 -->
- No guidance on choosing `CLAUDE.md` vs `README.md` for different documentation purposes in project.
- Terminology "global violations config" ambiguous — user meant rule definition, not config file location.
- No automated workflow for component verification; user had to manually start Storybook and provide feedback, suggesting missing integration or automation guidance for review cycles.

<!-- session 5610612a 2026-09-02 -->
- File organization for consumer reference docs evolved through iterations (AGENT.md → README.md → .claude/docs/dsl-renderer-consumer-reference.md) instead of being decided upfront; no clear convention documented for where package-scoped consumer guides live in this repo.

## Known constraints

<!-- session 164d51ea 2026-09-06 -->
- Package entry point `index.ts` cannot be removed — breaks npm exports for consumers.
- Violations CLI version mismatch introduces new active rules when upgraded; test before committing.
- Parallel component implementation agents (FieldAutocomplete, Badge, Skeleton, etc.) were spawned without intermediate verification; agent summaries reported success based on file creation only, not structure/exports/tests/integration.
- User switched mid-session to French requesting "entire file" reads of components already modified during violations fixing — suggests potential verification step or language preference, but no explicit guidance captured.

<!-- session 65f23291 2026-09-11 -->
- Skill availability: "run storybook" returned "*** NOT YET KNOWN ***" status at 22:49:57, indicating skills may be context-dependent or misconfigured for the project environment.

<!-- session 5610612a 2026-09-02 -->
- Consumers in capability-framework mirror source files from dsl-view for dev-time HMR; documentation should make sync pattern explicit to avoid confusion about which repo is authoritative after changes.
