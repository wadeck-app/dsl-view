# dsl-view

Published source for `@wadeck-app/dsl-renderer` and `@wadeck-app/dsl-ui`.

## Packages

| Package | Purpose |
|---------|---------|
| `packages/dsl-renderer` | Runtime renderer + Vite build plugins + type utilities |
| `packages/dsl-ui` | Generic React UI components (DataTable, DialogForm, FieldText, etc.) |

Build each package: `npm run build` inside its directory.

## Subpath exports (`@wadeck-app/dsl-renderer`)

| Import path | Content |
|-------------|---------|
| `@wadeck-app/dsl-renderer` | Runtime: `defineRoutes`, `createRegistry`, `DslRenderer`, `GenericPageRunner`, `resolveExpressionValue`, `renderChildren`, type utilities |
| `.../build/entriesGenerator` | Vite plugin that generates `src/generated/entries.tsx` |
| `.../build/pageTypesGenerator` | Vite plugin that generates `src/generated/page-types.ts` |
| `.../build/adapters/ZodContractAdapter` | `ContractAdapter` implementation for `defineRoutes`/Zod contracts |
| `.../build/ContractAdapter` | `ContractAdapter` interface |
| `.../build/urlNormalizer` | URL normalization utility |

## Key source files

| File | Role |
|------|------|
| `src/engine/DslRenderer.tsx` | Core recursive node renderer |
| `src/engine/GenericPageRunner.tsx` | Page lifecycle: source loading, action dispatch, vars, brains |
| `src/engine/useBrains.ts` | Brain execution engine ($http.*, $ctx.*, $chain, polling) |
| `src/build/entriesGenerator.ts` | Vite plugin scanning components for `@registryCategory` JSDoc |
| `src/build/pageTypesGenerator.ts` | Vite plugin validating YAML `$sources` against contract types |

## Canonical consumer

`/c/Workspace_Other/capability-framework` - check there for real-world usage patterns (contracts package, custom UI library, app setup, YAML examples).

The `packages/dsl-renderer/` and `packages/dsl-ui/` directories inside capability-framework are **source mirrors** kept for dev-time hot module reloading only. The authoritative source is this repo. Do not treat capability-framework copies as canonical when they diverge.

## Consumer documentation

`.claude/docs/dsl-renderer-consumer-reference.md` - complete reference for agents building apps that consume these packages.

## Agent reference docs

| Doc | Description |
|---|---|
| `.claude/guiding-principles.md` | YAML-surface rules, `@registryCategory` pitfalls, build constraints + session lessons |
| `.claude/docs/theming.md` | Tokens, `ThemeScope` vs `ThemeContext`, subtree nesting, why `dark:` variants are banned |
| `.claude/out-of-scope.md` | What this project explicitly does not cover |
| `.claude/product-vision.md` | Roadmap: JSON Schema direction, pluggable ContractAdapter |
| `.claude/threat-model.md` | Silent failure risks and guardrail threats |
