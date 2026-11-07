# Lessons learned

<!-- Last updated: 2026-09-13T14:41:58.884Z -->

## Recurring feedback

<!-- session 0e6811ba 2026-09-13 -->
- Deep iteration on test-setup.ts (9+ rewrites with 600–1900 byte variations) and minimal_radix.test.tsx (8+ rewrites) — suggests trial-and-error debugging rather than root-cause analysis documented upfront. Scope expanded from "replace userEvent" → "fix test timeouts" → "debug Radix internals" without explicit handoff notes.
- Long iteration cycle on vitest test failures (15:57–16:19) with repeated runs at increasing timeouts (15s→30s→60s→120s) and multiple test file rewrites — suggests agent kept retrying same mocking approach instead of pivoting when strategy wasn't working.

<!-- session 2d49152e 2026-09-13 -->
- ToastContextValue type import added then immediately removed (sed -i twice in succession) — suggests first approach failed; pattern indicates unclear type export from overlay components
- w-guardrails hook crash (17:02:33) blocked all Bash operations; agent sent messages to w-plugins-owner but had no fallback path and stalled on destructive operations (git add/commit).

<!-- session 9b827ed8 2026-09-13 -->
- Delegated agents (Explore → Explore → general-purpose) performed bulk component migrations and index updates without mid-stage validation; main session later discovered ButtonAction needed secondary variant that agents didn't add, requiring post-hoc fixes (12:10-12:18).

<!-- session f698cee5 2026-09-13 -->
- FieldAsyncSelect test file required 6+ test iterations and a `replace_all` refactor (07:31:08), suggesting async component mocking/testing is iteration-heavy
- Multi-repo migrations should verify published package exports (`.d.ts` files in node_modules) before modifying consumers — source code structure may diverge from what is actually exported.

<!-- session 3d0bd30d 2026-09-13 -->
- entriesGenerator had 15+ bugs across 4 commits (ffeffd1, ef27d30, 7e49a80, 88bc5d1) — categories, fallbacks, imports, DateRange handling. Single file accumulating repeated similar issues suggests missing validation or incomplete spec for component metadata.
- tsc-alias missing from dsl-ui build step allowed @dsl-ui path aliases to leak into dist output. Systematic oversight in package.json "build" script that affects all consumers. Bug 1 in this session; likely to recur when build config is forgotten during setup.
- @registryCategory values wrong in 8+ components (controls, layout). No validation in entriesGenerator catches category string mismatches or enforces allowed values — entries generator silently accepts any string.

<!-- session 0b23b09f 2026-09-13 -->
- FieldAsyncSelect test required multiple edit cycles and replace_all operation (07:31:08) before passing — pattern may indicate test template instability or edge case complexity.
- Multiple test file rewrites (fireEvent strategy, then controlled-prop strategy) and incremental test-setup polyfill additions indicate initial approach (swap userEvent → fireEvent) was insufficient; final working solution required coordinated changes across component implementations AND test infrastructure.
- entriesGenerator logic produced 6 bugs (ef27d30), then 3 more (7e49a80), then DateRange fallback (88bc5d1)—pattern suggests the code was shipped without comprehensive test coverage for metadata extraction edge cases; each fix was surgical rather than systematic.

<!-- session 878b8375 2026-09-13 -->
- Heavy polling pattern: sleep 15/30/60 + cat task files instead of event-driven test result notification, creating artificial delays during test iterations.
- Multiple test-setup.ts rewrites (605 → 1582 → 1937 → 1425 → 1529 → 923 → 1862 bytes) show trial-and-error polyfill approach; suggests agent lacked systematic root-cause analysis and should have consulted lessons-learned.md or created minimal reproduction first.
- User delegated 3 parallel fixes (tsc-alias, @registryCategory corrections, entriesGenerator bugs) to sub-agents simultaneously rather than sequentially — indicates preference for parallelization when bugs are independent.

<!-- session bf4c72db 2026-09-13 -->
- FieldAsyncSelect test suite had repeated failures over 6+ minutes with multiple re-edits; replace_all on line 07:31:08 suggests systemic test flakiness or component complexity requiring iterative debugging.
- Test output visibility: piped `npm run build 2>&1 | npx vitest run --bail | tail` then re-ran with grep; final attempt dropped `--bail`. Suggests piping compresses signal; should fail faster.
- Partial implementations shipped without verification: component prop edits (ContextMenu.tsx, TimePicker.tsx, DateRangePicker.tsx adding open state) staged and pushed without waiting to confirm downstream test fixes worked.
- Test file (minimal_radix.test.tsx) written 20+ times with growing mock complexity; vitest timeouts increased from 10s→60s→120s, suggesting mocking strategy was trial-and-error rather than upfront understanding.

<!-- session 1fc0dc1e 2026-09-13 -->
- test-setup.ts changes manually synced to capability-framework mirrors after each fix. Error-prone; suggests shared test config needed instead.

<!-- session ddc3acc7 2026-09-13 -->
- Multiple test runs with 30-60s sleeps between retries (FieldAsyncSelect, FieldMultiSelect, TreeView) — suggests test flakiness or long build/execution times; vitest output capture via background task polling pattern used repeatedly.
- Mirror sync workflow has manual multi-step pattern (source → file copy → re-export index files → npm install → build verify) with no automation — error-prone across capability-framework + orchestrator consumers; multiple build checks required mid-task.
- Final resolution for overlay test: deleted minimal_radix.test.tsx entirely rather than continuing to mock. User accepted this; indicates sometimes bail-out is better than prolonged infra debugging.

<!-- session 5c17e855 2026-09-13 -->
- Implementation agents (07:26) were followed by separate parallel code-review agents launched by user (07:49 three agents in parallel), then manual edits applied—suggests post-implementation independent verification is standard but adds serialization friction.
- Fork agents used twice for independent parallel investigation (Bug 1 tsc-alias + Bug 3a @registryCategory at 17:01; earlier test setup diagnosis at 15:30) — successful pattern for context management
- Manual sleep-and-retry pattern (sleep 30, 20, 40, 25, 20) used as fallback — suggests poll-ci unreliability or missing schema causing agent to lose confidence in the tool

<!-- session 8dfd6d5b 2026-09-13 -->
- Toggled ToastContextValue import in test-utils.tsx (sed add, then sed remove), indicating uncertainty about whether the type was actually needed — should have verified first.

<!-- session 204845cf 2026-09-13 -->
- Vitest mock setup for Radix UI required creating custom mock files (`__mocks__/@floating-ui/react-dom.ts`, `__mocks__/@radix-ui/react-popper.ts`) with manual implementation of `useFloating` and positioning hooks. Multiple config edits suggest this pattern needs a reusable template or preset in the project.
- - When GitHub Actions MCP tools unavailable, manual polling with hardcoded sleep durations is inefficient; consider documenting that `poll-ci` requires schema fetch or clarifying fallback behavior

<!-- session 8a000074 2026-09-13 -->
- Two concurrent sessions (11ae5c7c, e105c6bc) working overlapping tasks in parallel with implicit coordination — both committing near session end with no explicit sync points shown
- sed-based reversible edits (toml imports added then removed) indicate trial-and-error; clearer guidance on test-utils type exports would prevent wasted reversions.

<!-- session ab1a2f3b 2026-09-13 -->
- FieldAsyncSelect.test.tsx ran 9+ times with edits between each run (07:25:47 through 07:34:14) — suggests test is brittle, timing-dependent, or has setup issues requiring iterative fixes rather than a clear fix-once approach.
- File sync pattern between dsl-view (canonical source) and capability-framework mirror (dev-time HMR copy) required repeated manual cp commands across multiple commits — coordination overhead suggests tooling gap
- Multiple entriesGenerator latent bugs (4 separate commits: ffeffd1, ef27d30, 7e49a80, 88bc5d1) discovered via downstream consumer compilation; suggests generator lacks comprehensive test coverage for edge cases (falsy fallbacks, import paths, navigation filters).

<!-- session 8297fbf6 2026-09-13 -->
- write-doc skill not invoked before writing `.claude/plans/2026-09-12_ui-component-context-variants.md` (violates CLAUDE.md rule: "Always invoke write-doc skill before writing any documentation").
- test-setup.ts went through 5+ iterations (rAF → getComputedStyle → animation-name → etc.), each incomplete. Suggests a formal test compatibility matrix for Radix + floating-ui + vitest would prevent repeated trial-and-error.
- entriesGenerator.ts produced repeated generator bugs across 4 commits (6 bugs in ef27d30, then 3 more in 7e49a80, then DateRange in 88bc5d1) over ~5 hours. Pattern suggests function logic or JSDoc could benefit from full upfront review rather than incremental discovery.

<!-- session b0c49f9b 2026-09-13 -->
- Fork agent rewrote test-setup.ts multiple times (6+ writes), each with different polyfill strategy, indicating initial approach wasn't sound and multiple rollbacks were needed.

<!-- session 756038f3 2026-09-13 -->
- Radix component tests (Popover, ContextMenu, DateRangePicker) remain flaky with timing-related hangs despite multiple fix attempts across different sessions; root cause (floating-ui setTimeout in observeMove, focus-scope timing) never resolved.

<!-- session c87741cd 2026-09-13 -->
- Manual file sync between repos (copying ButtonAction.tsx, Divider.tsx, etc. multiple times in sequence) is error-prone and creates divergence risk; no automated mirror-sync tooling detected.
- Test file rewrites of Popover, ContextMenu, TimePicker, DateRangePicker, DatePicker occurred 2–3 times each with repeated timeouts (vitest runs hanging 30–60s) before settling on polyfill-in-test-setup strategy; indicates trial-and-error approach rather than root-cause analysis upfront.
- Test timeouts escalated 10s→120s across 20+ vitest runs; async mock setup wasn't stable until useFloating internals reverse-engineered from node_modules — suggests hidden dependency on async behavior not surfaced in error messages.

<!-- session cbeb333b 2026-09-13 -->
- Component export discovery required repeated grep/ls/cat searches into node_modules and src (09:02:59–09:03:46, 10:54:44–10:55:26). A single authoritative export registry or barrel export list would reduce round-trips.

<!-- session 73bdc8e2 2026-09-13 -->
- User corrected output format mid-session; assistant's response was incomplete/malformed — must validate all findings match the exact `[Section] text` format before returning.
- Agent-written files (RelativeDate, FilterBar, FieldAsyncSelect) built without type errors but test suite took multiple iterations to pass (FieldAsyncSelect: 7+ test runs 07:28-07:31, FilterBar: 1 failure then fix). Pattern: agent writes code, tests fail, manual iteration to fix.
- w-guardrails hook crash (lines 17:02:33–17:06:07) blocks all Bash commands; agent must wait for external fix before proceeding. Creates blocking dependency on tool infrastructure stability.

<!-- session 31e82281 2026-09-12 -->
- Agents polled test results using `sleep + cat` on temporary files (15s, 30s, 60s backoff) instead of using `run_in_background` with proper async completion notification — wasted context/tokens on polling loops.

<!-- session e5d49444 2026-09-11 -->
- Test failures (Badge at 09:25, DatePicker setup at 13:56+) required multiple fix-retry cycles—defensive checks (verifying dist files, checking exports) suggest test environment or setup not validated upfront before implementation started.
- DatePicker test file required 8+ sequential edits (16:09-16:18) before tests passed - suggests test-first approach wasn't applied or initial test coverage had gaps; component implementations should validate tests before declaring completion

<!-- session e92a114a 2026-09-11 -->
- Multiple fork agents in parallel (a719, a324) systematically fixed character violations (em-dashes, arrows) across same files with overlapping edits; no merge conflicts logged, suggesting Edit tool handles concurrent same-file changes or agents partitioned files cleanly.
- Multiple test output filters during debugging (tail -50/-150, grep -A 5) indicate test failure output is too verbose or unclear for root-cause diagnosis — consider improving date-component test output or documenting expected failure patterns.

<!-- session 01b0ac8f 2026-09-11 -->
- User edited Switch/Spinner/RadioGroup/FieldAutocomplete components (13:55:38–13:57:27) while DatePicker implementation agent was running (13:50:51+) — parallel work on overlapping concerns without explicit coordination.
- When implementing new form components, agents should explicitly read existing reference implementations (FieldText, FieldNumber, FieldAutocomplete) first to maintain pattern consistency — fresh start agent did this correctly but prior attempt did not.

<!-- session 11ae5c7c 2026-09-11 -->
- User explicitly corrected agent twice ("je t'ai demandé de faire une demande de bypass !!!") — agent was trying to work around permission blocks instead of making the requested bypass request with the w-guardrails script.
- When a tool/skill interface is unclear, keep retrying variations instead of asking for help or reading --help output.

<!-- session a634c25e 2026-09-11 -->
- Export verification needed post-implementation: agent created verify-exports.mjs script to validate DatePicker/FieldDate are properly exposed from dist/index.d.ts. Build pipeline doesn't auto-verify re-exports at pack time.
- Two-hour gap (14:11 → 16:04) between verification and file deletion suggests offline user decision point — DatePicker components were deleted after UX review, not due to error or redirect.

<!-- session ad709c54 2026-09-11 -->
- Multiple intermediate verification files created ad-hoc (verify-exports.mjs at 13:57:47, WORKSPACE_ANALYSIS_REPORT.md at 09:22:12) for one-time diagnostics — suggests verification/validation steps could be built into test/build pipeline instead of manual scripts.

<!-- session 036e7bde 2026-09-11 -->
- Multiple parallel agents (6+ simultaneously) executing browser/system operations — risk of command interference (port conflicts, file locks, cache races). Use foreground blocking or explicit coordination when agents compete for shared resources.
- Violations bypass requests appeared twice (09:45:42 rm, 13:52:15 commit-and-push) — framework may be too aggressive or needs documented exception patterns for safe operations.

<!-- session 9b74c1ca 2026-09-11 -->
- Multiple components (RadioGroup, CheckboxGroup, IconButton, Progress, Switch, Spinner, FieldAutocomplete) required identical edits to both `.tsx` and `.stories.tsx` files in the same timeframe (09:20–09:27), suggesting a systemic pattern rather than isolated bugs.

<!-- session 89cbc5c9 2026-09-11 -->
- Long 3+ hour gap (09:47:55 to 13:50:12) with no activity — unclear whether user stepped away or a blocking build ran silently

<!-- session 164d51ea 2026-09-06 -->
- User strongly rejects barrel re-exports in public APIs even when technically necessary for npm entry point.
- User prefers rule definition modifications in violations-framework (global) over project-level config suppressions.
- Multiple Unicode symbol fixes required across new components (→/←, —, ×, ─); suggests components created without awareness of violations rules or character encoding constraints; should document prohibited symbols or add pre-commit checks.

## Agent errors

<!-- session 0e6811ba 2026-09-13 -->
- Session relied on manual polling with `sleep + cat` to track background tasks (5+ instances: `sleep 15 && cat`, `sleep 30 && cat`, `sleep 60 && cat` followed by task file reads) instead of proper async completion notifications—fragile and context-expensive pattern.
- FieldAsyncSelect.test.tsx was rewritten 3 times (22:02:21 → 07:06:02 → 07:21:47) with many inline edits between, indicating iterative test failures requiring multiple fix cycles rather than a single correct implementation.
- Two concurrent sessions (11ae5c7c and e105c6bc) modified the same repo simultaneously starting 07:05:28, creating risk of race conditions or conflicting writes (one implementing components + tests, other running research specs).
- Skills marked "NOT YET KNOWN" at call time (code-review 07:46:46, agent-browser 08:04:53) — no pre-flight check available; agent wastes effort on troubleshooting instead of early error
- agent-browser daemon connection debugging (08:05:02–08:11:58) revealed agent was unaware of proper skill usage; fell back to reverse-engineering TCP protocol and manual Node.js scripts instead of consulting skill docs
- write-doc skill schema not loaded at 08:33:11; agent proceeded to write plan file without using the skill
- Multiple git-commit/git-push permission bypass attempts with category name variations (`gitcommitandp...`, `git-commit-pu...`) before succeeding—suggests the bypass system is unclear or the agent was guessing at correct parameter names.
- MockToast type import added then immediately reverted (line 09:11:37 → 09:11:44)—agent tried `import { ToastContext, type ToastContextValue }` then removed the type, indicating uncertainty about what should be imported.
- Agent spawned Explore→general-purpose→claude review agents sequentially without visible user trigger or verification of intermediate results—no checkpoint between agent completions to confirm correctness before proceeding to next step.
- ButtonAction/ButtonSave/ButtonCancel definitions inferred from installed @wadeck-app/dsl-ui packages rather than explicit spec—agent read from node_modules to determine what to write back to dsl-view source.
- MCP GitHub tools called without pre-fetching via ToolSearch — multiple "NOT YET KNOWN" warnings for `mcp__github-wadeck__actions_list`, `mcp__github-wadeck__get_job_logs`. Agent should call ToolSearch before first use of unfamiliar MCP tools.
- Initial delegation to replace userEvent with fireEvent was incomplete — the refactoring itself wasn't the blocker. Root issue was Radix UI's internal setTimeout/requestAnimationFrame usage in @floating-ui/dom (autoUpdate) and @radix-ui/react-dismissable-layer that required test-setup polyfills, not just fireEvent swaps.
- Spawned agent fork (a6b4) at 15:30:29 to review test-fix changes but no verification report returned — only file reads logged; unclear if review completed or findings were validated.
- Parallel agents (ac0f, a2ef) launched at 17:01:39/17:01:41 to fix registryCategory bugs and add tsc-alias; main session verified fixes implicitly via git commits rather than explicit post-fix validation step — no check that bugs actually resolved before publishing.

<!-- session 2d49152e 2026-09-13 -->
- Explore agents spawned for extremely broad surveys (button variants across 4 entire projects; layout containers across all codebases) when task context suggested targeted research on specific component patterns
- agent-browser failed without clear error message; required manual inspection of TCP protocol files and daemon state files to diagnose connection failure
- Agent spent 5+ minutes debugging agent-browser with multiple failed attempts (checking version, searching for daemon, trying different command syntax) before working around it with a custom playwright script — should have escalated "tool unavailable" faster to save context.
- Agent (a240) attempted skill invocation without using Skill tool — tried `Skill Skill` with args inline instead of calling the tool first; later WARN: "*** NOT YET KNOWN *** skill=check-npm-published"
- Multiple agents spawned with overlapping work on test files (fireEvent replacement, controlled prop rewrite) without coordination, causing potential conflict and duplicated effort.
- MCP GitHub Actions tools returned "NOT YET KNOWN" status persisted across multiple attempts and ToolSearch calls, suggesting initialization failure or improper schema loading. Agent proceeded anyway without these tools.
- Trial-and-error vitest configuration (editing vitest.config.ts, test-setup.ts, src/test-setup.ts multiple times) without reading actual test failure output first; agent focused on timeout increases and node_modules grepping instead of diagnosing the root cause.
- Early mocking strategy created elaborate @floating-ui and @radix-ui mocks in __mocks__ directory without validating if that was the actual issue — pattern-matching rather than reading errors.
- mcp__github-wadeck-app__actions_list with methods list_workflow_jobs and list_workflow_runs repeatedly showed "*** NOT YET KNOWN ***" warnings — schema loading failure for GitHub Actions API, breaking reliable CI polling

