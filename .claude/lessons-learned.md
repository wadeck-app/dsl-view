# Lessons learned

<!-- Last updated: 2026-09-12T07:08:12.190Z -->

## Recurring feedback

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
