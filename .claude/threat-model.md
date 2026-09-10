# Threat Model — dsl-view

## Authentication and authorization
- Renderer has no auth enforcement — it renders any YAML it receives. Auth is entirely consumer-owned.
- `getToken` returns a token passed to the consumer's `fetcher` — if the fetcher does not validate or scope the token, data is exposed without restriction.
- No mechanism prevents a YAML definition from referencing a `$sources` URL that bypasses the consumer's auth layer at runtime (only URL shape is validated at build time, not access control).

## Build-time integrity
- `pageTypesGenerator` Zod validation catches URL/contract mismatches at build time, preventing mismatched API calls from reaching production.
- No supply chain audit process documented for `js-yaml`, `ts-morph`, `zod`, `recharts` dependencies.

## Silent failures
- Missing `@registryCategory` on a component causes silent exclusion from the registry — a broken page with no error, not a build failure. Treat unresolved `$type` as a runtime error to surface this.
- `__baseUrl` not stripped on `defineRoutes` merge produces TypeScript errors at build time — detectable, not silent.

<!-- TODO: no formal threat model file exists in the repo — this is inferred from code and docs -->

## From lessons learned

| ID | Threat | Status | Mitigation |
|----|--------|--------|------------|
| L-01 | Agent writes documentation files to `~/.claude/` (home dir) instead of `<project>/.claude/` — silently creates stale copies outside project context | Active risk | `cross-home-write` guardrail blocked one such attempt (session 5610612a); principle added to guiding-principles. |