<!-- session 9b827ed8 2026-09-13 -->
- agent-browser skill unavailable; agent spent 4+ minutes debugging daemon internals (socket checks, protocol inspection, grep through dist files) instead of immediately pivoting to custom Node.js script workaround
- FieldAsyncSelect test file rewritten 6+ times (07:25:36→07:31:08) with iterative vitest runs; suggests test design was exploratory rather than planned
- Agent spent 30+ commands discovering agent-browser daemon path instead of failing fast; eventually worked around by writing Playwright script instead. Tool setup discovery should fail sooner or have clearer fallback path.
- Multiple agents checked test results by grepping temp log files instead of checking exit codes; brittle and inconsistent approach across concurrent phases.
- Phase 4 created `/layout/PageHeader.tsx` wrapper without discovering pre-existing `/display/PageHeader.tsx`; name collision not caught by pre-flight validation.
- Main session attempted escalating npm workarounds (--legacy-peer-deps, --ignore-scripts) when capability-framework package resolution failed, instead of investigating monorepo structure and workspace/hoisting configuration first (09:08-09:11).
- sed-based TypeScript import manipulation (adding then immediately reverting ToastContextValue import) indicates trial-and-error debugging rather than reading the actual build/type error first (09:11).
- Multiple searches for @radix-ui packages across different node_modules paths (root, packages/dsl-ui/, packages/ui/) instead of first checking package.json for workspaces declaration and hoisting rules (09:09-09:10).
- Multiple test-setup.ts rewrites (14:05:36, 14:06:52, 14:07:18, 14:16:25, 14:16:38, 14:29:35) without stabilization — requestAnimationFrame polyfill alone was insufficient to fix Radix test flakiness
- Delegated agent attempted to add `open={true}` controlled prop to Radix components (Popover, ContextMenu, etc.) but tests continued failing/timing out — uncontrolled Radix components may not support this pattern
- Minimal test file (minimal_radix.test.tsx) created at 14:50:42 with multiple rewrites (14:51:54, 14:52:54, 14:53:30, 14:55:01, 14:55:50, 14:56:38, 14:57:05) suggesting exploratory dead-end without clear resolution
- General-purpose agent spent 20+ min on test mocks without examining node_modules source first — investigated @floating-ui/@radix-ui async behavior via grep instead of reading dist index.js upfront. Trial-and-error testing instead of root-cause analysis.
- Fork agent identified @dsl-ui/ unresolved path aliases in dist output, but findings were accepted without re-verifying the fix worked end-to-end before committing.

<!-- session f698cee5 2026-09-13 -->
- Agents repeatedly used `sleep N && cat` pattern for polling test results instead of background task framework (TaskCreate/TaskGet). Multiple instances: 22:03:43, 22:04:10, 22:04:49, 22:04:59, 07:15:23, etc.
- Extended trial-and-error debugging on FieldAsyncSelect.test.tsx and FieldAsyncSelect.tsx with 5+ sequential Edit operations (22:08:30 to 22:19:11) without documented root cause between iterations.
- Skill invocation returned "NOT YET KNOWN" for code-review (07:46:46) — skill registry/loader had runtime issue with availability check
- Multiple failed attempts to launch agent-browser daemon with different paths (node_modules vs nvm, dist/ vs root) suggests unclear installation path or missing setup documentation
- agent-browser skill shown as "NOT YET KNOWN" initially (08:15:59, 08:16:08), forcing fallback to manual bash command discovery and daemon launch
- write-doc skill shown as "NOT YET KNOWN" (08:33:11) despite being listed in available skills
- Agent delegated for orch-ui migration relied on source-code component structure without verifying against installed @wadeck-app/dsl-ui exports — main session had to update to latest package and verify `ButtonIcon` does not exist before correcting migrations.
- Agent copied/referenced components from dsl-view source mirror assuming they were already in capability-framework mirror — required multiple manual syncs and clarification that capability-framework is source-only, not a true dependent.
- Parallel agents modified the same test files without coordination: fork agent (ad7b) staged/committed Divider fix at 14:29-14:30 while general-purpose agent (aeeb) was simultaneously rewriting test assertions for the same suite (14:31+), resulting in wasted work and false sense of completion.
- Initial agent assumed userEvent→fireEvent swap would fix hanging tests (13:25–14:00), but root cause was Radix/Floating UI requestAnimationFrame interaction with jsdom fake timers, not the testing library itself. Only discovered after deep source diving into @floating-ui/dom and @radix-ui packages.
- Multiple attempts to use `mcp__github-wadeck-app__actions_list` failed with "NOT YET KNOWN" repeated 5+ times; agent should check tool availability once and switch to alternative approach (SendMessage + sleep polling) immediately rather than retry the same failing tool.
- entriesGenerator accumulates bugs (6+ across 4 commits: ef27d30, 7e49a80, 88bc5d1, 00d7925) suggesting insufficient edge-case test coverage; fixes repeated pattern of JSDoc parsing and value extraction logic errors instead of systematic refactoring.
- `poll-ci` skill invocation resulted in repeated "NOT YET KNOWN" warnings for GitHub Actions MCP methods (`list_workflow_jobs`, `list_workflow_runs`). The skill may not be properly resolving parameters or schema for workflow polling.

<!-- session 3d0bd30d 2026-09-13 -->
- Tests polled via sleep + temp file reads instead of direct capture: `sleep 60 && cat C:/Users/Wadeck/.../tasks/...` pattern repeats at 22:03-22:05 (22:03:43, 22:04:10, 22:04:49). Ties up agent time polling filesystem; vitest output should be captured directly to stdout.
- Multiple Explore agents launched in parallel across 4 projects without aggregation: each agent (a6fd, a5e9, afbc, aaec) searches independently, duplicating file-finding work. No clear coordinator to merge results or prevent re-searching same paths.
- Agent spent ~5 minutes debugging agent-browser daemon TCP protocol instead of escalating constraint when skill returned "NOT YET KNOWN" — should ask user or use documented fallback earlier
- FieldAsyncSelect.test.tsx required 6+ edit iterations between test runs (07:28–07:34) with timeout 60 — tests may have flakiness or slow setup, agent should have investigated root cause instead of retrying edits
- Test monitoring pattern (08:38:02–08:38:45): agent ran `npm run test` in background, then attempted to read temp log files that were still being written to, polling incomplete output; should either await completion or use --reporter=dot with proper exit codes
- Sed reversals on test-utils.tsx (add ToastContextValue import then immediately remove it) suggests agent tried without understanding requirement — should have read both test-utils and the error message together first.
- General-purpose agent delegated ButtonAction migration work, then main session had to re-verify all changes, re-copy files to capability-framework mirror, and validate builds — verify agent output before reporting completion, especially cross-workspace file syncs.
- Agent(s) attempted multiple trial-and-error fixes for Radix component tests (userEvent→fireEvent, controlled props, test-setup polyfills) without first understanding that Radix relies on async animations, focus traps, and layout effects that require specialized test patterns — 14+ test file rewrites and 30+ individual test runs show lack of root-cause analysis before iteration.
- When delegating test suite work to fork agent, agent ran 60+ individual test commands with 30-60s timeouts, indicating flaky tests were not diagnosed before parallelization — should investigate one failing test fully before scaling.
- poll-ci skill returned "NOT YET KNOWN" warnings; agent fell back to manual sleep loops with repeated failed MCP calls instead of directly querying GitHub API or retrying the skill.
- Fallback to manual sleep polling (30s, 20s, 40s, 25s, 20s sequentially) instead of using poll-ci skill — skill invocation shows "NOT YET KNOWN" schema, suggesting it failed to initialize or resolve properly

<!-- session 0b23b09f 2026-09-13 -->
- Agents used blocking `sleep X && cat <temp-path>` polling for task outputs multiple times per session instead of proper task-await patterns; spec skill invocation returned "NOT YET KNOWN" error with "brainstorming mode" argument, indicating unsupported or undocumented argument.
- Skill availability not checked before invocation — code-review, agent-browser, check-parallel-agents invoked but returned "*** NOT YET KNOWN ***" warnings instead of graceful errors; caused multi-minute debug loop writing custom playwright instead of using agent-browser.
- agent-browser CLI unavailable or daemon not running; agent attempted multiple bash workarounds before creating manual Node.js script (take-screenshots.cjs) using playwright-core from agent-browser's bundled dependencies
- Long-running test phases (30–45s vitest runs) with agent polling temp output files to check completion status — adds uncertainty about test state mid-phase and blocks downstream steps
- Agent at 10:50+ had to inspect node_modules/@wadeck-app/dsl-ui dist/ .d.ts and .js files to understand ButtonSave/ButtonCancel API — component contract not documented in project docs.
- Extensive manual exploration of node_modules internals to diagnose test timeouts; multiple test-setup.ts rewrites and vitest runs with different configurations suggest root cause was unclear until components themselves needed modification (controlled props), not just test setup.
- Spent extensive time on test mocking for floating-ui/radix libraries (14:57-15:24) before giving up and deleting the stub test entirely—the mocking complexity wasn't justified. Detect when mock setup is spiraling and bail earlier.
- poll-ci skill invocation at 21:47:11 resulted in "NOT YET KNOWN" warning; agent silently fell back to sleep + manual GitHub API polling instead of reporting the failure to user or trying alternative approach

<!-- session 878b8375 2026-09-13 -->
- Skill "spec" invoked with args "brainstorm mode" logged as "*** NOT YET KNOWN ***" — unclear if skill name, args, or availability was the issue; manual spec file creation followed instead.
- FieldAsyncSelect.test.tsx edited 5+ times in rapid succession (07:12:02 → 07:19:11), suggesting unclear test spec or repeated failures requiring multiple fix cycles.
- Agent spent ~7 minutes debugging agent-browser daemon (ports, protocol, version mismatch) before creating custom Node workaround; didn't recognize when to abandon tool exploration early
- Agent-browser skill unavailable despite being invoked; multiple manual workarounds attempted (daemon discovery, port configuration) before fallback to Node.js script — indicates skill/tool may need initialization or has environmental dependency not documented.
- Multiple agents spawned in parallel across phases (a5f1, afaf, ac1e, a2f7) writing to overlapping test/story files without clear sequencing — later user manually corrects IconButton/TabButton, suggesting coordination gap.
- Multiple `npm install` attempts with different flags (--legacy-peer-deps, --ignore-scripts) without diagnosing peer dependency failures suggests the agent doesn't understand constraint/workspace setup before trying installs.
- ToastContext import: agent added `type ToastContextValue` import via sed, then immediately removed it via another sed (09:11:37-09:11:44), indicating trial-and-error debugging rather than understanding the problem first.
- Agent copies files between repos without validating whether source or dest already has the change, leading to multiple cp commands in both directions; should verify state before copying.
- Called MCP GitHub tools (mcp__github-wadeck__actions_list, get_job_logs) repeatedly despite "*** NOT YET KNOWN ***" warnings; agent did not load tool schemas first via ToolSearch before attempting calls.
- Fork agent ran 8 iterations of minimal_radix.test.tsx (1143…1638 bytes, varying content) plus hundreds of individual test runs with timeouts (30s, 15s, 35s, 60s)—brute-force rather than structured debugging; lessons-learned.md should document this specific Radix pattern to unblock future sessions faster.
- MCP tool `mcp__github-wadeck-app__actions_list` repeatedly failed with "NOT YET KNOWN" despite being called multiple times — indicates MCP schema loading issue or GitHub auth problem rather than a transient failure; manual sleep-based polling was used as fallback.
- mcp__github-wadeck-app__actions_list repeatedly failed with "NOT YET KNOWN" for `list_workflow_jobs` and `list_workflow_runs` methods — tool schema may not define these methods or they're incorrectly configured
- poll-ci skill invocation also failed with "NOT YET KNOWN" — forced fallback to sleep polling instead of active CI status monitoring

<!-- session 078e3ab6 2026-09-13 -->
- Skill invoked without ToolSearch pre-fetch ("NOT YET KNOWN" warning at 07:09:42); skill schemas should be fetched before use to avoid warnings and retry paths.
- Recurring sleep-based polling pattern (`sleep N && cat temp-file`) used instead of harness background job tracking — wastes tokens and blocks context (patterns at 22:03:43, 22:04:49, 22:05:52, 07:15:23, 07:22:40).
- FieldAsyncSelect.test.tsx debugged through 5 rapid edits (07:18:54–07:19:11) then full rewrite (07:19:44), suggesting test requirements were unclear or assertions were flaky.
- Agent prioritized workaround (custom Node.js script) over escalation when skill became unavailable; should have surfaced failure immediately instead of speculative recovery
- Retried agent-browser skill invocation 5+ times after "NOT YET KNOWN" errors instead of pivoting to manual workaround. Wasted ~10 minutes reverse-engineering daemon.js before writing take-screenshots.cjs as workaround.
- Agent attempted skill `check-npm-published` during migration but it failed to load (marked WARN / "not yet known"), blocking verification of published version availability
- Multiple npm install retries with escalating flags (--legacy-peer-deps, --ignore-scripts) indicates agent wasn't aware of peer dependency constraints in capability-framework upfront
- Two separate Explore agent invocations (quick, then thorough) for migration scope suggests first call's breadth was underestimated; scope should have been stated upfront as "comprehensive inventory"
- Spent 30+ minutes investigating polyfills (requestAnimationFrame, setTimeout mocks) before discovering the real issue: Floating UI's autoUpdate uses setTimeouts that required either mocking timers or (simpler) using controlled `open={true}` prop instead of interactive user-driven tests.
- Multiple rewrites of test-setup.ts (at least 5 different attempts) suggest agent was unsure about root cause rather than systematically diagnosing; should have isolated one Radix component earlier.
- General-purpose agent spent 18 minutes (14:57–15:18) iterating on mocking Radix UI floating-ui dependencies in tests — multiple grep operations into node_modules, config changes, mock file creation. User deleted the stub test file at 15:23, signaling the mocking approach was unproductive.
- Parallel agents (ac0f, a2ef) fixed 3 dsl-ui bugs simultaneously (17:01) but main session had to verify all changes afterward — no independent confirmation from agents before reporting completion to downstream.

<!-- session bf4c72db 2026-09-13 -->
- FieldAsyncSelect.test.tsx went through 3+ rewrite cycles over 16 minutes (07:05:28 → 07:21:47) with 60-second sleeps between attempts. No visible change in approach between retries — agent appears to be re-running the same failing test without hypothesis/fix.
- Skill invocations (code-review, check-parallel-agents, agent-browser) failed with "NOT YET KNOWN" — tools existed but weren't pre-loaded; agent attempted direct calls instead of using ToolSearch first.
- agent-browser daemon had version mismatch (0.6.0 binary vs 0.7.6 npm); binary couldn't connect to running daemon even though it was listening on correct port.
- agent-browser skill invocation failed with "NOT YET KNOWN" (08:15:59, 08:18:26); agent pivoted to custom Node.js/playwright-core workaround instead of fixing underlying availability issue
- Phase 1 test run hung during verbose reporter output (08:35:58); agent switched to `--reporter=dot` and slept 30s instead of investigating blocker
- Phase 4 agent created layout/PageHeader.tsx when display/PageHeader.tsx already existed in codebase; possible naming collision not flagged during component creation
- Code review agent (ad68:claude) at 12:15:50 completed but produced no findings — verification step skipped when reporting migration success to user.
- Two Explore agents launched sequentially (afa6 at 10:24:12, then a345 at 10:47:37) investigating orchestrator package structure — suggests first agent didn't scope coverage clearly enough or results weren't trusted, forcing a second deeper pass.
- general-purpose agent at 12:18:00 attempted skill `check-npm-published` which failed to resolve ("NOT YET KNOWN"). Agent proceeded anyway without clear error handling.
- Agent aeeb rewrote Popover/ContextMenu/TimePicker/DateRangePicker tests (14:31-14:36) to use `open={true}` controlled props and modified component implementations, but did not verify tests passed before reporting completion. Tests continued timing out throughout remainder of chunk.
- Agent aeeb spent 30+ minutes (14:25-14:57) investigating floating-ui and @radix-ui internals (frameLoop, autoUpdate, setTimeout, requestAnimationFrame), writing minimal_radix.test.tsx, modifying test-setup.ts repeatedly — without diagnosing root cause. Tests still timing out at chunk end; approach appeared to treat symptoms instead of incompatibility.
- Agent reverse-engineered @radix-ui and @floating-ui async positioning by grepping node_modules JS files instead of consulting type definitions or JSDoc; wasted 15+ queries on internal implementation details. mcp__github-wadeck-app__actions_list failed repeatedly; agent fell back to sleep+retry instead of investigating why API was unavailable or asking for help.
- `mcp__github-wadeck-app__actions_list` repeatedly called with `method=list_workflow_jobs` marked "NOT YET KNOWN" — agent fell back to sleep-based polling (30s, 20s, 40s, 25s, 20s) instead of proper CI monitoring. Either the method doesn't exist in the tool schema or the method name is wrong; clarify which.

<!-- session 1fc0dc1e 2026-09-13 -->
- Agents poll test results with sleep + cat pattern instead of using run_in_background with ScheduleWakeup — multiple instances of `sleep 15/30/60 && cat task-output-file` when results arrive as notifications
- FieldAsyncSelect.test.tsx underwent 5+ edit cycles with repeated test failures (07:25-07:34); initial test design had issues requiring iterative fixes rather than one-shot pass.
- FilterBar test initially failed and needed correction mid-review (08:02-08:04); suggests test template or assertion pattern isn't robust across all component types.
- Two skills loaded as "*** NOT YET KNOWN ***" at runtime (code-review at 08:07, agent-browser at 08:05) despite being listed; skill knowledge appears stale or context-dependent.
- Phase 1 agent delegated at 08:34:14 but main session independently reverified files at 08:39:02–08:39:04 (5 min gap), suggesting unclear handoff or missing confirmation protocol from agent.
- Multiple Explore/general-purpose agents spawned (10:24, 10:47, 10:50, 12:15, 12:17) but no explicit verification of agent results before proceeding — main agent continued with implicit assumptions about what was discovered. This risks acting on incomplete or misunderstood findings.
- Multiple agents spawned with overlapping test-fixing scope (fork agent on optimization, then aeeb on rewrite). No visible handoff — unclear if fork agent's timing findings were integrated before pivot. Reassigning mid-scope work to existing agent would be more efficient than spawning new ones.
- Agent aeeb spent 26min (14:31-14:57) debugging Radix internals (node_modules archaeology on @floating-ui, react-presence, react-focus-scope) to understand animation timeouts. Root cause (polyfills for requestAnimationFrame, setTimeout, getComputedStyle) could have been reached faster with prior-session documentation.
- Agent spent 15+ minutes iterating on test mocking, grepping through @floating-ui/@radix-ui node_modules internals, creating multiple test stubs and deleting them — suggests confusion about how to properly mock positioning libraries; ended up manually creating mock implementations after extensive trial-and-error.
- Multiple GitHub MCP tool calls returned "NOT YET KNOWN" (ToolSearch failures, mcp__github-wadeck-app__actions_list) — suggests tool schemas not yet loaded or connection issues; blocks programmatic CI monitoring.
- Multiple `mcp__github-wadeck-app__actions_list` calls with methods `list_workflow_jobs` and `list_workflow_runs` marked "NOT YET KNOWN" — schema/method definitions not available, agent attempted to use undeclared methods

<!-- session ddc3acc7 2026-09-13 -->
- Spec skill invoked with "brainstorming mode" arg returned as "NOT YET KNOWN" — skill definition or argument parsing may need validation.
- agent-browser daemon connectivity silently failed with no actionable error; no clear path documented for manual launch or session management; protocol-level debugging required for fallback workaround.
- agent-browser skill was "NOT YET KNOWN" when invoked at 08:15:59 and 08:29:39 — user had to reverse-engineer daemon path and write custom Node scripts as workaround instead of using skill
- PageHeader component created in layout/ directory (08:45:06) without verifying that PageHeader already exists in display/ directory — dual definitions can cause import confusion
- Test investigation inefficient at 08:44:07-08:44:16 — agent grepped temp test output files instead of running tests directly; another agent simultaneously running same tests (08:45:27) — duplicated work
- Explore agent read from orchestrator/node_modules/@wadeck-app/dsl-ui but this was stale relative to source changes in dsl-view; node_modules snapshots lag source truth — should cross-reference version strings.
- Agent delegated to rewrite tests by replacing userEvent→fireEvent, then pivoted to controlled-prop approach after discovering autoUpdate hanging. Multiple test-setup.ts iterations tried RAF/setTimeout polyfills without addressing root cause (architectural, not polyfill-fixable).
- Agent called `mcp__github-wadeck-app__actions_list` multiple times (15:32+, 20:52+, 21:11+) without first fetching schema via ToolSearch — resulted in "NOT YET KNOWN" warnings and failed calls. MCP tool schemas must be loaded before invocation.
- Extended grepping/hexdumping into `node_modules/@floating-ui` and `@radix-ui` source internals (15:01-15:08) to reverse-engineer async behavior instead of consulting vitest docs or existing tests — 27 minutes investigating library source when pattern likely existed elsewhere.
- `poll-ci` skill invoked but mcp__github-wadeck-app__actions_list returned "NOT YET KNOWN" for `list_workflow_jobs` and `list_workflow_runs` methods. Agent fell back to manual sleep-based polling with varying durations (20s–40s) rather than robust status queries.

<!-- session 5c17e855 2026-09-13 -->
- Sleep-poll pattern used repeatedly for test output (sleep X && cat) instead of `run_in_background: true` on bash test commands — wastes tokens polling when harness can notify completion
- Multiple git add/commit calls interleaved during development (22:06:07, 22:07:42 user-initiated; 07:09:58 agent-initiated mid-work) — caused fragmented commit history instead of logical grouping
- Test failure parsing from temp files was inefficient; agent ran vitest multiple times (07:28:36, 07:29:28, 07:29:54, 07:31:12, 07:31:24, 07:33:58, 07:34:09, 07:34:14) with edits between runs, then spent ~3 min trying grep patterns ("F\b", "×", "FAIL", "Error") to extract failures (08:02:08–08:02:21) instead of reading stdout directly.
- `agent-browser` skill repeatedly unavailable ("NOT YET KNOWN" at 08:15:59); agent spent ~9 minutes troubleshooting (daemon.js, versions, CLI help at 08:16:08–08:21:22) instead of recognizing constraint earlier and switching to fallback (eventually wrote custom Node.js script). Should detect unavailable skills and ask user or pivot faster.
- Test execution in delegated agent `a5f1` appeared to hang or timeout (08:38:00 shows `npm run test`, then 08:38:45 shows `sleep 30` polling via temp files). No clear resolution shown; agent tried grep/tail on AppData temp output but output was hard to parse.
- Phase 7 code review invoked at 08:49:08 but logs truncate shortly after; no evidence agent verified all delegated work (Phases 1–6) completed successfully before accepting.
- Multiple sequential Explore agents for overlapping scope (10:24 survey, then 10:47 re-survey of orch-ui) — first result likely insufficient; no verification before re-running
- General-purpose agent reversed sed edits (ToastContextValue import added then removed, 09:11) with no explanation — incomplete mid-edit reasoning
- Agent (12:18) invoked unavailable skill `check-npm-published` as fallback, blocking work
- Multiple test rewrites attempted using controlled `open={true}` props and fireEvent/userEvent replacements — the root issue was animation/timing in Radix internals (setTimeout, requestAnimationFrame, getComputedStyle), not event handling or polyfill availability.
- Multiple vitest runs with incrementally increasing timeouts (10s → 15s → 20s → 30s → 60s → 120s) suggest trial-and-error on timing rather than diagnosing root cause of test failures; similar pattern for floating-ui mock setup with multiple Write/Edit iterations before converging on solution
- poll-ci skill marked "NOT YET KNOWN" — skill definition may not have loaded; agent fell back to manual sleep loops instead of reliable polling
- mcp__github-wadeck-app__actions_list repeated "NOT YET KNOWN" warnings when polling workflow runs/jobs — tool parameters may not match endpoint expectations

<!-- session 8dfd6d5b 2026-09-13 -->
- FieldAsyncSelect.test.tsx shows repeated edit cycles (lines 07:08:59, 07:18:54-07:19:11, 07:21:47 with complete rewrite) — suggests initial test approach/requirements weren't validated before implementation.
- Multiple `sleep X && cat task_file` polling patterns (lines 22:03:43 onward) instead of relying on proper background task completion notifications — inefficient async handling.
- Three agents (a237, ad4e, and others) spawned in quick succession for related components (Card, RelativeDate, FilterBar) without apparent handoff/coordination despite potential shared design concerns that were being spec'd concurrently (lines 07:24:19-07:24:43).
- At 07:46:46 and 08:04:59, skill invocations returned "*** NOT YET KNOWN ***" for code-review and agent-browser. Agent worked around by using general-purpose agents instead, wasting context. Skill loading or name matching may have timing issues.
- From 07:53:24–08:02:12, agent made 8+ grep attempts to extract vitest test failures from verbose reporter output, trying different patterns (FAIL, ×, failed, AssertionError, F\b, F ). Vitest output format parsing was fragile; agent should either use structured reporters (--reporter=json) or fail fast with one attempt then ask for raw output.
- Agent(a5f1) parsed vitest output from temp files using tail/grep patterns instead of checking exit code or --reporter=json; fragile for detecting test results.
- Agent(a2f7) created layout/PageHeader.tsx without checking that display/PageHeader.tsx already existed, creating component duplication.
- Parallel agents (a5f1, afaf, ac1e) in phases 1-4 had no explicit verification gates between phases; dependent phases could start before prerequisites completed.
- Checked installed @wadeck-app/dsl-ui/.../ButtonAction.d.ts as source of truth for component props, but the source hadn't been published yet — installed version lacked new secondary variant. Should reference source files in dsl-view, not installed dist.
- Attempted to manually copy/sync node_modules/@radix-ui between workspaces instead of using npm install with proper dependencies. Multiple npm install retries with --legacy-peer-deps and --ignore-scripts flags suggest package resolution was broken by the approach.
- Agent assumed controlling `open={true}` prop in Radix components would bypass async timing issues; it doesn't bypass FocusScope/dismissable-layer internal async logic and focus traps.
- Multiple test file rewrites (15:00-15:17, ~20 writes total) before settling on mocking approach suggests agent tried to debug async positioning synchronously instead of recognizing upfront that @floating-ui requires vitest mocks. Should pivot to mocking earlier.
- Agent created a minimal_radix.test.tsx stub file (15:13), ran it repeatedly, then deleted it entirely (15:17), indicating the iterative approach wasn't grounded in understanding the root cause (missing mocks). Later investigation by fork agent revealed the real fix.
- When `poll-ci` skill failed to poll properly, agent defaulted to sleep-based polling with SendMessage updates rather than diagnosing the schema/capability issue — consider ToolSearch attempt when tool invocation shows "NOT YET KNOWN".

<!-- session 204845cf 2026-09-13 -->
- Skill invocation failed: `skill=spec | args=brainstorming mode` returned `NOT YET KNOWN` — either brainstorming mode is unsupported argument for spec skill, or skill invocation syntax was wrong.
- Code-review skill marked as "NOT YET KNOWN" at 07:46:46 when user requested /code-review review
- agent-browser skill marked as "NOT YET KNOWN" at 08:05:59; agent spent ~6min reverse-engineering daemon TCP protocol before pivoting to custom Playwright script
- check-parallel-agents skill marked as "NOT YET KNOWN" at 08:07:22 when agent tried to diagnose conflicting daemon versions
- Agents invoked listed skills (agent-browser, kill-port, write-doc) that returned "NOT YET KNOWN" warnings; agents then fallback to bash, but the fallback discovery path is inefficient (grep through daemon source, check multiple bin directories).
- general-purpose agent delegated for orch-ui migration left ButtonAction/ButtonCancel incomplete; main session had to verify, rewrite, and re-sync components afterward
- Controlled prop strategy (`open={true}`) for Radix components caused cascading test failures across TimePicker, DateRangePicker, Popover, ContextMenu — agent rolled it out across 4 files simultaneously instead of validating on one component first before generalizing.
- test-setup.ts polyfill rewritten 4+ times (14:44:42, 14:46:06, 14:56:38) and minimal_radix.test.tsx rewritten 10+ times (14:50 to 14:57) without clear diagnostic feedback — suggests agent was iterating blindly without understanding why each approach failed; needed structured debugging protocol or explicit error logs to guide next attempt.
- Attempted to poll CI status via `poll-ci` skill and `mcp__github-wadeck-app__actions_list` MCP tools without loading schemas first (multiple WARN at 21:14:38+), then fell back to `sleep 15/20` loops—violates guideline against sleep-based polling for external state. Should use ToolSearch to load MCP schema or find alternative background tracking mechanism.
- - `poll-ci` skill invoked but produced "NOT YET KNOWN" response; forced fallback to manual sleep loops (30s/20s/40s/25s cycles) for CI status polling instead of active monitoring

<!-- session 91c1344e 2026-09-13 -->
- Skill invocation without pre-fetched schema: agent spawned at 07:09:12 attempted to use `spec` skill without calling ToolSearch first, resulting in "NOT YET KNOWN" failure. Agents should load skill schemas via ToolSearch before invoking unfamiliar skills.
- Attempted to invoke skills before loading them: "code-review high" (07:46:46), "agent-browser" (08:04:59), "check-parallel-agents" (08:07:22) all marked "NOT YET KNOWN" — agent called Skill tool without first fetching schema via ToolSearch.
- Extended debugging of agent-browser protocol and TCP communication (08:06:50–08:11:08) instead of pivoting to Playwright sooner suggests agent stayed on blocked path too long before trying alternative.
- General-purpose agent used sleep 30 + tail polling to monitor test results (08:38:45), inefficient for long-running tests; vitest actually ran 2+ minutes but agent waited blindly instead of using timeout or better signaling
- Multiple parallel agents (a5f1, afaf, ac1e, a2f7) delegated work — main context read code afterward but did not independently verify results before final commit; relied on agent summaries
- Agent attempted to invoke unknown skill `check-npm-published` at end of general-purpose agent task — would fail and block verification
- When delegating overlapping scope to multiple agents (general-purpose for userEvent→fireEvent replacement, fork for test timing/optimization), parallel work created duplicative edits and context confusion without coordination.
- Minimal_radix.test.tsx was repeatedly rewritten as a diagnostic tool but never conclusively showed whether the real component tests could pass, suggesting the investigation lost focus on the actual problem.
- Did not initially know TypeScript path aliases in dist files require tsc-alias post-build step for resolution; assumption was that TSC alone handled alias rewriting.
- entriesGenerator has systematic bugs around JSDoc extraction — 3 rounds of bug fixes (6 bugs, then 3, then 2 more) suggests incomplete mental model of what metadata should be extracted and validated.
- Did not systematically validate @registryCategory values across components before publishing; mismatches discovered only during downstream integration testing in orch-app.

<!-- session 8a000074 2026-09-13 -->
- Subagent skills showed "*** NOT YET KNOWN ***" warning (spec skill, 07:08:45) — indicates async skill loading or timing issue when agents invoke skills; skills eventually work but may cause silent retries or delays.
- Multiple agents (ad17) repeatedly editing same file (FieldAsyncSelect.test.tsx) with many sequential Edit calls (07:08:30, 07:08:38, 07:19:04, etc.) — suggests agents lack coordination or are struggling with the same issue in iteration loops.
- general-purpose agent delegated to implement RelativeDate + FilterBar components; downstream test runs failed/hung multiple times, requiring repeated manual fixes and re-runs
- agent-browser skill failed ("NOT YET KNOWN") — forced manual daemon startup and introspection into node_modules to find playwright-core; suggests tool registration or MCP bridge issue
- PageHeader component created in layout/ without detecting existing PageHeader in display/ — namespace collision missed until manual review
- Test output capture via temp files + tail polling instead of direct stdout — fragile and delayed feedback loop for long-running test suites
- Agent a240 (general-purpose) migrated orch-ui to dsl-ui but did not verify ButtonAction's `secondary` variant was exported/usable post-migration — main session had to backfill the feature and re-sync.
- MCP GitHub tools called without first fetching schemas via ToolSearch — multiple "NOT YET KNOWN" warnings for mcp__github-wadeck__actions_list and mcp__github-wadeck__get_job_logs. ToolSearch must be invoked before calling unfamiliar MCP tools.
- Component source files modified to add `open` prop and controlled state to support tests (ContextMenu.tsx, TimePicker.tsx, DateRangePicker.tsx). Tests should not drive source design changes unless the source was actually broken — indicates test strategy was flawed, not the component.
- Test iteration inefficiency: spent 20+ minutes rewriting minimal_radix.test.tsx 15 times (14:57–15:17) with different test assertions rather than systematically identifying the root cause (missing vitest mock for @floating-ui/react-dom)
- Assumption-driven debugging: grepped node_modules searching for async/Promise/computePosition patterns (15:01–15:05) without concrete evidence; the actual blocker was vitest environment setup, not async timing
- `mcp__github-wadeck-app__actions_list` methods `list_workflow_jobs` and `list_workflow_runs` are returning "*** NOT YET KNOWN ***" — agent attempted repeated calls despite warnings, then fell back to sleep-based polling (30s–40s intervals) instead of failing fast or using an alternative strategy.
- Agent did not detect or report that the primary CI-monitoring path was broken (MCP methods + skill both unavailable); continued with degraded workaround (sleep loops) without flagging the constraint to the user.

<!-- session ab1a2f3b 2026-09-13 -->
- Agent spawned to take screenshots at 08:04:53; agent-browser skill showed "NOT YET KNOWN" (08:04:59, 08:07:22) but agent spent 20+ minutes debugging daemon protocol, writing custom node scripts, and reading source code instead of immediately switching to Playwright or asking for help. When a skill is unavailable, pivot faster.
- Multiple skills ("agent-browser", "write-doc", "kill-port") returned "*** NOT YET KNOWN ***" when Skill tool was invoked, despite being listed in available skills. Agent fell back to direct tool usage (bash, Write) rather than using the intended Skill abstractions.
- general-purpose agent attempted to invoke `check-npm-published` skill (12:18:55) but the call was incomplete/failed ("NOT YET KNOWN") — supervisor did not catch this before reporting task completion
- general-purpose agent tried sed mutations to fix ToastContextValue import (09:11:37–09:11:44), immediately reverted same change without clear diagnosis of the actual problem — trial-and-error rather than root-cause analysis
- Spawned multiple parallel agents modifying the same files (test-setup.ts) simultaneously, causing staging/commit conflicts and version confusion; no coordination or file locks.
- Deep library investigation (grepping @radix-ui/@floating-ui internals for 8+ minutes, 14:49–14:57) without first establishing a root-cause hypothesis or clear success criteria; yielded no actionable findings.
- Refactored Radix component tests to use controlled `open={true}` prop extensively, then continued testing for 30+ minutes with persistent timeouts; never pivoted to question the premise (that prop rewrites would fix timing issues).
- Trial-and-error test revisions (minimal_radix.test.tsx rewritten ~15 times) without upfront understanding of floating-ui's async positioning model; should have explored library types/docs before coding.
- Attempted poll-ci skill and mcp__github-wadeck-app__actions_list tool calls without loading schemas first; marked as NOT YET KNOWN. Require ToolSearch before use.
- Repeated calls to `mcp__github-wadeck-app__actions_list` with `list_workflow_jobs`/`list_workflow_runs` methods generated "NOT YET KNOWN" warnings — agent did not error-handle or pivot, instead fell back to manual `sleep` commands (30s, 40s, 25s, 20s) for polling CI status.

<!-- session 8297fbf6 2026-09-13 -->
- Multiple agents (a14c, ad17) were editing same test files (FieldAsyncSelect.test.tsx, FieldMultiSelect.test.tsx) in parallel without coordination — risk of merge conflicts or clobbered changes.
- Agents spawned for independent component builds (Popover, ContextMenu, FieldMultiSelect, FieldTags, FieldAsyncSelect) but also polled task completion with `sleep N && cat`, suggesting lack of notification-based coordination awareness.
- Skill invocation showed "NOT YET KNOWN *** skill=code-review" (07:46:46) and "NOT YET KNOWN *** skill=agent-browser" (08:07:22) even though both skills appear in available-skills list — suggests skill-loading state mismatch or timing issue; consider fallback when skill resolution fails
- When agent-browser daemon connection failed, agent spent 40+ minutes debugging internal daemon protocol, port files, and version mismatches (08:06–08:09) instead of pivoting immediately to alternative (custom Playwright script was the eventual workaround); add decision point: "if tool unavailable after N attempts, try alternative"
- Three parallel agents (a5f1, afaf, ac1e) built components independently without result aggregation; main session later re-read outputs and verified files (08:39:02–08:41:11). Parallel agent spawn is good, but results should be checked before delegating next phases.
- general-purpose agent (a240) performed extensive orch-ui migration edits and dependency checks but output/findings not visible in this chunk; verification incomplete
- General-purpose agent created minimal_radix.test.tsx as a debugging artifact but abandoned it mid-exploration — no clear exit strategy when investigating architectural issues. Agent should finalize or delete such artifacts before concluding.
- MCP GitHub Actions tools (mcp__github-wadeck__actions_list, get_job_logs) were called multiple times marked "NOT YET KNOWN" without pre-fetching schemas — session required manual ToolSearch later. Pre-fetch deferred tools for known integrations.
- Parallel agents (ac0f, a2ef) applied multi-file fixes to 8+ components for registryCategory changes without explicit self-verification — main session verified later with single build. Multi-file agent changes risk silent failures if build verification is skipped.
- Repeated "NOT YET KNOWN" warnings on `mcp__github-wadeck-app__actions_list` with `list_workflow_jobs` and `list_workflow_runs` methods suggest MCP schema resolution failures or incorrect parameter usage; agent did not investigate or adjust approach, continued sleeping instead.

<!-- session b0c49f9b 2026-09-13 -->
- Unknown skill invocation: `spec` with arg `brainstorming mode` triggered "NOT YET KNOWN" warning — skill name or definition mismatch caused error.
- General-purpose agent spawned three times with overlapping review scopes ("Angle A+B", "Angle C+Altitude", "Angle A+Cleanup") instead of one comprehensive review—suggests unclear task decomposition or scope fragmentation rather than parallel work.
- FieldAsyncSelect.test.tsx went through 10+ edit-retry cycles over 6 minutes (07:25:47 through 07:34:14) without clear understanding of failure—suggests either flaky tests or test failure messages not parsed well enough for agent to diagnose root cause.
- Multiple skill invocations blocked with "NOT YET KNOWN" (code-review high, agent-browser, check-parallel-agents at 07:46:46, 08:04:59, 08:07:22)—agent should either fail faster or have pre-load guidance.
- agent-browser invocation confusion (08:15:59-08:21:12 and repeated 08:29:39+): Multiple failed approaches—bash direct call, npx, searching for daemon.js in different node_modules paths, trying --help patterns—before finding the right method. Pattern repeated across sessions suggests no clear guidance exists on startup/invocation sequence.
- Temp file test output parsing (08:38:00-08:38:50): Agent tried multiple strategies to extract test results—tail, wc, waiting 30s, different reporters—instead of a direct approach. Suggests test runner output format was unclear or temp file path logic was not straightforward.
- Agent attempted to invoke skill `check-npm-published` without fetching its schema first — resulted in "NOT YET KNOWN" error. Skills must be fetched via ToolSearch before calling.
- Two sequential Explore agents launched to scope orchestrator migration — first returned early, second needed to re-survey full codebase. Indicates unclear scope definition before delegating migration agent.
- General-purpose agent assumed `open={true}` controlled prop would bypass Radix's internal animations/focus logic; this doesn't address the core issue that Radix + Floating UI rely on browser timing APIs (requestAnimationFrame, getComputedStyle, setTimeout) which fail in JSDOM without proper polyfills.
- Agent spent significant time grepping through node_modules (Radix, Floating UI source) looking for a mock point, rather than recognizing this as an environment compatibility problem best solved at the vitest/harness config level.
- Multiple rounds of entriesGenerator fixes (6 commits, then 3 more, then DateRange) — suggests piecemeal debugging without full scope analysis upfront; each fix waited for CI, discovered next issue
- Attempted poll-ci skill without verifying availability first — received "NOT YET KNOWN" repeatedly, then fell back to manual sleep loops instead of using ToolSearch to load it first
- Spawned parallel agents (ac0f, a2ef, a8e5) for concurrent fixes but did not verify results returned — trusted summaries without confirming files were actually edited/built
- poll-ci skill invoked but encountered "NOT YET KNOWN" state, forcing fallback to manual sleep commands (30s/20s/40s intervals) instead of automated CI polling

<!-- session 756038f3 2026-09-13 -->
- Subagents invoking skills received "NOT YET KNOWN" warnings (spec skill at 07:05:28), then fell back to direct bash. Skill resolution differs between main context and spawned agents — subagents may not inherit skill availability the same way.
- FieldAsyncSelect.test.tsx required 7+ test runs with multiple edits (07:28:36 to 07:34:14) before passing—likely async mocking or setup issue that took iteration-by-iteration diagnosis to resolve.
- Multiple parallel code-review agents spawned (Angle A+B, Angle C, Angle A+Cleanup at 07:49) but user manually read and edited 8+ components anyway—agents likely returned insufficient detail or confidence.
- When agent-browser skill appeared as "*** NOT YET KNOWN ***", the delegated agent performed 15+ manual workarounds (CLI help, grep through dist/, searching for daemon.js) instead of immediately fetching the skill schema via ToolSearch. Eventually abandoned the skill and wrote a custom playwright script.
- When write-doc skill appeared as "*** NOT YET KNOWN ***" at 08:33:11, the agent proceeded without fetching it, despite user's explicit CLAUDE.md instruction: "Always invoke the `write-doc` skill before writing any documentation."
- General-purpose agent spawned at 12:17:57 ("Fix orch-ui: Button label-override bug + migrate 5 remaining callsites") made edits starting 12:18:17 while main session proceeded in parallel (12:18:12 pushing ButtonAction). No verification of agent edits before continuing — violates CLAUDE.md "always verify directly before reporting success."
- General-purpose agent rewrote multiple test files to use controlled `open={true}` prop (lines 14:31-14:36), but tests continued hanging and were never verified to work — changes may not have resolved underlying Radix timing issues.
- Fork agent created minimal_radix.test.tsx repeatedly with different implementations (lines 14:50-14:57) while searching Radix internals for setTimeout/requestAnimationFrame sources, never converging on a stable solution or stopping.
- MCP tools (actions_list, get_job_logs) were called without first fetching schemas via ToolSearch, generating "NOT YET KNOWN" warnings (lines 12:56:45+).
- Extended test mocking iterations (minimal_radix.test.tsx rewritten 5+ times, 14:57-15:17) before pivoting to real issues in build configuration and registryCategory values, triggered only by external bug reports from orch-owner.
- `poll-ci` skill showed "NOT YET KNOWN" warning despite being listed in available skills — guardrails may not have initialized it properly

<!-- session c87741cd 2026-09-13 -->
- Multiple agents (a14c, a9db, ad17) writing/testing concurrently in same package (dsl-ui) with overlapping builds — risks file locks and race conditions on node_modules
- Agent-browser daemon/binary version mismatch (0.6.0 binary vs 0.7.6 npm package) caused connection failures on port 50838 — fallback: write custom Playwright script instead of relying on agent-browser CLI
- agent-browser and check-parallel-agents skills invoked but returned "NOT YET KNOWN" — skill registration may be incomplete
- When spawning parallel agents for phases (Phase 1–6), main session attempted repeated manual validation/polling of intermediate outputs instead of waiting for agent completion and reading final results only
- general-purpose agent (10:50:37–10:53:47) completed orch-ui migration but main session then made additional ButtonAction/ButtonCancel changes without re-verifying agent's migration against updated component definitions; suggests stale component baseline during agent execution.
- Multiple agent delegations (general-purpose + fork agents at 13:25, 13:26, 14:31) iterated test file rewrites with repeated timeouts and failures before pivoting to polyfill/mock approach in test-setup.ts — initial strategy of rewriting tests was not viable.
- Fork agent diagnosed 3 dsl-ui bugs, but main session continued without verifying findings before dispatching parallel fix agents — led to rework when root causes differed from initial hypothesis.
- Multiple attempts to call `mcp__github-wadeck-app__actions_list` with `method=list_workflow_jobs` marked as `*** NOT YET KNOWN ***`. Agent should use documented methods only (`list_workflow_runs` appears to work) rather than assuming undocumented methods exist.

<!-- session cbeb333b 2026-09-13 -->
- Agent spawned for screenshot task (08:04:53) did not use Skill tool to invoke agent-browser; instead attempted bash commands directly and spent 90 seconds debugging daemon/protocol/playwright before writing custom .mjs workaround. Should have attempted `Skill(agent-browser)` first.
- Multiple failed attempts to use agent-browser CLI without understanding it requires manual daemon launch
- Used `sleep 30` in test output polling loop instead of proper exit-code checks
- Tried to invoke agent-browser and kill-port as skills instead of failing fast
- Agent a240:general-purpose (12:18:00–12:18:55) verified dsl-ui version after ButtonAction addition but never ran build/tests; main session had to verify separately (12:18:12). Agents on multi-step migrations should leave the full verification chain complete, not partial.
- Multiple general-purpose agents spawned for overlapping work (13:25:29, 14:31:05) without clear handoff or result sync — suggests poor parallelization coordination when delegating test refactoring.
- GitHub MCP tools (`mcp__github-wadeck__actions_list`, `get_job_logs`) remain "NOT YET KNOWN" despite repeated attempts starting 12:56 — tool pre-loading or caching issue, not intermittent.
- Fork agent (ad7b) and main session (M) run identical Popover/ContextMenu test suites in parallel (13:50/14:01-14:19) — duplicate computation; agents should track/reuse peer results via TaskOutput or explicit handoff.
- Parallel agents (ac0f, a2ef) completed fixes separately, but main session immediately made conflicting changes (tsconfig edits, export path changes), invalidating agent testing results before they were reported. Parallel work needs dependency coordination or sequential verification.
- Extended debugging cycle (14:57–15:20) on floating-ui/radix-ui mocking via reverse-engineering node_modules instead of consulting test setup docs or library documentation. Multiple test rewrites resulted from trial-and-error mock strategies rather than upfront clarity.
- Fork agent (a6b4, 15:30) dispatched to review changes, but main session continued independently making more fixes; fork's findings became stale before delivery.
- `poll-ci` skill invoked but underlying GitHub MCP methods (`list_workflow_jobs`, `list_workflow_runs`) return "NOT YET KNOWN" — skill cannot query workflow status, forcing fallback to manual sleep-based polling (30s→20s→40s→25s→20s cycle).

<!-- session 73bdc8e2 2026-09-13 -->
- Agents polled test results via repeated `sleep + cat` pattern reading temp files, rather than using native async task completion signals — adds 30-60s delays per test run unnecessarily.
- Explore agent surveyed button usage across 4 entire projects (hundreds of files), reading Button.tsx, ButtonAction.tsx, and usage patterns exhaustively — should have scoped to single representative project or narrower grep pattern first.
- General-purpose agent spent ~1 hour investigating agent-browser daemon/TCP/playwright setup (08:05-08:09) instead of recognizing the tool wasn't available; eventually worked around with custom Node.js script (take-screenshots.mjs, retry-contextmenu.mjs). Agent didn't flag the blocker early.
- Multiple general-purpose agents spawned in parallel for code review (a310, a43e, af50, a070 at 07:49:19) with unclear coordination; main session then manually applied fixes (07:51+) while agents were still running, risking duplicated or conflicting edits.
- agent-browser skill was unavailable ("NOT YET KNOWN"); fallback was to manually locate daemon at `/c/App/nvm/v24.11.1/node_modules/agent-browser/dist/daemon.js` and start it manually. Future: expect tool unavailability and pre-stage workarounds (custom playwright script or curl-based checks).
- `npm run test` hung during parallel phase runs (08:34:55→08:38:02). Agent recovered by running individual vitest files instead. Suggests the full test suite has a blocking/slow test; using `--bail` flag or running per-file tests should be the default strategy.
- Multiple concurrent agents (a5f1, afaf, ac1e, a2f7) parallelized across phases 1–4 but had to wait on serial test validation. Test hangs in parallel jobs block downstream phases; recommend sequential test validation gate before phase bifurcation.
- At 12:18:55, general-purpose agent invoked check-npm-published skill with "dsl-ui" parameter and received "*** NOT YET KNOWN ***" error — agent should verify skill schemas before calling unknown skills
- Multiple npm install attempts with --legacy-peer-deps + --ignore-scripts flags (09:08:23, 09:11:04, 09:11:17) worked around peer dependency issues but root cause (misaligned package.json in mirror) not diagnosed upfront
- MCP tools `mcp__github-wadeck__actions_list` and `mcp__github-wadeck__get_job_logs` called but returned "NOT YET KNOWN" — tools were not fetched/loaded with ToolSearch before invocation; calls failed silently
- Fork agent rewrote `test-setup.ts` repeatedly during Radix component test debugging (14:29 onwards), progressively simplifying polyfills; unnecessary complexity introduced during trial-and-error before landing on minimal fix
- Agent investigates @radix-ui/react-popper and @floating-ui/react-dom internals via grep/sed (lines 15:01-15:07) to understand async behavior before settling on mocking strategy — indicates test environment setup for Radix UI lacked clear guidance on mock injection points.
- Repeated attempts to use `mcp__github-wadeck-app__actions_list` with `list_workflow_jobs` and `list_workflow_runs` methods fail with "*** NOT YET KNOWN ***" warnings. Agent falls back to `sleep` polling instead of stopping after first failure.
- `poll-ci` skill invocation with "NOT YET KNOWN" warning suggests either unsupported parameters or skill not fully initialized. No recovery attempt or fallback documented.

<!-- session e451b804 2026-09-12 -->
- Multiple agents writing test files in parallel, then requiring iterative fixes: FieldMultiSelect.test.tsx (4 edits), FieldAsyncSelect.test.tsx (2 edits). Parallel component scaffolding created test maintenance burden.

<!-- session 31e82281 2026-09-12 -->
- Assumed Radix UI was available as a dependency when creating Switch/Slider/Divider/Collapsible components — failed to check package.json first to verify UI library dependencies. Agents need to inspect project dependencies before importing external UI libraries.

<!-- session 9ba52475 2026-09-12 -->
- Multiple agents using manual polling pattern (sleep X && cat task-file) to await async test completion instead of ScheduleWakeup or proper async notification; sleep intervals escalate exponentially (15s→30s→60s), indicating agents implemented their own backoff instead of relying on harness task notification.

<!-- session e5d49444 2026-09-11 -->
- Agent attempted to invoke skills (agent-browser, kill-port, run) and tools (ToolSearch/WebFetch) that showed "*** NOT YET KNOWN ***" warnings, indicating they were called before being loaded via ToolSearch or recognized as available skills—should check skill/tool availability before invoking them.
- Agent-browser skill displayed "*** NOT YET KNOWN ***" in fork agent at 09:27, forcing fallback to Bash invocation—skill not pre-loaded or unavailable in subagent context.
- Four parallel agents (a09e:Explore, a193:fork, a30e:claude, aa11:fork) performed overlapping searches for Tables/Forms/DataTables/components across workspace simultaneously—no coordination prevented redundant file reads.
- DatePicker component deleted at 16:04:24, then fresh implementation launched at 16:06:11 without documented root cause - implicit corrections should capture failure diagnosis before restart

<!-- session e92a114a 2026-09-11 -->
- Agents fall back to bash equivalents when Skill tool reports "NOT YET KNOWN" (e.g., `agent-browser --help` when Skill=agent-browser fails). Suggests skills have registration/loading issues rather than missing binaries. When agent-browser skill invoked, agent a70b successfully used CLI directly.
- ToolSearch calls for "WebFetch" report "NOT YET KNOWN", but WebFetch tool appears to work fine when agents invoke it directly (agents a30e/a305 WebFetch successfully after the warning).
- Agent polling with explicit sleep(30) and sleep(60) instead of using run_in_background or Task API for build/test waits — at 13:56:18 and 13:57:18, agent added sleeps to wait for process completion rather than async tracking
- Multiple "no description provided" bash commands logged during exploratory phase (lines 13:50:55 onward) — reduces log clarity and future debugging capability
- DatePicker files deleted at 16:04:24, immediately re-created at 16:06:06 as "fresh start" without explicit decision context — implementation state was ambiguous, not a clear rollback or continuation.
- Iterative test fixes (16:09–16:18) kept changing test approach (8+ Edit calls) rather than fixing one failure path — suggests component API or test setup didn't match expectations; agent should validate against reference (FieldAutocomplete.test.tsx) before iterating.

<!-- session 01b0ac8f 2026-09-11 -->
- Skills showing "NOT YET KNOWN" at 09:04:18, 09:08:16, 09:12:57 but agent proceeded anyway — schema fetch issue or skill invoked before ToolSearch loaded it
- agent-browser daemon discovery took 30+ sec (09:14–09:19) with manual socket/port probing — missing documentation on daemon architecture and CLI connection model
- Explore agent scanned 15+ package.json files across multiple repos to find React projects, then claude agent repeated similar discovery — inefficient vs. targeted grep for dependencies or package names upfront.
- Agent created verify-exports.mjs to validate new component exports post-build, suggesting uncertainty about whether DatePicker/FieldDate reached dist/ and index.d.ts — export chain (src → dist → index) should be verified before or during build.
- agent-browser skill returned "*** NOT YET KNOWN ***" warning when used before schema was loaded — agents should preload skill schemas or verify availability before calling.

<!-- session 11ae5c7c 2026-09-11 -->
- Agent attempted to find session ID by searching non-existent/incorrect log files instead of asking the user or checking documented location — wasted multiple bash commands before user provided it directly.
- Violations cache/bundling: repeatedly rebuilt entire violations-framework and checked multiple cache paths before realizing the issue was the config.ts exclusion pattern, not rule discovery.
- Repeatedly tried non-existent or unclear skills (skill=run with descriptive args, skill=kill-port, skill=agent-browser) without checking availability first; then fell back to bash equivalents.
- Two concurrent sessions (164d51ea and 11ae5c7c) ran simultaneously 13:50-14:01 on the same repo; session 11ae5c7c implemented DatePicker components fully (tests, stories, exports), then session 164d51ea later deleted them without visible review. This created unnecessary churn and potential merge risk — future parallel work should declare scope boundaries or use explicit coordination.

<!-- session a634c25e 2026-09-11 -->
- Violations framework monorepo cache coherency: rebuilt violations-rules, cleared local cache, reinstalled globally, but the bundled rules nested inside violations-cli's node_modules remained stale until a full `npm install` at monorepo root was run.
- agent-browser skill invoked without pre-fetching schema (returned "NOT YET KNOWN" WARN); skill needs ToolSearch call before use to avoid warnings and inefficient retry paths.
- RadioGroup.tsx read 3 times in close succession (lines 30, 170+, 20 lines); same file read pattern suggests agent didn't cache/consolidate prior reads.

<!-- session ad709c54 2026-09-11 -->
- Violations-cli bundles its own nested copy of violations-rules (at `node_modules/@wadeck-app/violations-cli/node_modules/@wadeck-app/violations-rules`), shadowing the global install. Rules cache persists even after global reinstall, requiring `.violations/config.ts` to explicitly exclude test files instead of relying on rule logic.
- Subagents invoking skills showed "NOT YET KNOWN" warnings (agent-browser skill at 09:27:09, 09:30:32) even though skills eventually worked — indicates async skill loading or timing between subagent spawn and skill availability, not actual unavailability.
- Two similar agent forks (`verify-ux-fixes` and `ux-screenshot-check`) both taking screenshots of Storybook stories. Indicates either unclear scope definition or first verification pass was incomplete, requiring a second attempt. Duplicate effort suggests clearer upfront definition of verification requirements needed.

<!-- session 036e7bde 2026-09-11 -->
- Attempted skill invocation `run storybook` and `kill-port 6006` without verifying skill availability — skills should be checked against registry before use to avoid wasted fallback to bash.
- DatePicker.test.tsx was completely rewritten (14:00:47) after initial creation (13:52:13) instead of targeted fixes — suggests fundamental test issues weren't caught early or requirements were unclear on first pass.
- Parallel agents (164d51ea fork, 11ae5c7c main) made concurrent edits to same package files (RadioGroup, Switch, Spinner, FieldAutocomplete at 13:57:xx) — while no conflicts surfaced, coordination strategy between parallel component fixes is unclear.
- Fork agents invoked `agent-browser` skill with "NOT YET KNOWN" warning, then fell back to direct bash. Subagents may not resolve skills the same way as main context.

<!-- session 6201b127 2026-09-11 -->
- Parallel agent proliferation: spawned multiple fork agents for overlapping violations fixes (fix-emdash-deadsupp + fix-emoji-arrows) working same files/rules without coordination or deduplication.
- Tool failures without fallback: agent-browser daemon setup failed repeatedly (09:13–09:19) with socket/port errors; no fallback to simpler screenshot method attempted despite ~6-minute debugging loop.
- Scope creep auto-fix: ~6 minutes (22:28–22:36) spent fixing violations (em-dash/emoji) unrelated to stated task; no user sign-off before divergence.
- Subagent spawned with fork type tried to use agent-browser skill without pre-fetching schema — skill reported "NOT YET KNOWN" at 09:27:09, suggesting subagents should call ToolSearch before invoking non-core skills

<!-- session 9b74c1ca 2026-09-11 -->
- Agent attempted to use `agent-browser` skill before it was loaded (marked "NOT YET KNOWN" at 09:27:09, 09:30:32), then proceeded with Bash `agent-browser` commands anyway — unclear if this was successful fallback or if skill was subsequently loaded.
- Agent ran `npm test -- DatePicker.test.tsx` at 13:55:11 but result was unreadable; instead of troubleshooting, agent proceeded to build-storybook, then much later re-ran tests (13:59:46) and modified test setup — suggests initial test failure diagnostics were lost or unclear.
- Agent invoked `agent-browser` via direct Bash commands (`Bash agent-browser open ...`) instead of recognizing it as a callable skill; skill showed `*** NOT YET KNOWN ***` warning but commands succeeded anyway, suggesting either fallback behavior or skill registration gap.
- Fork agents spawned to take screenshots ("verify-ux-fixes" and "ux-screenshot-check") but main agent appears to re-take screenshots independently afterward rather than receiving results from forks—possible coordination issue or missing channel for fork results.

<!-- session 89cbc5c9 2026-09-11 -->
- Fork agent attempted agent-browser session commands 10+ times with incorrect port/daemon assumptions, then tried to manually locate playwright binaries instead of checking if daemon was already running on known ports
- Fork agent writing `.claude/specs/**/*.md` documentation files via Write tool without invoking write-doc skill first (violates CLAUDE.md instruction)
- Skill lookups for "run storybook" and "kill-port" marked as "NOT YET KNOWN" despite being listed as available skills
- Multiple ToolSearch calls with query results showing tools as "*** NOT YET KNOWN ***" (WebFetch) even though they are standard deferred tools — agents not loading schema before calling
- agent-browser skill shown as "NOT YET KNOWN" at 09:27:09 and 09:27:21 — agent proceeded anyway; suggests skill schema not loaded before invocation or name mismatch
- Fork agent shows agent-browser skill as "NOT YET KNOWN" when invoked via Skill tool, but works when called as direct bash commands (agent-browser open...). This suggests either the skill loader doesn't recognize it in fork context, or it should be invoked differently — check whether agent-browser is intended for Skill invocation or direct bash.

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

<!-- session 0e6811ba 2026-09-13 -->
- Test output parsing ambiguity — agent tried 8 different grep patterns (08:02:04–08:02:12) to extract vitest failures before eventually finding the assertion issue manually
- FieldAsyncSelect.test.tsx required ~8 test-run cycles with inter-cycle edits (07:28–07:34) — suggests test setup or assertion constraints are unclear; no single-pass clarity on what the test expected
- Multiple skills (agent-browser, write-doc, kill-port) marked "NOT YET KNOWN" when invoked, forcing manual bash fallbacks instead of using the intended tool interfaces
- Capability-framework mirror sync workflow (component files, index exports, @radix-ui dependency installation) discovered through trial-and-error; agent spent 09:08-09:11 discovering workspace structure, package.json locations, and correct npm install flags (`--legacy-peer-deps`, `--ignore-scripts`).
- No guidance on Radix component test setup beyond basic requestAnimationFrame polyfill — @floating-ui/dom's `autoUpdate` loop uses setTimeout with explicit timeoutId tracking for debouncing; @radix-ui/react-dismissable-layer also uses setTimeout. test-setup.ts needs specific handling for these, not just global rAF mock.
- poll-ci skill invocations at 21:11:32, 21:14:38, 21:27:48 returned "NOT YET KNOWN" warnings; fallback to manual sleep polling (sleep 15/20s) used instead; skill setup or MCP connection unclear.

<!-- session 2d49152e 2026-09-13 -->
- No documented fallback or clear diagnosis when agent-browser daemon exists but binary connection fails; users/agents forced to debug daemon/protocol internals
- agent-browser daemon requirement ("Call launch first") not discoverable from help text — user had to grep source code to find it.
- Mirror sync workflow (capability-framework packages mirror vs dsl-view source) requires multiple manual file copies and npm install runs — no documented sync script or automation
- No clear guidance on debugging Radix component test hangs in animation/focus scenarios — agent resorted to extensive node_modules inspection rather than having documented troubleshooting steps.
- entriesGenerator bugs discovered incrementally through CI failures across 5 commits (ffeffd1, ef27d30, 7e49a80, 88bc5d1, 00d7925); suggests no design doc or test coverage explaining the generator's logic and assumptions about component contracts.
- poll-ci skill invocation (wadeck-app/dsl-view 00d7925) also showed "*** NOT YET KNOWN ***" warning — may indicate skill is not properly integrated or schemas not loading for CI monitoring tools

<!-- session 9b827ed8 2026-09-13 -->
- agent-browser daemon startup (located at `/c/App/nvm/v24.11.1/node_modules/agent-browser/dist/daemon.js --port 50838`) not discoverable; agents had to grep through node_modules files to understand bootstrap model.
- No recorded guidance on whether Radix components support controlled `open` prop or what the correct test pattern is for these components
- No guidance on when tsc-alias post-build step is required in monorepo builds; alias resolution failure is silent (dist imports stay unresolved, breaking downstream consumers).
- @registryCategory valid enum values not documented; components had wrong category values ("controls" vs "layout", etc.) without clear spec or validation warnings.
- MCP GitHub actions tool is advertised but methods/usage for workflow job monitoring are not documented or not implemented — agent discovers this only via repeated failed attempts, not upfront.

<!-- session f698cee5 2026-09-13 -->
- agent-browser daemon startup and TCP protocol were not documented; agent reverse-engineered from source code trying multiple approaches (session files, port files, TCP protocol) before fallback to direct Playwright (08:04:59 to 08:09:53)
- agent-browser requires manual daemon launch and correct path discovery — no clear documentation on proper invocation pattern or initialization sequence
- capability-framework package structure / workspace organization unclear — agent spent 09:09-09:10 extensive time exploring folder hierarchy, checking git history, grepping for package declarations, looking in multiple package folders (`dsl-ui`, `dsl-ui-library`, `ui`), and checking different node_modules levels.
- Radix component test incompatibility with jsdom/vitest (hanging Popover, ContextMenu, DatePicker tests) not documented; agent had to reverse-engineer Floating UI's autoUpdate frame loop and Radix focus-trap setTimeout from node_modules source.
- No guidance on mocking async positioning libraries (`@floating-ui/react-dom`, `@radix-ui/react-popper`) in Vitest; agent spent 20+ iterations trial-and-error on test-setup.ts and vitest.config.ts configuration before settling on mock implementations.
- Path alias resolution step (`tsc-alias` post-build) was missing from build docs; dist files leaked `@dsl-ui/` import paths until Bug 1 fix, implying build process steps are under-documented.

<!-- session 3d0bd30d 2026-09-13 -->
- Screenshot/visual testing workflow not documented — agent reverse-engineered daemon protocol and wrote custom Node.js script as workaround instead of using documented approach
- write-doc skill marked "NOT YET KNOWN" (08:33:11) despite being listed in available skills; documentation about skill availability/registration seems incomplete
- Why capability-framework maintains its own dsl-ui source and node_modules instead of consuming published @wadeck-app/dsl-ui from npm is not documented; unclear when to use mirror vs published version.
- No guidance in `.claude/lessons-learned.md` or project docs about Radix UI component testing constraints — agent had to reverse-engineer @radix-ui dependencies (react-presence, react-focus-scope, floating-ui) to understand setTimeout and requestAnimationFrame usage that blocks tests.
- Agent spent 20+ minutes grepping node_modules to reverse-engineer @floating-ui/@radix-ui internals before creating test mocks. Mock strategy (async positioning, flushSync, autoUpdate handling) should be documented or provided as a test utility.

<!-- session 0b23b09f 2026-09-13 -->
- spec skill does not document its argument modes or supported parameters; task output file paths stored in AppData/Local/Temp with session-specific subdirectories, but agents had to discover this path via trial-and-error polling.
- agent-browser daemon protocol (TCP on port 50838, JSON serialization) required deep source code inspection — no user-facing docs; custom Playwright fallback was necessary.
- write-doc skill marked "*** NOT YET KNOWN ***" at 08:33:20; agent proceeded to write plan file directly without invoking the skill
- Mirror sync workflow between dsl-view (authoritative source) and capability-framework (dev-time mirror) is undocumented — led to multiple manual copy operations (Divider.tsx, ButtonAction.tsx, test-utils.tsx) with unclear order/dependency.
- No documented patterns for testing Radix-based components (Popover, ContextMenu, TimePicker, DatePicker, DateRangePicker) — session spent 2+ hours investigating @floating-ui and @radix-ui source code rather than consulting project or package-level guidance.
- entriesGenerator component metadata extraction has no clear spec for allowed @registryCategory values or validation rules; discovered by bugs, not docs. Each fix required reading node_modules source to reverse-engineer requirements.
- Build pipeline ambiguity: tsc-alias post-processing for path alias resolution (@dsl-ui/*) wasn't part of the initial build config—had to be added after dist contained broken imports. Document the full pipeline upfront.
- GitHub Actions MCP methods `list_workflow_jobs` and `list_workflow_runs` repeatedly appear as "NOT YET KNOWN" across multiple calls (21:32:05, 21:32:44, 21:33:14, 21:33:21, 21:47:22, 21:48:11, 21:48:45, 21:49:13), indicating MCP tool schema or documentation for these methods is incomplete or unstable

<!-- session 878b8375 2026-09-13 -->
- Skill invocation marked "NOT YET KNOWN" (code-review) warns but doesn't fail; unclear whether agents should retry, wait, or what fallback behavior is
- agent-browser prerequisite (daemon launch on port) not documented in help output — user spent 10+ minutes searching node_modules for daemon.js and trying manual startup.
- No guidance on test output strategy for large test suites — agent ran `npm run test --reporter=verbose` which generated huge output, then had to grep temp files and retry with `--reporter=dot`.
- capability-framework package.json structure and workspaces layout caused repeated investigation loops (grep radix, ls node_modules, cat package.json) — the sync/mirror relationship and dependency requirements need explicit documentation.
- No captured guidance on Radix/floating-ui + vitest test timing issues; agent reverse-engineered by reading node_modules source code (expensive context usage) instead of checking project docs or running focused minimal repro earlier.

<!-- session 078e3ab6 2026-09-13 -->
- No documented escalation or recovery path for "NOT YET KNOWN" skill failures; agent instead spent 30+ commands reverse-engineering agent-browser daemon protocol and source code
- agent-browser skill was not pre-registered; when used, returned "NOT YET KNOWN" with no guidance to use manual Playwright or alternative. Required grepping source code to understand daemon architecture.
- capability-framework mirror sync pattern requires explicit manual file copying; not auto-synced from dsl-view source — agent had to discover this through trial/error
- @radix-ui peer dependency conflict in capability-framework package.json wasn't documented, triggering multiple failed installs and retry cycles
- No project guidance on testing Radix Popover/ContextMenu/DatePicker with Vitest when components depend on Floating UI's autoUpdate animations.
- entriesGenerator.ts accumulated 11 bugs across 4 commits (ffeffd1: 3 bugs, ef27d30: 6 bugs, 7e49a80: 3 bugs, 88bc5d1: 2 bugs). Suggests insufficient unit tests for generator logic or missing systematic validation of common patterns.
- No clear guidance on mocking Radix UI + floating-ui dependencies in vitest. Agent explored node_modules extensively (grep computePosition, autoUpdate, useFloating) before agent could identify correct mock strategy.

<!-- session bf4c72db 2026-09-13 -->
- Async component test setup patterns (FieldAsyncSelect, FieldMultiSelect, Popover, ContextMenu) required multiple sequential edits to the same test files rather than getting it right first time — no reference docs for jsdom + vitest + async patterns in this codebase.
- agent-browser daemon protocol, session management, and port-file discovery not documented inline — required 20+ diagnostic commands to reverse-engineer startup sequence and TCP protocol format.
- agent-browser and write-doc skills flagged "NOT YET KNOWN" on first invocation despite being listed in available skills; unclear if lazy-load or missing schema
- @wadeck-app/dsl-ui export surface unclear — multiple bash drills inspecting dist/*.d.ts, index.d.ts, package.json exports, and node_modules to reverse-engineer which components (ButtonAction, ButtonSave, ChipButton, ActionBar) are actually exported. No reference list found.
- capability-framework workspace structure not obvious — required investigation of workspaces config, root node_modules vs. packages/*/node_modules, and package.json radix-ui placements across multiple packages before understanding where to add dependencies.
- Vitest+Radix interaction (fake timers, autoUpdate polling, animation frames) not documented in .claude/* — agent had to reverse-engineer from node_modules instead of from project guidance.
- No documented list of valid @registryCategory values; agent had to read entriesGenerator.ts source code to discover "navigation" and "controls" are categories. Should be in `.claude/guiding-principles.md`.

<!-- session 1fc0dc1e 2026-09-13 -->
- "NOT YET KNOWN" spec skill warning (2026-09-12 07:08:45) — spec is listed as available but agents aren't familiar with it or its behavior
- agent-browser lacks clear launch/initialization docs for Windows; agent spent 30+ commands debugging daemon connectivity before writing custom Node.js workaround (take-screenshots.mjs).
- Two PageHeader components exist (display/PageHeader.tsx and layout/PageHeader.tsx) with same name; creates confusion when both paths are read at 08:46:41. No canonical guidance on which is primary or why duplication exists.
- Component discovery → backfill pattern not documented: agent had to survey orchestrator usage → add props to dsl-ui ButtonAction → re-sync to cap-fw. This discover-then-fix cycle is implicit in workflow but not flagged upfront.
- Radix component test patterns not documented: use of `open={true}` controlled props vs user interactions, required polyfills for jsdom's animation model. Forcing archaeology each session.
- No obvious reference for mocking @floating-ui/react-dom and @radix-ui/react-popper in test setup; agent had to reverse-engineer library internals instead of following a guide.
- GitHub MCP server's `actions_list` available methods not documented — agent had to discover via trial/error that certain workflow monitoring methods exist but aren't in schema

<!-- session ddc3acc7 2026-09-13 -->
- Output format specification (required prefixes like `[Recurring feedback]`, `[Agent errors]`, etc.) required explicit user restatement after initial response violated the format — constraint should be in system context before work begins.
- agent-browser skill unavailable ("NOT YET KNOWN" at 08:04:59, 08:07:22) forced deep source-code debugging of daemon protocol; user abandoned it and wrote custom Playwright script instead after 1+ hour of troubleshooting.
- agent-browser skill requires daemon startup on port 50838 and custom script usage — not discoverable from help text; users forced to explore node_modules structure
- No guidance that @floating-ui autoUpdate in Radix Popover/DatePicker/ContextMenu cannot be reliably mocked in JSDOM — requires controlled `open={true}` prop pattern for tests, not user interaction simulation.
- No internal guidance on testing Radix overlay components (Popover, DateRangePicker, DatePicker) with vitest/floating-ui mock strategy — agent burned time trial-and-error on test-setup.ts and vitest.config.ts changes before resorting to manual mocks.

<!-- session 5c17e855 2026-09-13 -->
- agent-browser skill unavailable (returned "NOT YET KNOWN" at 07:59 and 08:07:22); agent spent ~15 minutes debugging daemon TCP protocol and writing workaround playwright script instead of asking or trying simpler approach.
- Skills `agent-browser`, `kill-port`, `write-doc` all marked "NOT YET KNOWN" when called, but agent proceeded or found workarounds. Skill schema loading inconsistent across session.
- No process for syncing @radix-ui dependencies in capability-framework mirror; troubleshooting took 3 minutes across multiple install attempts (09:08-09:11)
- No clear reference for testing Radix UI components (Popover, DatePicker, ContextMenu) in Vitest — agents required manual investigation of @radix-ui/@floating-ui internals (grep, node_modules inspection) to understand animation timing and whether controlled `open` props work.
- entriesGenerator.ts harbored 12 bugs discovered incrementally (6 → 3 → 3 more → DateRange fallback) within same session, indicating underdocumented edge cases or insufficient test coverage for the YAML-to-component scanning logic
- tsc-alias requirement for resolving @dsl-ui/ path aliases in dist/ was not documented in build process; had to be discovered when downstream consumer failed
- @registryCategory JSDoc values across controls/layout components were systematically wrong; no validation exists at parse time or registration time

<!-- session 8dfd6d5b 2026-09-13 -->
- Spec files created (guiding-principles.md, out-of-scope.md, threat-model.md) mid-session (lines 07:09:14-07:09:34) suggests agents needed written constraints that weren't pre-documented.
- agent-browser daemon startup and session protocol was undocumented in the agent's context. Agent spent 45 min debugging daemon.js internals, reading protocol.js, writing TCP client scripts, and eventually building a workaround Node script instead of using the skill (which exists but was "unknown"). Skill list loading or initialization timing needs investigation.
- agent-browser skill marked "NOT YET KNOWN" on first invocation; skill exists but availability/registration unclear to agents.
- dsl-ui lacks warning about Radix component test limitations in vitest. Session spent 3+ hours debugging before determining this was a structural (not fixable-with-polyfills) constraint.
- No documented threshold for when to abandon polyfill/workaround approach and instead mock/stub libraries or skip tests. Multiple failed iterations suggest need for decision criteria.
- No project docs on mocking @floating-ui/react-dom or @radix-ui/react-popper in vitest; agent had to reverse-engineer by reading node_modules source and grepping for internals (useFloating, computePosition, autoUpdate calls).

<!-- session 204845cf 2026-09-13 -->
- Multiple parallel Explore agents surveying identical patterns (button variants, layout containers, form actions) across 4 separate projects (agent-fleet, assistant, capability-framework, wdrive) — suggests component convention documentation is missing or scattered, forcing repeated cross-project research.
- agent-browser daemon session management not self-documenting; agent had to grep source code to discover port files, pid files, TCP protocol format, and that launch command was required
- Skill schema loading lag — skills reported "available" but required ToolSearch to load before calling; this created friction where agents had to retry as bash fallbacks.
- Manual mirroring workflow between dsl-view (source) and capability-framework (mirror copy) — required multiple file-sync cycles, index.ts edits, and rebuild verification; process is error-prone and would benefit from scripted sync or automation docs
- No established testing strategy for Radix UI + Vitest in dsl-ui codebase — session shows three competing approaches (requestAnimationFrame polyfill, setTimeout mocking, controlled props) but no decision record or lessons captured for next session.
- Agent spent 15+ min (17:00-17:02 logs) investigating @registryCategory valid values (atomic/composite/controls/layout/navigation/disposition), how entriesGenerator processes them, and what categories components should declare. This suggests the category taxonomy should be explicitly documented with examples in `.claude/guiding-principles.md`.

<!-- session 91c1344e 2026-09-13 -->
- Test result polling pattern: agents used `sleep 15/30/60 && cat <taskfile>` to wait for vitest output instead of relying on task completion notifications—suggests unclear guidance on when to use TaskCreate vs. polling fallback.
- agent-browser daemon protocol (TCP JSON format, session management, port files) required reverse-engineering source code to understand. Debugging took 30+ min; custom Playwright was faster fallback.
- No clear inventory of which @radix-ui modules each dsl-ui component needs (ButtonAction, Slider, Switch, etc.) — agent spent repeated rounds investigating node_modules and package.json instead of having single source of truth
- No clear root cause documented for why controlled open={true} approach failed on Radix components, nor why requestAnimationFrame polyfill alone doesn't unblock the async timing issues in @floating-ui/react-popper.
- entriesGenerator validation rules for @registryCategory — which values are valid, how each category maps to component types, common extraction mistakes.
- Vitest + @radix-ui/react-popper async mocking patterns — what triggers async behavior in computePosition, why naive test setups fail, canonical mock structure.

<!-- session 8a000074 2026-09-13 -->
- agent-browser integration for Storybook screenshots was not understood — required extensive protocol reverse-engineering, daemon state debugging, and eventual workaround script (08:04–08:12 logs show investigation of port files, session management, protocol format)
- write-doc skill showed "NOT YET KNOWN" when writing .claude/plans/*.md — agent was unaware of documentation workflow requirement
- @radix-ui internals use setTimeout, requestAnimationFrame, and layout effects heavily; vitest requires these to be mocked via test-setup.ts. No reference doc exists for this pattern or the specific Radix dependencies that cause hangs.
- Registry category system (@registryCategory values) not explicitly documented; fork agent at 16:59–17:01 had to reverse-engineer by grepping entriesGenerator.ts and ComponentRegistry.ts to understand valid category types

<!-- session ab1a2f3b 2026-09-13 -->
- agent-browser tool/skill had unclear usage — agent spent multiple attempts trying different command patterns (open, set viewport, launch, etc.), eventually reverse-engineered the correct approach by examining node_modules and wrote a Node.js workaround using playwright-core directly instead of using the CLI.
- After Skill invocation failures, agent did not attempt ToolSearch to resolve deferred tools — this pattern (Skill NOT YET KNOWN → proceed without skill) repeated at least 3 times across the session without trying to fetch the skill schema first.
- Package export surface for @wadeck-app/dsl-ui not clearly documented — agent had to manually inspect dist/*.d.ts and node_modules to discover which button variants (ButtonSave, ButtonCancel, IconButton, etc.) were actually exported
- No guidance on testing @radix-ui Popover/ContextMenu with Vitest—no clear pattern for when to use controlled props, when to use userEvent vs fireEvent, or what async primitives (@floating-ui autoUpdate, requestAnimationFrame loops) require mocking.
- Testing async floating-ui positioning not documented; required diving into node_modules dist to reverse-engineer computePosition behavior.
- @registryCategory annotation requirements and validation missing; bugs (wrong/missing categories on TabButton, IconButton, etc.) caught downstream in orchestrator build, not in dsl-ui tests.

<!-- session 8297fbf6 2026-09-13 -->
- Component naming (display/PageHeader vs layout/PageHeader) not obvious; agent created display variant before discovering layout variant already existed, requiring rewrite (08:44:11–08:45:06).
- Radix component test setup documentation missing: how to properly mock DOM APIs (getComputedStyle, animation-name detection, RAF/setTimeout interaction) needed by @floating-ui autoUpdate. Session required deep source-code inspection of @radix-ui and @floating-ui dependencies.
- registryCategory allowed values and component category mappings undocumented — session had to grep entriesGenerator.ts to understand valid categories. JSDoc or category matrix guide needed.
- `poll-ci` skill invocation success criteria unclear — agent abandoned it silently and switched to manual sleeps without logging why the skill failed or what fallback behavior to expect.

<!-- session b0c49f9b 2026-09-13 -->
- FilterBar test failure required agent to manually read test file at 08:02:17 to narrow down issue—test failure output did not communicate intent clearly.
- Skill system state unclear: Multiple "*** NOT YET KNOWN ***" warnings for skills (agent-browser, kill-port, write-doc at 08:33:11) despite being in the available skills list. No clear error message explaining why or how to resolve.
- ButtonAction component requirements evolved mid-task (secondary variant added after initial migration committed). Requirements not fully captured in initial review, leading to additional agent invocation.
- Lessons learned mention "Radix components + vitest slow" but don't explain root cause (animation detection via getComputedStyle + frame loop timing). New developers will hit same dead ends.
- Path alias resolution in dist files (@dsl-ui/*) not obvious; required discovering tsc-alias post-build step + tsconfig.json moduleResolution adjustments
- Valid registryCategory values and their usage in entriesGenerator scanning not clearly documented upfront; agent had to grep codebase to discover valid categories

<!-- session 756038f3 2026-09-13 -->
- agent-browser daemon protocol (session management, port files, TCP handshake) is undocumented in README; requires reverse-engineering source code to diagnose connection issues.
- agent-browser skill/tool requires a running daemon and explicit session launch—the CLI alone cannot navigate URLs. No inline help made this clear; discovery required source inspection (dist/actions.js, dist/browser.js). Suggest: upstream docs or skill description should clarify the daemon requirement upfront.
- No export manifest for dsl-ui button variants — user searches for IconButton, DeleteButton, TabButton (10:54–10:56) and discovers they don't exist in current exports; unclear which button types are available.
- No recorded guidance on Radix component test requirements: requestAnimationFrame polyfill, setTimeout mocking for autoUpdate/floating-ui, or fireEvent vs userEvent trade-offs for dialog/focus-trap components.
- Path alias resolution in dist builds (@dsl-ui/ → relative paths) requires tsc-alias post-build step; not documented as a standard dsl-ui build requirement.
- Vitest mock setup for Radix UI / floating-ui positioning utilities not documented; agent had to manually inspect node_modules and grep dist output to understand async/positioning complexity.

<!-- session c87741cd 2026-09-13 -->
- Violations framework rebuild requirement mentioned in initial response but no enforced workflow shown in command log — unclear if it was applied or just noted
- agent-browser protocol (TCP JSON, daemon port/pid files in HOME/.agent-browser/) is undocumented in local references — required grepping agent-browser source code to diagnose connection issue
- Skills marked as "NOT YET KNOWN" (agent-browser, kill-port, write-doc) — suggests skill registration or invocation documentation is unclear
- No documented pattern for Storybook screenshot automation — session resorted to writing custom Node.js script with playwright-core instead of following a known approach
- Mirror architecture (dsl-view canonical vs. capability-framework dev-time HMR mirror) lacks guidance on dependency ownership — session repeatedly grepped for radix-ui declarations across both repos trying to determine where @radix-ui packages should live.
- Radix component tests require test-setup.ts polyfills (requestAnimationFrame, getComputedStyle mocks) and have internal animation-detection timers not visible from component source — this blocker wasn't surfaced upfront, causing extended iterations debugging timeouts.
- @registryCategory values on 8 components inconsistent (controls/layout/navigation); convention not documented — discovered only through entriesGenerator trial-and-error and reading generated types.
- tsc-alias post-build step required for path alias resolution in dist files — not mentioned in build docs; @dsl-ui/* imports appeared unresolved in consumers before added.
- GitHub Actions MCP tools schema incompleteness: `list_workflow_jobs` method existence is unclear. The published skill/MCP documentation should explicitly list which polling methods are available to avoid repeated failed attempts.

<!-- session cbeb333b 2026-09-13 -->
- When `code-review` skill invoked at 07:46:46, it reported "NOT YET KNOWN" and forced fallback to general-purpose agent for manual review. Agent should either pre-load skill or clarify how to load it.
- Test output parsing required user to manually grep temp files (07:53-08:02) for pass/fail signals instead of structured output. No first-class way to get "all tests passed" vs "X failed" — forces inspection of reporter output.
- agent-browser `--help` doesn't document daemon requirement or launch procedure
- agent-browser daemon.js path not discoverable from CLI help
- Capability-framework mirroring direction is unclear; main session spent 09:02:59–09:04:07 discovering which components exist in cap-fw vs dsl-view via exploratory ls/grep/cat. Sync strategy should be documented.
- Extensive reverse-engineering of @radix-ui and @floating-ui source (grep setTimeout, requestAnimationFrame, getComputedStyle, autoUpdate) to fix test timeouts — internal testing guidance for Radix-based components missing or incomplete.
- @registryCategory values (controls, layout, navigation, etc.) not clearly specified upfront — multiple commits fixing "more entriesGenerator bugs" (3, then 6, then 3) suggest iterative discovery of category rules rather than systematic implementation.
- Mocking strategy for positioning libraries (floating-ui's autoUpdate/computePosition, radix-ui's useFloating) not documented — agent reverse-engineered dist files to understand async behavior instead of finding clear reference.
- `SendMessage → orch-owner` pattern used to notify external orchestrator of publish completion, but "orch-owner" is not documented in CLAUDE.md or skill definitions — unclear what this agent is, when to invoke it, or what message format it expects.

<!-- session 73bdc8e2 2026-09-13 -->
- `code-review` skill returned "NOT YET KNOWN" at 07:46:46 despite being in available skills list. `agent-browser` skill similarly "NOT YET KNOWN" at 08:05:02 and 08:07:22. Suggests skill system initialization or availability issue.
- agent-browser --help does not document daemon startup or session lifecycle; required code inspection of dist/ files to understand initialization flow. No public guidance on "launch first" requirement.
- Radix component test failures required deep source code inspection of @radix-ui/* and @floating-ui packages to understand internal timing; no guidance on why polyfills are necessary or which packages need them
- `mcp__github-wadeck-app__actions_list` available methods not clear — logs show warnings for `list_workflow_jobs` and `list_workflow_runs`. Should document which GitHub Actions methods are actually available vs. stubbed.

<!-- session 31e82281 2026-09-12 -->
- Project CLAUDE.md doesn't specify which UI library/patterns to use for new form/overlay components. Agents defaulted to Radix UI (not actually available) instead of matching patterns from existing components like FieldText.tsx.

<!-- session e5d49444 2026-09-11 -->
- PostCSS configuration was missing from packages/dsl-ui/, causing Storybook styling issues. The postcss.config.js had to be created mid-task (2026-09-11 09:07:28), suggesting consuming packages need clearer guidance on required build config files.
- DatePicker implementation phase (13:50+) required discovering date-fns dependency, verifying Popover component availability, checking tailwind.config.js—setup prerequisites not pre-documented, forced defensive verification commands.

<!-- session e92a114a 2026-09-11 -->
- Skill call for agent-browser initially failed with "*** NOT YET KNOWN ***" status at 09:27:09, then immediately worked via Bash — suggests skill initialization timing issue or incomplete agent skill registration
- DatePicker test setup/patterns underspecified — agent resorted to multiple test approaches rather than understanding how date components should be tested in this codebase (Vitest + date-fns mocking).

<!-- session 01b0ac8f 2026-09-11 -->
- agent-browser usage from scripts undocumented — agent had to infer daemon startup, socket locations, and browser launch state via trial-and-error
- Test environment configuration required trial-and-error iteration on vitest.config.ts (jsdom vs happy-dom) — test setup mode and rationale should be explicit in test-setup.ts or CLAUDE.md.
- DatePicker component required extensive date formatting and timezone handling; agent struggled with edge cases (month boundaries, error states) but tests were comprehensive (14k+ lines) — date utility constraints or patterns should be documented if component is being reused.

<!-- session 11ae5c7c 2026-09-11 -->
- w-guardrails bypass request mechanism (correct script path, required session ID format, which categories exist like `commit-and-push` vs `git-commit`) was unclear — agent had to experiment with multiple command variations.
- agent-browser CLI interface unclear — assistant tried multiple invocation patterns (launch, start, session, install) without confirmation of correct syntax; skill help unavailable.
- Playwright installation paths on Windows: assistant struggled to locate correct node_modules path and ms-playwright install location; eventual workaround worked but added multiple round-trips.
- DatePicker implementation was completed, tested (builds passed, tests configured), then deleted with no logged reason. Reference docs mention DatePicker as out-of-scope for Phase 1, but the agent wasn't constrained from implementing it anyway; future: make phase/scope boundaries executable in specs or task constraints.

<!-- session a634c25e 2026-09-11 -->
- Violations cache has multiple locations (.violations/.cache/manifest.json, ~/.config/violations/, nested node_modules) with unclear precedence; cache clear command doesn't document which locations it clears.
- DatePicker implementation required 5+ discovery passes to locate: date-fns dependency, Popover patterns in codebase, error color scheme (text-red-* vs text-destructive), Vitest config setup, export verification patterns. Patterns should be extracted to component scaffolding template or dev docs.

<!-- session ad709c54 2026-09-11 -->
- agent-browser CLI help does not document `--session`, `--cdp` port binding, or daemon lifecycle (install/session list/connect flow). Agent trial-errored through `launch`, `start`, `install`, `session` commands before discovering the daemon was already running on port 50838.
- kill-port skill listed as "*** NOT YET KNOWN ***"; agent worked around with `netstat -ano | grep :6006` + `taskkill //PID`.
- Session permission management workflow not documented — agent manually searched w-guardrails logs and session files to find session ID for bypass requests; no clear API or documented pattern for this.
- storybook-static/ artifacts were initially staged/committed, then required violations config edits + .gitignore additions + cache clear + re-checks to clean up. Pattern suggests generated Storybook output should have been in .gitignore before first build, not discovered post-facto. Project docs should clarify which build artifacts to exclude upfront.

<!-- session 036e7bde 2026-09-11 -->
- `agent-browser` daemon architecture (port file location, socket communication, session management) is opaque from `--help` — agent spent 15+ commands discovering it. Needs UX: clear quickstart or daemon lifecycle docs.
- Violations cache not invalidating after rule edits — agent rebuilt violations-framework monorepo + reinstalled globals + cleared cache before violations reflected rule changes. Cache refresh behavior and location need explicit docs.
- agent-browser skill showed "NOT YET KNOWN" warning (09:27:09, 09:30:32) yet bash commands executed anyway — unclear whether warning is benign (schema loads at runtime) or indicates timing issue.

<!-- session 6201b127 2026-09-11 -->
- Skill discoverability: "*** NOT YET KNOWN ***" warnings for `run` and `kill-port` suggest registration or docs are missing; blocking agent choices.
- vitest.config.ts required mid-implementation edits to get tests passing (14:00:00 edit) — initial test setup was incomplete or not documented
- No automated verification for component exports; agent created verify-exports.mjs workaround script to check if DatePicker/FieldDate exports were correct — suggests build output validation is missing

<!-- session 9b74c1ca 2026-09-11 -->
- At 13:57:47, agent created custom `verify-exports.mjs` script to check if DatePicker/FieldDate exports were properly configured — suggests lack of built-in export validation tooling or unclear documentation on export structure requirements.

<!-- session 89cbc5c9 2026-09-11 -->
- agent-browser CLI initialization steps (daemon startup, port discovery, session management) not documented for agents; CLI help text doesn't mention port file location or expected socket behavior
- Multiple violations corrections applied systematically (RadioGroup, Switch, Spinner, FieldAutocomplete, CheckboxGroup) but no log of what violations were triggered or why — root cause of the className/styling issues not documented

<!-- session 164d51ea 2026-09-06 -->
- No guidance on choosing `CLAUDE.md` vs `README.md` for different documentation purposes in project.
- Terminology "global violations config" ambiguous — user meant rule definition, not config file location.
- No automated workflow for component verification; user had to manually start Storybook and provide feedback, suggesting missing integration or automation guidance for review cycles.

<!-- session 5610612a 2026-09-02 -->
- File organization for consumer reference docs evolved through iterations (AGENT.md → README.md → .claude/docs/dsl-renderer-consumer-reference.md) instead of being decided upfront; no clear convention documented for where package-scoped consumer guides live in this repo.

## Known constraints

<!-- session 0e6811ba 2026-09-13 -->
- Agent verified file existence before git staging with manual `ls` commands (07:06:07 → 07:06:15; 07:07:34 → 07:07:42), suggesting lack of confidence in creation success or concern about side effects.
- Parallel agents (e105c6bc Explore + 11ae5c7c main) both editing `.claude/specs` files concurrently with multiple replace operations — no visible collision handling or lock mechanism; risk of silent overwrites
- agent-browser skill not available on first use (08:16-08:21); agent created custom playwright-core script instead of waiting for skill to load
- Popover tests were pre-existing failures unrelated to current work (08:46:30 failure, confirmed via git history at 08:44:28)
- npm install failures for @radix-ui packages in capability-framework required `--legacy-peer-deps` flag; multiple retry attempts suggest peer dependency resolution is environment-specific and not documented.
- Radix Popover/ContextMenu tests are timing-sensitive due to nested async behavior (FocusTrap, DismissableLayer, FloatingUI autoUpdate). Controlled `open={true}` prop alone doesn't bypass all internal timing; may still need millisecond-level control in test-setup.
- w-guardrails hook crashed at 17:02:33 blocking all Bash commands for ~29 minutes; required escalation to w-plugins-owner to unblock workflow; delays subsequent agent work.

<!-- session 2d49152e 2026-09-13 -->
- Task completion notifications not working reliably — agents poll temp files manually with `sleep X && cat` instead of receiving async updates, causing inefficient wait-then-check loops throughout the session
- agent-browser daemon has version mismatch between binary (0.6.0) and npm package (0.7.6); daemon auto-start succeeds but binary cannot connect to socket/port
- agent-browser requires daemon launch before any commands work; this isn't signaled in help or early error messages.
- capability-framework dsl-ui mirror requires `npm install --legacy-peer-deps` and sometimes `--ignore-scripts` — peer dependency conflicts not resolved by standard install
- Agent working with orch-ui migration needed to verify @wadeck-app/dsl-ui dist types were available locally in node_modules before proceeding — no pre-check for publish status before delegation
- Vitest test runs hang/timeout consistently on Radix-based component tests (Popover, ContextMenu, DatePicker, TimePicker). Agent investigated @radix-ui and @floating-ui internals for setTimeout/requestAnimationFrame calls but no clear resolution reached by session end.
- test-setup.ts rewritten multiple times (at least 6 variants observed) with different polyfill strategies, suggesting trial-and-error approach rather than systematic root cause analysis. Polyfill additions (requestAnimationFrame, setTimeout mock strategies) did not resolve hanging tests.
- CI polling requires manual sleep loops (15–20s intervals) because GitHub Actions workflow state is not pushed as notifications; agent cannot async-wait for CI to complete.
- Parallel agents (ac0f, a2ef) fixed Bug 1 + Bug 3a independently at 17:01–17:02 without merging or verifying; 29-minute gap before verification (17:31) suggests either slow builds or agent not reporting intermediate state during CI waits.
- Polling GitHub CI status fell back to manual sleep intervals (30s, 20s, 40s cycles) rather than async notifications, suggesting the MCP GitHub Actions methods are not reliably available

<!-- session 9b827ed8 2026-09-13 -->
- Skills marked "*** NOT YET KNOWN ***" (code-review, agent-browser, check-parallel-agents at 07:46, 08:05, 08:07) — when encountered, abandon pursuit immediately rather than attempting workarounds on the skill itself
- Storybook screenshot automation via agent-browser proved unreliable during setup phase; agents successfully pivoted to Playwright-based automation script (take-screenshots.cjs) as fallback.
- The dual-source mirror pattern (dsl-view authoritative source, capability-framework dev-time mirror) requires synchronized updates to component files AND their export indices (controls/index.ts, layout/index.ts) as a unit; partial syncs break builds.
- Radix UI tests hang on focus/animation internals (@floating-ui/dom autoUpdate, @radix-ui/react-dismissable-layer setTimeout) — setTimeout mocking alone insufficient, requires additional polyfills or component initialization changes
- poll-ci skill unavailable (NOT YET KNOWN errors); agent fell back to manual sleep loops (sleep 15/20s repeated), burning ~15 minutes on CI polling.
- w-guardrails hook crashed at 17:02:33, blocking all Bash operations. No fallback, skip, or timeout mechanism; session stalled 29 min until manual recovery via SendMessage.
- @radix-ui/react-popper + @floating-ui positioning libraries require deep Node mocking in vitest — simple test-setup config insufficient; needs __mocks__ with position/autoUpdate stubs.
- `mcp__github-wadeck-app__actions_list` doesn't recognize `list_workflow_jobs` and `list_workflow_runs` methods (repeated "NOT YET KNOWN" warnings) — poll-ci skill falls back to manual `sleep` polling instead of active job monitoring, causing inefficient delays (30s/20s/40s/25s intervals).

<!-- session f698cee5 2026-09-13 -->
- Skill "spec" initially unavailable with "NOT YET KNOWN" status at 07:08:45, then succeeded minutes later — suggests skill registration/availability delay.
- playwright-core lives in `/c/App/nodejs/node_modules/agent-browser/node_modules/playwright-core/`; agent-browser daemon uses JSON-RPC over TCP with session-based port routing stored in `$HOME/.agent-browser/*.port` files
- agent-browser daemon must be explicitly launched before open/navigate commands can succeed ("Call launch first" error pattern inferred from grepping dist files)
- npm install of @radix-ui packages in capability-framework requires `--legacy-peer-deps` (possibly due to peer dependency conflicts) — discovered via trial-and-error (plain install → `--legacy-peer-deps` → `--legacy-peer-deps --ignore-scripts`).
- capability-framework dsl-ui mirror must be kept manually in sync with dsl-view source — not an npm dependency, so changes require explicit file copies after each update.
- Radix-based overlay/picker components fail in jsdom test environment due to Floating UI's requestAnimationFrame-based autoUpdate and Radix's setTimeout-based focus/dismiss logic; polyfills in test-setup.ts require specific configuration.
- `@registryCategory` values must match component's actual category; bugs in this metadata (controls vs layout vs navigation) cause consumer breakage but are scattered across multiple commits rather than validated at build time or source-level.
- CI polling required multiple manual `sleep` commands (30s, 20s, 40s, 25s, 20s intervals) rather than an integrated polling loop, suggesting either conservative timing or CI progression delays. Future implementations should clarify expected CI duration or implement exponential backoff with status inspection between polls.

<!-- session 3d0bd30d 2026-09-13 -->
- spec skill shows "NOT YET KNOWN" warning when first invoked in agent forks despite being listed (07:05:28) — skill resolution is runtime-deferred; works correctly on subsequent calls or in different sessions (07:09:14 works fine)
- Skills code-review, agent-browser, and check-parallel-agents all returned "NOT YET KNOWN" during this chunk — indicates skill registration or availability issue
- Multiple parallel agents (Phase 1–6) working on same codebase required sequential commits and careful staging to avoid conflicts; agent-browser daemon is separate process requiring manual start (not auto-launched)
- capability-framework has its own node_modules/@radix-ui packages installed separately from dsl-view; npm install in cap-fw required `--legacy-peer-deps` flag due to peer dependency conflicts.
- Capability-framework dsl-ui is a "source mirror" kept in sync via manual file copies (cp commands) and index.ts re-exports — this pattern requires coordination across two repo's node_modules and builds; any missed sync causes cascading build failures.
- Radix components use getComputedStyle for animation detection, setTimeout in focus-scope/dismissable-layer, and animationFrame in floating-ui's autoUpdate — tests need polyfills for getComputedStyle.getPropertyValue and must handle animation timing, not just user interactions.
- w-guardrails hook crashing on Bash commands — worked around via request-bypass scripts, but this is fragile and created noise in session logs.
- GitHub MCP `mcp__github-wadeck-app__actions_list` tool doesn't expose `list_workflow_jobs` or `list_workflow_runs` methods (repeated warnings show "NOT YET KNOWN" across multiple checks)

<!-- session 0b23b09f 2026-09-13 -->
- Parallel component agents (FieldMultiSelect, FieldTags, FieldAsyncSelect, Popover, ContextMenu) were spawned concurrently but required many sequential edits afterward, suggesting the parallel implementations had issues or race conditions that couldn't be fixed in parallel.
- Full vitest suite runs repeatedly (07:46:50, 08:02:12, etc.) suggesting validation overhead or incomplete confidence in phase 2/3 test coverage during concurrent work.
- playwright-core not a direct dev dependency; bundled inside agent-browser/node_modules — manual path discovery required for workarounds
- Capability-framework's dsl-ui mirror package.json lacks @radix-ui/* dependencies listed in dsl-view source; npm install requires --legacy-peer-deps flag and may still fail, forcing manual node_modules copy from dsl-view.
- Test utilities (test-utils.tsx) need manual sync between repos; ToastContextValue import required conditional handling, suggesting potential for future import mismatches on sync.
- Radix UI components' animation/timing behavior (setTimeout in @floating-ui, animation detection in @radix-ui/react-presence) causes Vitest test hangs on Windows/MSYS2; requires requestAnimationFrame polyfill + controlled `open={true}` props in component implementations, not just test utilities.
- MCP github-wadeck-app actions tools repeatedly returned "NOT YET KNOWN" across multiple attempts; poll-ci skill also unavailable. Indicates infrastructure/tool-discovery issue blocking CI polling workflows.
- When optimized polling tool (poll-ci) became unavailable, agent reverted to inefficient sleep + retry loop pattern instead of escalating to user; repeated 20-40s sleeps suggest no exponential backoff or user notification of degraded polling mode

<!-- session 878b8375 2026-09-13 -->
- Multiple parallel agents across distinct session IDs (11ae5c7c and e105c6bc) created file contention; later logs invoke "check-parallel-agents" skill to diagnose conflicts.
- Extensive parallel agent launches across 4+ projects (agent-fleet, wdrive, assistant, capability-framework) for component surveys; no apparent coordination or context sharing between agents.
- FieldAsyncSelect test ran 6 times with multiple edits in ~5 minutes (07:28–07:34); suggests implementation had correctness issues requiring iterative debugging cycles
- Code review delegated as Phase 7 after all code written (08:49:08), not during — batch review vs continuous review pattern affects how quickly issues surface.
- capability-framework `npm install` requires `--legacy-peer-deps` flag; this should be documented near the mirror-sync instructions.
- @floating-ui/dom's observeMove uses setTimeout in ways jsdom fake timers don't handle; Radix UI tests need controlled `open={true}` props, not polyfill-based fixes. Strategic shift from userEvent→fireEvent to controlled-prop rewrite indicates earlier approaches were insufficient.
- @floating-ui and @radix-ui use async positioning (computePosition, autoUpdate) which cannot be mocked with static stubs in Vitest — requires full mock implementation with Promise-based positioning callbacks; trial-and-error cycle (87+ character test rewrites) signals async mocking is non-obvious.
- Component registry's JSDoc scanning has multiple subtle bugs in how it infers and validates category types — discovered iteratively (6 bugs in one commit, then 3 more, then fallback handling), suggests the logic is fragile and warrants consolidation or comprehensive test coverage.
- Repeated sleep commands (30s, 20s, 40s, 25s, 20s) used as workaround for broken CI polling — indicates tool/schema issue blocks proper status monitoring pattern

<!-- session 078e3ab6 2026-09-13 -->
- User manually ran git operations (git add/commit marked [M]) instead of agent-managed workflow — breaks integration; user should delegate git to agent.
- Multi-project Explore survey (4 repos, heavy globbing/grepping at 07:09:42+) suggests research scope wasn't pre-scoped; initial brief should specify breadth/depth upfront.
- Skills listed as available (code-review, agent-browser, check-parallel-agents) fail with "NOT YET KNOWN" error when invoked, blocking user requests
- When delegating multi-phase implementation to agents (Phases 1-7), agents can work in parallel on independent pieces. Main session must verify by reading files and running tests—do not trust agent summaries as proof of completion.
- Git commit permission prompts fire multiple times per session even for related operations; not one-time auth
- Skills listed as available may not load on first use; agent should verify skill exists before calling, especially in critical paths
- Radix UI + Floating UI tests that wait for user interactions timeout in Vitest; controlled `open={true}` prop avoids animation waits and is simpler than mocking timers.
- MCP GitHub tool schemas repeatedly failed to load ("NOT YET KNOWN" on poll-ci, mcp__github-wadeck-app__actions_list at 20:52, 21:11–21:29). User resorted to manual `sleep 15/20/15` loops for CI polling instead of proper async waiting.
- Bug 1: `tsc-alias` post-build step required to resolve `@dsl-ui/` path aliases in dist. Not caught at build time; required separate diagnosis phase.
- Bug 3a: `@registryCategory` JSDoc values inconsistent across components (controls vs layout vs navigation). No linting rule to validate category assignments upfront; required manual grep + fix across 12+ files.
- `poll-ci` skill showed "NOT YET KNOWN" when invoked (21:47:11), causing agent to fall back to manual sleep-based polling (30s, 20s, 40s, 25s, 20s intervals) for CI completion tracking instead of structured async waiting
- MCP `github-wadeck-app` actions methods (`list_workflow_jobs`, `list_workflow_runs`) repeatedly showed "*** NOT YET KNOWN ***" warnings despite GitHub MCP being listed as configured — indicates schema discovery or method support lag when polling CI runs

<!-- session bf4c72db 2026-09-13 -->
- Vitest + jsdom test completion requires polling temp task output files with sleep loops (15-60s) — test runner hangs or doesn't return result directly; no mechanism for agents to block until test finishes.
- Design system consumers span 4 independent codebases (agent-fleet, assistant frontend, capability-framework, wdrive); Explore agents survey them in parallel to find component patterns — maintaining consistency across this fragmentation is a documented challenge.
- agent-browser skill requires pre-existing daemon or proper launch sequencing; connection failures can occur even when daemon is running if versions are mismatched.
- agent-browser daemon requires explicit launch via node dist/daemon.js before commands work; agent-browser distributed with playwright-core for browser automation fallback
- npm install repeatedly failed with peer dependency conflicts in capability-framework dsl-ui — required three attempts with `--legacy-peer-deps` and `--ignore-scripts` flags before succeeding. Silent flag-fumbling instead of clear error messaging on first failure.
- Mirror sync pattern (dsl-view ↔ capability-framework) requires manual file copying with `cp` commands. Edited 8+ files separately; no detected integration or batch-verify step. High risk of drift.
- vitest + jsdom + @radix-ui/react-popper integration heavily dependent on correct setup; vitest.config.ts and test-setup.ts required multiple edits without clear upfront guidance on what mocking/setup Radix UI positioning needs in a jsdom test environment.
- When CI monitoring via MCP fails or unavailable, agent defaults to manual sleep loops — inefficient and blocks context. Consider documenting fallback behavior or ensuring the poll-ci skill works reliably.

<!-- session 1fc0dc1e 2026-09-13 -->
- dsl-view uses parallel multi-agent workflow: 3-4 agents simultaneously implement components (tsx + test + stories) with builds/tests validated in sequence per component
- agent-browser daemon on Windows requires explicit setup: binary version (0.6.0) mismatches npm package (0.7.6); daemon doesn't auto-launch on first command; requires manual port negotiation via socket protocol.
- Test execution in dsl-ui hangs/runs >30s; agents resort to sleep loops and log-file parsing (tail/grep on temp vitest output) instead of exit-code checks or built-in test reporter. Slows iteration significantly.
- Capability-framework dsl-ui mirror requires manual file sync (cp) + index.ts edits on every dsl-view change — no automated sync process. Multiple sync cycles (0:52-0:58 and 1:06-1:10 zones) show repetitive work pattern.
- @radix-ui dependencies in cap-fw consistently require `--legacy-peer-deps` flag (08:45, 09:11, 11:04, 11:17) — peer conflict not resolved, only worked around.
- @radix-ui and @floating-ui depend on setTimeout/requestAnimationFrame for dismiss/animation logic; jsdom needs explicit polyfills in test-setup.ts. Tests remain slow (~40s+ for full suite).
- poll-ci skill and mcp__github-wadeck-app__actions_list repeatedly failed with "NOT YET KNOWN" errors; agent fell back to manual `sleep` loops for CI polling instead of proper status checking — inefficient and unreliable for multi-minute waits.
- `poll-ci` skill invocation with commit hash parameter (wadeck-app/dsl-view 00d7925) marked as "NOT YET KNOWN" — agent fell back to manual sleep/polling loop instead of using the skill

<!-- session ddc3acc7 2026-09-13 -->
- Parallel agent delegation (general-purpose + Explore agents at 07:25:38 & 07:26:02) worked well; code-review agents found issues that main session applied directly; but tool-level failures (skill not found) burned significant context with no clear recovery path.
- PageHeader component exists in both `display/` and `layout/` directories; no naming convention prevents this collision
- capability-framework dsl-ui source mirror requires independent @radix-ui dependency installation and does not inherit node_modules from dsl-view — changes need explicit npm install + file sync + build verification across 2+ repos.
- npm install in capability-framework required manual --legacy-peer-deps flag for @radix-ui packages; peer dep resolution strategy unclear from logs — successive attempts with different flags suggest dependency model not well-documented.
- Radix overlay components with autoUpdate positioning hang indefinitely in JSDOM unless tests use controlled prop (open={true}), not uncontrolled state transitions via fireEvent/userEvent.
- w-guardrails hook crashes (17:02) during git commits; requires explicit permission-bypass via `request-bypass.js` script before `git add` and `git commit` operations. Agent adapted by calling script before each git operation.
- CI workflow status polling via MCP appears unsupported or incorrectly configured. `list_workflow_runs` and `list_workflow_jobs` methods not recognized by the GitHub MCP adapter.

<!-- session 5c17e855 2026-09-13 -->
- Skill invocation with custom args (spec skill with "brainstorming mode") failed with "NOT YET KNOWN" — verify skill supports args before invoking
- vitest output to temp files is difficult to grep; multiple patterns required ("Test Files", "Tests", "Duration", "×", "FAIL") for parsing, indicating inconsistent or unclear formatting across runs.
- When agents run tests in parallel, output redirects to temp AppData `.jsonl` files; extracting results requires polling with grep/tail and is fragile. Consider explicit output capture or streaming.
- capability-framework mirror fails `npm install @radix-ui/*` (peer deps); workaround: copy node_modules/@radix-ui from dsl-view (09:10), not documented
- Tests timeout frequently (30–120s even with requestAnimationFrame mocks, test-setup polyfills); multiple test retries suggest Radix-based component tests are inherently slow or flaky in Vitest/JSDOM — workarounds are fragile and not well-understood.
- GitHub Actions MCP tools (mcp__github-wadeck__actions_list, get_job_logs) emit "NOT YET KNOWN" warnings when invoked — tool schemas not loaded before use (despite ToolSearch calls showing success).
- poll-ci skill appeared as "NOT YET KNOWN" (tool not loaded) at least 8 times, forcing fallback to manual sleep loops — blocked efficient CI monitoring pattern
- Custom guardrails bypass script (request-bypass.js) required for git commit/push — indicates documented git permission handshake may be opaque or cumbersome for agents

<!-- session 8dfd6d5b 2026-09-13 -->
- Skill invocation failed with "NOT YET KNOWN *** skill=spec | args=brainstorming mode" (line 07:08:45) — spec skill doesn't recognize brainstorming mode parameter, but execution continued rather than erroring clearly.
- FieldAsyncSelect.test.tsx required ~11 test runs with edits between 07:28:36–07:34:14. This suggests the test was flaky or had complex setup/mock requirements. Future test iterations on async select patterns may need extra time budgeted.
- Vitest runs take 2+ minutes; agents resorted to sleep + tail polling on temp files rather than blocking properly. Suggests suite optimization or different wait strategy needed.
- dsl-view is authoritative source; capability-framework packages/dsl-ui/ are mirrors for dev-time HMR only. Agent treated installed node_modules in capability-framework as source of truth, violating this contract and causing version-mismatch confusion between source and published packages.
- Radix UI focus trap and dismissable layer components hang in vitest+jsdom even with requestAnimationFrame and setTimeout polyfills; root cause is @floating-ui autoUpdate ResizeObserver fallback and Radix animation detection relying on browser APIs jsdom doesn't emulate.
- Grepping node_modules for setTimeout/requestAnimationFrame patterns doesn't yield actionable fixes for architectural async behavior in libraries; session iterated through many grep searches without reaching solution.
- @radix-ui/react-popper depends on @floating-ui for async positioning calculations; tests hang/timeout without proper vitest mock aliases and test-setup configuration for these packages.
- `poll-ci` skill invocation encountered "*** NOT YET KNOWN ***" warning; session fell back to manual `sleep` commands (30s, 20s, 40s intervals) for CI/workflow monitoring instead of structured polling. Tool may need explicit ToolSearch fetch or has schema definition gaps.
- MCP GitHub actions methods `list_workflow_runs` and `list_workflow_jobs` repeatedly show "*** NOT YET KNOWN ***" warnings across multiple calls — these may require ToolSearch to load schemas before use.

<!-- session 204845cf 2026-09-13 -->
- Storybook build artifacts (storybook-static/) must be excluded from violations checks via .gitignore and violations config updates when new components generate stories.
- Multiple skills flagged as "NOT YET KNOWN" (code-review, agent-browser, check-parallel-agents) suggests skill lookup/registration system issue; agents cannot gracefully fall back
- agent-browser requires `node /path/to/daemon.js` launched separately before `open` commands work; help text and initial attempts didn't surface this requirement clearly.
- capability-framework workspace requires `--legacy-peer-deps` flag for @radix-ui/* installs; peer dependency conflicts prevent normal resolution
- Radix UI components have complex setTimeout and requestAnimationFrame dependencies in @floating-ui and @radix-ui libraries that make Vitest testing fragile — deep source inspection (14:47–14:55) showed agent searching for root cause across multiple layers rather than hitting a documented pattern.
- All git commits in this repo require going through w-guardrails bypass hook: `node ~/.claude/plugins/local-marketplace/plugins/w-guardrails/scripts/request-bypass.js --category git-commit` followed by `git commit`. Bare `git commit` will be blocked.
- - GitHub Actions MCP methods (`list_workflow_jobs`, `list_workflow_runs`) marked "NOT YET KNOWN" by guardrails; MCP schema incomplete or methods missing

<!-- session 91c1344e 2026-09-13 -->
- Multiple parallel agents (session IDs e105c6bc and 11ae5c7c) running concurrently—when file locks or test timeouts occur, verify via `check-parallel-agents` skill to diagnose conflicts.
- agent-browser daemon has version mismatch between binary (0.6.0) and installed npm package (0.7.6), causing connection timeout on port 50838. Workaround: custom Playwright scripts. Root cause (version sync) unresolved.
- agent-browser skill returned "NOT YET KNOWN" warning (08:15:59, 08:29:39) — had to manually locate daemon.js and start it via Node instead of using Skill
- write-doc skill also returned "NOT YET KNOWN" warning (08:33:11) — indicates skill registration/loading timing issues even for documented skills
- capability-framework mirror sync workflow requires coordinating: source files, package.json dependency edits, node_modules copies, and rebuilds — fragile multi-step process
- @radix-ui packages in capability-framework require `--legacy-peer-deps` flag and must be in `dependencies` not `devDependencies` or build fails
- Radix component tests (Popover, ContextMenu, TimePicker) hang/timeout frequently in Vitest; @floating-ui's autoUpdate uses setTimeout+requestAnimationFrame for DOM observation beyond what test-setup.ts polyfills can easily handle.
- MCP GitHub Actions tools (actions_list, get_job_logs) were repeatedly called but stayed "NOT YET KNOWN", requiring ToolSearch fetches — tools weren't auto-loading in this session.
- poll-ci skill unavailable during this session (returned "NOT YET KNOWN" in logs); forced manual fallback to sleep + message polling for CI status checks.
- w-guardrails hook crashed at 17:02:33, blocking all Bash commands temporarily; session recovered but indicates hook brittleness under load.

<!-- session 8a000074 2026-09-13 -->
- Heavy reliance on sleep+cat polling pattern to wait for test results (sleep 15/30/60 seconds then cat temp task file) — indicates task notification system may not be triggering properly for async test runs, forcing manual polling.
- Multiple concurrent Explore agents (a6fd, a5e9, afbc, aaec, a576) spawned across 4 projects (07:09:42–07:09:48) — parallelization works, but no evidence of result aggregation pattern; each agent reading files independently may duplicate work.
- agent-browser daemon requires explicit launch before operations; uses ~/.agent-browser/{session}.port and .pid files; connects via TCP protocol to dynamically assigned ports
- FieldAsyncSelect.test.tsx hung repeatedly during vitest runs — required multiple retries and eventual test rewrites (07:25–07:31, 07:34+ logs show extended timeout cycles)
- Popover.test.tsx began failing mid-implementation; unclear if pre-existing or caused by ButtonContext changes — required post-hoc investigation
- Radix UI peer dependency conflicts in capability-framework require `--legacy-peer-deps`; multiple install attempts with and without `--ignore-scripts` suggests flaky resolution that may need workaround documentation.
- File sync pattern: dsl-view is authoritative; capability-framework maintains a mirror for dev hot-reload. Manual `cp` between repos is error-prone — consider automating or documenting sync points.
- Radix UI components (Popover, ContextMenu, DatePicker) hang in vitest due to unresolved animation frame / setTimeout dependencies in @radix-ui/* and @floating-ui/* libraries. Simple requestAnimationFrame polyfills do not unblock; deep timer mocking required.
- Multiple vitest runs with varying timeouts (15s, 30s, 60s, 120s) suggest timeout tuning is not a solution — tests remain fundamentally blocked on async operations not covered by mocks.
- w-guardrails hook crash at 17:02:33 blocking all Bash commands; no guidance on recovery or how to handle hook failures; resumed at 17:31 but gap unclear
- poll-ci skill repeatedly fails with "NOT YET KNOWN"; agent falls back to manual sleep loops (5 sequential sleep commands: 15s, 20s, 15s, 20s, 20s) instead of proper blocking wait
- `poll-ci` skill invoked with "*** NOT YET KNOWN ***" warning — this skill appears unavailable or not yet implemented in this session, forcing manual sleep-polling for CI status.

<!-- session ab1a2f3b 2026-09-13 -->
- Agent-browser uses a daemon (TCP port 50838) that must be launched before commands work; if daemon crashes or version mismatches occur, connection fails silently and requires manual TCP protocol debugging to diagnose.
- agent-browser bash commands (open, set viewport) failed silently or with unclear errors — forced the investigation path where agent dug into /c/App/nodejs/node_modules/ structure rather than diagnosing the tool problem directly.
- npm install @radix-ui/* packages in cap-fw packages/dsl-ui directory required multiple retry attempts with different flags (--legacy-peer-deps, --ignore-scripts) but logs show no actual error messages — root cause of peer/script conflicts never diagnosed
- MCP GitHub Actions tools (`mcp__github-wadeck__actions_list`, `get_job_logs`) returned "NOT YET KNOWN" warnings at 12:56, 13:22–13:25; were invoked without first loading schemas via ToolSearch.
- Test iterations accumulated 30–120s timeouts without a circuit breaker; after ~10 failed runs, the approach should have switched from "tweak test-setup" to "question component design" or escalate.
- w-guardrails plugin crash at 17:02:33 blocked all Bash commands for ~30min; external infrastructure failure.
- GitHub MCP server's workflow job monitoring API methods appear unsupported or misconfigured — agent invoked `poll-ci` skill but it also triggered the same unknown-method warnings, indicating the skill couldn't execute its intended polling logic.

<!-- session 8297fbf6 2026-09-13 -->
- After 9-hour session gap (22:00 → 07:05), parallel agent work resumed heavily — long-running test suites require polling with multiple sleep/cat cycles instead of blocking awaits (sleep 15, 30, 60 patterns visible).
- agent-browser on Windows has version mismatch: binary 0.6.0 vs npm package 0.7.6, causes daemon startup/connection failures even when process is listening on the port; daemon protocol uses JSON-over-TCP on port 50838, not directly callable via CLI
- Storybook available at localhost:6006 but used only via manual scripts; no CLI tool reliably captured component screenshots via agent-browser
- agent-browser skill unavailable during session; daemon requires manual startup at `/c/App/nodejs/node_modules/agent-browser/dist/daemon.js` (not in PATH). Workaround: write custom playwright-core script instead of using skill.
- npm test with --reporter=verbose appears to hang or produce very slow output; session switched to --reporter=dot and eventually ran single-file vitest directly to escape blocking state (08:38:00–08:38:50).
- capability-framework dsl-ui mirror requires manual @radix-ui dependency synchronization with dsl-view; npm install retries needed with --legacy-peer-deps flag due to peer dependency conflicts
- dsl-ui mirror maintains two copies (dsl-view source + capability-framework for dev hot reload) requiring file copies, index.ts re-export syncing, dependency matching, and rebuild verification
- Radix overlay components (Popover, ContextMenu) with floating-ui positioning require mocking both requestAnimationFrame AND setTimeout in test-setup — rAF polyfill alone is insufficient; @floating-ui's position update loop uses setTimeout debouncing.
- poll-ci skill repeatedly unavailable (NOT YET KNOWN), forcing fallback to manual sleep(15-20s) loops instead of active polling. GitHub Actions CI polling infrastructure missing.
- w-guardrails hook crashed at 17:02, blocking all Bash operations for ~30min. Requires external plugin owner intervention. Single point of failure for git operations.
- Agent fell back to manual sleep-based polling (30s, 20s, 40s, 25s, 20s cycles) after `poll-ci` skill invocation failed or was not recognized; system guidelines explicitly discourage sleep-based polling in favor of `ScheduleWakeup` or check commands like `gh run view`.

<!-- session b0c49f9b 2026-09-13 -->
- Sleep-based polling for task completion (multiple `sleep 15/30/60 && cat <task-file>` patterns) — agent manually polls background tasks instead of waiting for notifications; escalating timeouts suggest vitest/build steps frequently exceeded 15s.
- Git push operations require explicit permission bypass via `request-bypass.js` node script — `git-commit-push` category policy in place.
- Agent-browser skill unavailable initially (08:04:59 WARN "NOT YET KNOWN"); agent fell back to manual Playwright script (take-screenshots.mjs)—tool availability timing affects fallback paths.
- Environment port contention: Multiple `netstat` checks for port 3001 and port 50838 suggest active processes/daemons need manual management for screenshot automation.
- capability-framework dsl-ui workspace requires `npm install --legacy-peer-deps` for @radix-ui packages; plain `npm install` fails due to peer dependency conflicts.
- Radix Popover/ContextMenu tests depend on floating-ui's `autoUpdate` loop (uses requestAnimationFrame + setTimeout fallback), which requires environment-level timing mocks or controlled prop bypass at component level — neither was fully working by end of chunk.
- w-guardrails hook crashes block Bash/git operations; requires workaround via request-bypass.js script (seen multiple times in this chunk)
- @floating-ui/react-dom positioning library mocking for vitest proved complex — many iterations on mock setup; position updates and autoUpdate lifecycle are async/non-trivial to mock
- mcp__github-wadeck-app__actions_list (list_workflow_jobs, list_workflow_runs methods) requires ToolSearch to fetch schema before calling; deferred tools lack inline schemas

<!-- session 756038f3 2026-09-13 -->
- Test execution uses polling pattern with `sleep 60 && cat` to read async results from temp files (lines 22:03:43, 22:04:49, 22:05:52) — slow and verbose. Multiple parallel agents (Explore, claude instances) spawned for independent surveys across 4 projects without coordination mechanism.
- `/code-review` skill invocation failed at 07:46:46 (NOT YET KNOWN); user worked around by spawning general-purpose agents for review, which then did not prevent manual code review of all files anyway (07:51:43+).
- `agent-browser` skill is unreliable (08:04:53 NOT YET KNOWN); daemon connection fails despite being installed globally; agent spent 4+ minutes troubleshooting socket/protocol issues (08:05:02–08:09) before writing custom playwright script as workaround.
- Multiple agents (e105c6bc/A:*, 11ae5c7c/M) ran in parallel on overlapping files (specs/, screenshots/, components/) with no visible coordination issues, but commits were staged/pushed sequentially after all agents finished—pattern works but serializes final git ops.
- npm install in capability-framework requires `--legacy-peer-deps --ignore-scripts` flags; plain `npm install` fails with peer dependency conflicts (observed 09:08–09:11).
- Mirror-sync pattern: dsl-view source changes require manual file copies to capability-framework/packages/dsl-ui at multiple points (09:03, 09:04, 09:05, 09:10, 12:22); updates don't propagate automatically.
- Manual file sync between dsl-view and capability-framework mirror copies via `cp` command (line 13:00:03, 14:27:25) — no automation; CLAUDE.md notes mirrors are canonical-for-dev-only but sync is ad-hoc.
- GitHub Actions MCP tools (mcp__github-wadeck-app__actions_list) repeatedly show "NOT YET KNOWN" schema status during session; poll-ci skill also unavailable/unknown, blocking reliable CI monitoring.
- w-guardrails hook crashed/blocked git operations multiple times during session; delayed commits and forced manual bypass requests.
- Multiple sequential sleep calls (30s, 20s, 40s, 25s, 20s) used for CI polling instead of robust polling mechanism — suggests fallback when poll-ci failed or was unavailable
- Repeated "NOT YET KNOWN" warnings for `mcp__github-wadeck-app__actions_list` tool (method=list_workflow_jobs, method=list_workflow_runs) — indicates potential guardrails/tool initialization issues with GitHub actions API

<!-- session c87741cd 2026-09-13 -->
- Sleep-based polling for test output (multiple instances: `sleep 15/30/60 && cat` to read task files) — vitest/test runners should use proper async notification instead of manual polling
- Iterative test failures on FieldAsyncSelect.test.tsx with 10+ edits over 8+ minutes (07:08:30 through 07:19:11) suggests unclear test setup or flaky async mocks — future runs should clarify mock/async pattern upfront
- Multiple agents writing to `.claude/specs/2026-09-12_ui-component-context-variants/` index files in parallel caused repeated edit collisions — coordination needed when agents update shared spec docs concurrently
- agent-browser daemon path not self-discoverable — required manual search to find `/c/App/nodejs/node_modules/agent-browser/dist/daemon.js`; CLI commands were ambiguous about startup requirements
- capability-framework/packages/dsl-ui mirror requires --legacy-peer-deps flag when installing @radix-ui packages; caused multiple npm install retries, not documented in CLAUDE.md alongside mirror architecture notes.
- MCP tools (actions_list, get_job_logs) appeared deferred multiple times (12:56:40, 13:22:25, 13:24:20) forcing ToolSearch calls before use — added friction to CI monitoring workflow.
- w-guardrails hook crash blocked all Bash ~30 min (17:02–17:31); GitHub Actions MCP tools returned "NOT YET KNOWN", forcing manual sleep-polling of CI instead of integrated monitoring.
- Publishing fixes required manual validation in consumer repo (orchestrator) — IconButton usages broke until migrated; no pre-publish compatibility check surfaced this.
- The `poll-ci` skill invocation returned `*** NOT YET KNOWN ***`, suggesting either the calling pattern (`skill=poll-ci | args=wadeck-app/dsl-view 00d7925`) doesn't match the skill's interface, or the skill failed to initialize. Agent fell back to manual `sleep` + retry loop for CI polling instead.

<!-- session cbeb333b 2026-09-13 -->
- agent-browser daemon (port 50838) uses JSON protocol over TCP; binary/npm package version mismatch (0.6.0 vs 0.7.6) causes connection failures. Direct playwright-core invocation is viable workaround.
- agent-browser not available as a skill in this project; manual daemon launch required
- Screenshot/visual testing via agent-browser requires extra setup steps beyond normal skill invocation
- Capability-framework dsl-ui mirror requires manual file sync via cp commands (observed 09:03:00–09:05:18, 09:10:37, 12:18:22); this is a fragile workaround with no automation documented.
- npm install of @radix-ui packages required escalating fallback flags: --legacy-peer-deps (09:08:45, 09:11:04) then --ignore-scripts (09:08:52), indicating unresolved peer dependency conflicts in the stack.
- test-setup.ts modified 4+ times with different polyfill configs (RAF, setTimeout, getComputedStyle mocking) — Radix's timing-dependent behavior (focus traps, presence detection, dismissable layers) has no single documented fix; strategy is trial-and-error.
- Popover/ContextMenu/TimePicker tests timeout consistently, not sporadically — systematic issue with Radix async/animation assumptions in fake-timer environment, not random flakiness.
- GitHub Actions MCP tools (mcp__github-wadeck-app__actions_list) frequently unavailable ("*** NOT YET KNOWN ***"), poll-ci skill failed; agent fell back to manual sleep loops for CI polling (21:11+).
- w-guardrails hook crashed ~17:02, blocking all Bash execution; long silent gap (17:02–17:31) until recovery.
- GitHub MCP `mcp__github-wadeck-app__actions_list` with methods `list_workflow_jobs` and `list_workflow_runs` are not yet implemented or available — blocks programmatic CI status monitoring, no alternative exists in current tooling.

<!-- session 73bdc8e2 2026-09-13 -->
- FilterBar test failed initially, fixed by modifying test assertion at 08:02:21 (commenting out a test case) rather than fixing implementation—suggests test fixture fragility or incomplete component implementation.
- Popover.test.tsx failure discovered mid-implementation (08:46:41), requiring git history check to confirm regression. Tests should run before multi-phase parallelization to catch pre-existing failures early.
- Capability-framework's dsl-ui mirror requires manual @radix-ui dependency installation and file syncing after dsl-view component updates; no automated sync despite being documented as source mirror
- Radix UI components use internal `requestAnimationFrame`, `setTimeout`, and floating-ui's `autoUpdate` with `observeMove` — require test-setup polyfills to work under vitest/jsdom fake-timer environments; not automatically handled by test infrastructure
- GitHub MCP tools need explicit `ToolSearch` fetch call before use or they return "NOT YET KNOWN" instead of failing fast; silent schema failures consume debugging time
- poll-ci skill returns "NOT YET KNOWN" (lines 21:11:26, 21:14:38, 21:27:48), forcing fallback to manual sleep + MCP polling. MCP tool `mcp__github-wadeck-app__actions_list` also repeatedly fails with "NOT YET KNOWN" (lines 21:13, 21:15, 21:16, 21:28, 21:29), blocking active CI status monitoring.
- Multiple fork agents spawned for parallel investigation (lines 15:30:29, 16:59:32) while main agent context-switches to unrelated repo (orchestrator at 15:46:25), creating out-of-band result collection burden — fork agents return async but no explicit re-verification step shown before reporting success to user.
- CI status polling appears to rely on `sleep` commands (30s–40s intervals) rather than active polling. This suggests MCP GitHub actions methods may not support real-time job/run queries yet, forcing manual wait loops.

<!-- session e451b804 2026-09-12 -->
- Polling test results with `sleep X && cat` (15s, 30s, 60s intervals) is inefficient — agents should use proper async/await or background job tracking instead of sleeping + file reads.

<!-- session 31e82281 2026-09-12 -->
- Multiple agents (a9db, a14c, ad17) work on components in parallel; test failures require iterative fixes before final build succeeds. Initial component implementations often need test corrections.

<!-- session 9ba52475 2026-09-12 -->
- Long-running vitest execution in parallel agents requires extended polling windows (60+ second intervals), suggesting test suite may need optimization or agents need async task status integration.

<!-- session e5d49444 2026-09-11 -->
- agent-browser daemon management is complex: multiple connection attempts to port 50838 with "Browser not launched" errors; socket/IPC file detection and temp directory lookup required verbose troubleshooting. Suggests environmental setup for agent-browser needs better documentation or failure messaging.
- Multiple violations check/fix passes were required (em-dash, emoji, suppress comments); violations config update (.violations/config.ts) was needed midway through the task, indicating the config scanning scope may not have been obvious upfront.
- Storybook process on port 6006 required explicit taskkill and restart cycle; background processes aren't always cleaned up cleanly between test runs, leading to "port already in use" failures.
- Permission bypass requests needed explicit node script calls (09:45, 13:52, 13:47) for git-commit-push, rm, and other operations—not pre-configured, required multi-step manual requests.

<!-- session e92a114a 2026-09-11 -->
- Violations CLI requires cache clears, dependency reinstalls, and monorepo rebuilds to propagate rule changes — cache stale-ness blocked rule fixes until `.violations/config.ts` was edited to force re-evaluation.
- agent-browser daemon persistence is fragile: requires checking temp directory socket files (`.../agent-browser/default.port`), handles EADDRINUSE gracefully, but multiple connection attempts needed before successful screenshot capture.
- DatePicker implementation build/test cycle took 2+ minutes (13:51:03 to 14:00:52), triggering agent to add explicit waits — build system slowness drives anti-pattern polling behavior

<!-- session 01b0ac8f 2026-09-11 -->
- Storybook dev server did not pick up postcss.config.js changes via HMR — required manual kill/restart (09:08–09:10)
- Build and test commands are slow enough that agent resorts to `sleep` + polling (09:55:38 storybook: 30s wait, 13:56:01/13:57:18: 30–60s sleeps) — no visibility into actual failure reason until logs are read after delay.
- Violations config requires both .gitignore entries AND .violations/config.ts edits to exclude build outputs (e.g., storybook-static/) — this dual requirement could benefit from clearer guidance in violation docs.

<!-- session 11ae5c7c 2026-09-11 -->
- Permission system blocks git commits and pushes separately; `commit-and-push` bypass doesn't cover `git-commit` operations. Requires exact session ID and correct script invocation.
- jsdom initialization with vitest requires increased testTimeout (>5s) due to browser environment setup — async waitFor operations will timeout if not configured at config level.
- agent-browser daemon on Windows stores socket/port files in AppData/Local/Temp/agent-browser — agent required multiple attempts to discover correct temp directory path
- Storybook story IDs use lowercase-with-dashes format ("controls-iconbutton--default"), not PascalCase — agent trial-and-errored multiple formats before finding correct pattern
- vitest aggregated test output doesn't show failure details inline; requires running specific test file to see assertion mismatches — agent had to drill down from "Badge > Badge > applies default" to file-level run
- Fork agents logged "*** NOT YET KNOWN *** skill=agent-browser" warnings before executing Storybook screenshots. Skills invoked in forked contexts may not be pre-loaded; future forks should use ToolSearch to fetch skill schemas or document skill availability in fork initialization.

<!-- session a634c25e 2026-09-11 -->
- Violations rules exclusions for .stories.tsx/.test.tsx don't take effect from bundled rules alone — the config.ts `isExcluded` callback must be explicitly defined to gate them; debug trail shows many rebuild/reinstall attempts before this was discovered.
- agent-browser daemon state lives in %APPDATA%/Local/Temp/agent-browser/ (port file, socket metadata); connection failures often stem from missing/stale port files or orphaned daemon processes; location isn't documented in help output.
- build-storybook timeouts (>60s, some runs killed); Vitest config needs special setup for DatePicker tests to pass (see vitest.config.ts edit at 13:59:58).
- npm test runs take 120+ seconds; combined with multiple iterations on DatePicker tests (lines 14:00:40 onwards), this created long feedback loops during debugging.
- agent-browser skill shows "NOT YET KNOWN" warning when first called in agent forks (14:04:22, 14:08:01) despite being listed — skill resolution is runtime-deferred and works correctly, but warning may confuse future sessions. Consider pre-fetching with ToolSearch before agent spawn if reproducible.

<!-- session ad709c54 2026-09-11 -->
- agent-browser daemon requires socket/port coordination; IPC uses `$LOCALAPPDATA/Temp/agent-browser/` for port file. Multiple daemon instances or stale ports cause "Browser not launched" errors even when daemon responds.
- Storybook ID mapping: story title "Controls/IconButton" + export "Default" → URL slug "controls-iconbutton--default" (lowercase, no slashes). Agent had to reverse-engineer by grepping `export const` and testing URLs.
- Permission bypass requests require explicit w-guardrails script calls with session ID lookups (multiple invocations at 09:45:42, 09:47:55, 13:52:15). Checking session ID requires reading files or parsing logs (13:51:05, 13:51:12, 13:51:14) — permission workflow is multi-step and fragile.
- agent-browser invocations in fork agents show "NOT YET KNOWN *** skill=agent-browser" warnings, then fall back to bash commands (`agent-browser open`...). Indicates skill definitions may not pre-load in fork agents, or agent-browser is dual-mode (skill + CLI command) with unclear precedence.

<!-- session 036e7bde 2026-09-11 -->
- Playwright/browser binary discovery required manual path searching across nested `node_modules` instead of centralized reference — environment setup for browser tools should be documented.
- Multiple npm test/build operations with 60-180 second timeouts suggest slow dependency resolution in dsl-ui package; future DatePicker work should account for this latency.
- Storybook static build artifacts (`storybook-static/`) require explicit `.gitignore` and violations config exclusions; they do not auto-exclude and will be flagged as violations and added to git.
- Multiple `violations check` calls needed after config.ts edits; cache invalidation not automatic—may need manual `violations cache clear`.

<!-- session 6201b127 2026-09-11 -->
- Violations CLI fragility: rule updates require rebuild + global install + cache clear to apply; this chain is time-expensive and error-prone when caches are stale.
- dsl-ui builds are slow: npm test exceeds 3 minutes (uses timeout 180), npm run build-storybook near-timeout; no documented reason for slow builds or optimization guidance
- Two parallel agents modified dsl-ui/src/components simultaneously (session 11ae5c7c implementing DatePicker, session 164d51ea fixing components) — created potential file conflicts and coordination issues
- Storybook build artifacts (storybook-static/) were not initially excluded from violations checks—requires .gitignore and violations config updates when new components with Storybook stories are added

<!-- session 9b74c1ca 2026-09-11 -->
- Violations framework cache requires full rebuild cycle after config changes — after editing .violations/config.ts with story/test file exclusions, must rebuild violations-framework monorepo, globally reinstall @wadeck-app/violations-rules, clear cache, and re-check before config takes effect
- agent-browser daemon discovery manual when "Browser not launched" — EADDRINUSE on port 50838 means daemon exists but browser process didn't start; manual check needed for /c/Users/Wadeck/AppData/Local/Temp/agent-browser/default.port to find active daemon port
- Playwright binary path resolution checks multiple fallback locations — /c/App/nodejs/node_modules/playwright, user's AppData/Local/ms-playwright, then agent-browser's own node_modules before succeeding; no auto-detection
- DatePicker implementation required npm build (~2 min, 13:53:06–13:55:09) followed by npm test with timeout; agent then rewrote entire test file (14:00:47) after modifying vitest.config.ts (13:59:57), indicating initial test structure was incompatible with config.
- `violations check` requires explicit `violations cache clear` before re-run to see updated results; this workflow detail may not be documented clearly.

<!-- session 89cbc5c9 2026-09-11 -->
- agent-browser daemon requires explicit port file monitoring at `$LOCALAPPDATA/Temp/agent-browser/default.port`; agents currently iterate through path guesses rather than reading the port file first
- npm run build-storybook and npm run build operations taking 60+ seconds; agents used sleep + polling (sleep 30, sleep 60) instead of background task tracking
- storybook-static/ directory must be explicitly added to .gitignore to prevent accidental commits of build artifacts.
- Violations config requires explicit configuration of paths to exclude (like storybook-static) to avoid false-positive violations on generated files.

<!-- session 164d51ea 2026-09-06 -->
- Package entry point `index.ts` cannot be removed — breaks npm exports for consumers.
- Violations CLI version mismatch introduces new active rules when upgraded; test before committing.
- Parallel component implementation agents (FieldAutocomplete, Badge, Skeleton, etc.) were spawned without intermediate verification; agent summaries reported success based on file creation only, not structure/exports/tests/integration.
- User switched mid-session to French requesting "entire file" reads of components already modified during violations fixing — suggests potential verification step or language preference, but no explicit guidance captured.

<!-- session 65f23291 2026-09-11 -->
- Skill availability: "run storybook" returned "*** NOT YET KNOWN ***" status at 22:49:57, indicating skills may be context-dependent or misconfigured for the project environment.

<!-- session 5610612a 2026-09-02 -->
- Consumers in capability-framework mirror source files from dsl-view for dev-time HMR; documentation should make sync pattern explicit to avoid confusion about which repo is authoritative after changes.
